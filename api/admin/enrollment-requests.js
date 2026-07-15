import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // 1. Setup CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables on server.");
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new Error("Missing Authorization header.");
    }

    // 2. Initialize Clients
    const supabaseUserClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '', {
      global: { headers: { Authorization: authHeader } }
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Verify Admin Access
    const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized: " + (authError?.message || "User not found"));

    const { data: userData } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single();
    if (!userData || (userData.role !== 'admin' && userData.role !== 'officer')) {
      throw new Error("Forbidden: Only staff can view enrollment requests.");
    }

    const { status, searchQuery, page, pageSize, sortBy, sortOrder, school, type } = req.query;

    // --- STATS MODE ---
    // Decoupled to avoid Vercel timeouts on free tier
    if (type === 'stats') {
      let summary = { pending: 0, approved: 0, rejected: 0 };
      let statsBySchool = {};
      let allSchools = [];
      let emailQueueCount = 0;

      // Try RPC first for speed
      const { data: stats, error: statsError } = await supabaseAdmin.rpc('get_enrollment_stats', {
        p_status: status || 'pending'
      });

      if (statsError) {
        console.warn("RPC Stats Error (falling back to manual queries). Consider running the SQL migration.");

        const [{ count: p }, { count: a }, { count: r }] = await Promise.all([
          supabaseAdmin.from('enrollment_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabaseAdmin.from('enrollment_requests').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
          supabaseAdmin.from('enrollment_requests').select('*', { count: 'exact', head: true }).eq('status', 'rejected')
        ]);
        summary = { pending: p || 0, approved: a || 0, rejected: r || 0 };

        const { data: schoolData } = await supabaseAdmin.from('enrollment_requests').select('school');
        if (schoolData) {
          allSchools = [...new Set(schoolData.map(row => row.school).filter(Boolean))];
        }

        const { data: statusSchoolData } = await supabaseAdmin.from('enrollment_requests').select('school, gender').eq('status', status || 'pending');
        if (statusSchoolData) {
          statusSchoolData.forEach(row => {
            const sch = row.school || 'Unknown';
            if (!statsBySchool[sch]) statsBySchool[sch] = { Male: 0, Female: 0, Total: 0 };
            statsBySchool[sch].Total++;
            if (row.gender === 'Male') statsBySchool[sch].Male++;
            if (row.gender === 'Female') statsBySchool[sch].Female++;
          });
        }

        const { count: eqc, error: eqErr } = await supabaseAdmin.from('email_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        if (!eqErr) {
          emailQueueCount = eqc || 0;
        }
      } else {
        summary = stats?.summary || { pending: 0, approved: 0, rejected: 0 };
        statsBySchool = stats?.statsBySchool || {};
        allSchools = stats?.allSchools || [];
        emailQueueCount = stats?.emailQueueCount || 0;
      }

      return res.status(200).json({
        success: true,
        summary,
        statsBySchool,
        allSchools,
        emailQueueCount
      });
    }

    // --- LIST MODE ---
    let query = supabaseAdmin
      .from('enrollment_requests')
      .select('*', { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (school) query = query.eq('school', school);

    if (searchQuery) {
      // Safe fallback search if search_text column doesn't exist in production yet
      query = query.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,id_number.ilike.%${searchQuery}%`);
    }

    // Ordering
    if (sortBy) {
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    } else if (status === 'pending') {
      query = query.order('created_at', { ascending: true });
    } else if (status === 'approved' || status === 'rejected') {
      query = query.order('reviewed_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Pagination
    if (page && pageSize) {
      const from = (parseInt(page) - 1) * parseInt(pageSize);
      const to = from + parseInt(pageSize) - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Query Error:", error);
      throw error;
    }

    // 4.1 Detect duplicates and existing accounts
    let duplicates = [];
    let existingAccounts = [];

    if (data?.length > 0) {
      const idNumbers = data.map(r => r.id_number);

      const [{ data: dupeData }, { data: existingData }] = await Promise.all([
        supabaseAdmin.from('enrollment_requests').select('id_number').in('id_number', idNumbers),
        supabaseAdmin.from('users').select('id_number').in('id_number', idNumbers)
      ]);

      const counts = (dupeData || []).reduce((acc, r) => {
        acc[r.id_number] = (acc[r.id_number] || 0) + 1;
        return acc;
      }, {});

      duplicates = Object.keys(counts).filter(id => counts[id] > 1);
      existingAccounts = (existingData || []).map(u => u.id_number);
    }

    return res.status(200).json({
      success: true,
      data: data || [],
      count: count || 0,
      duplicates,
      existingAccounts
    });

  } catch (error) {
    console.error("Vercel Serverless Error:", error);
    return res.status(400).json({ success: false, error: error.message });
  }
}

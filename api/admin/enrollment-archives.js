import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Setup CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { searchQuery, academicYear, page, pageSize } = req.query;

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const authHeader = req.headers.authorization;

    const supabaseUserClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '', {
      global: { headers: { Authorization: authHeader } }
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify Admin Access
    const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { data: userData } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single();
    if (!userData || userData.role !== 'admin') {
      throw new Error("Forbidden: Only administrators can access this system.");
    }

    // 1. Get List of Academic Years (the "folders")
    const { data: yearsData, error: yearsError } = await supabaseAdmin
      .from('enrollment_archives')
      .select('academic_year')
      .order('academic_year', { ascending: false });

    if (yearsError) throw yearsError;
    const academicYears = Array.from(new Set(yearsData.map(y => y.academic_year)));

    // 2. Fetch Archived Records
    let query = supabaseAdmin
      .from('enrollment_archives')
      .select('*', { count: 'exact' });

    if (academicYear && academicYear !== 'all') {
      query = query.eq('academic_year', academicYear);
    }

    if (searchQuery) {
      query = query.or(`id_number.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`);
    }

    query = query.order('last_name', { ascending: true });

    // Pagination
    if (page && pageSize) {
      const from = (parseInt(page) - 1) * parseInt(pageSize);
      const to = from + parseInt(pageSize) - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: data || [],
      count: count || 0,
      academicYears
    });

  } catch (error) {
    console.error("Fetch Archives Error:", error);
    return res.status(400).json({ success: false, error: error.message });
  }
}

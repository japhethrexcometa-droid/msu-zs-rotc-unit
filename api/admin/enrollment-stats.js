import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // 1. Setup CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

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

    const supabaseUserClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '', {
      global: { headers: { Authorization: authHeader } }
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized: " + (authError?.message || "User not found"));

    const { data: userData } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single();
    if (!userData || (userData.role !== 'admin' && userData.role !== 'officer')) {
      throw new Error("Forbidden: Only staff can view enrollment stats.");
    }

    const { status = 'pending' } = req.query;

    let summary = { pending: 0, approved: 0, rejected: 0 };
    let statsBySchool = {};
    let allSchools = [];
    let emailQueueCount = 0;

    // Try RPC first for speed
    const { data: stats, error: statsError } = await supabaseAdmin.rpc('get_enrollment_stats', {
      p_status: status
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

      const { data: statusSchoolData } = await supabaseAdmin.from('enrollment_requests').select('school, gender').eq('status', status);
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

  } catch (error) {
    console.error("Vercel Serverless Error (Stats):", error);
    return res.status(400).json({ success: false, error: error.message });
  }
}

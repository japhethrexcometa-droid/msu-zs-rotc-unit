import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Setup CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,DELETE,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

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
    if (!userData || (userData.role !== 'admin' && userData.role !== 'officer')) {
      throw new Error("Forbidden");
    }

    // Handle DELETE: Remove an entire academic year archive
    if (req.method === 'DELETE') {
      if (!academicYear || academicYear === 'all') {
        throw new Error("Specific Academic Year is required for deletion");
      }
      
      const { error: deleteError } = await supabaseAdmin
        .from('enrollment_archives')
        .delete()
        .eq('academic_year', academicYear);
        
      if (deleteError) throw deleteError;
      return res.status(200).json({ success: true, message: `Archived records for ${academicYear} deleted successfully.` });
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

    const p = parseInt(page || '1');
    const sz = parseInt(pageSize || '20');
    if (!isNaN(p) && !isNaN(sz)) {
      query = query.range((p - 1) * sz, p * sz - 1);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    return res.status(200).json({ success: true, data, count, academicYears });
  } catch (error) {
    console.error('Enrollment Archives Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

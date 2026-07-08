import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Setup CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { records, academicYear } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      throw new Error("No records provided for import.");
    }

    if (!academicYear) {
      throw new Error("Folder Name is required for historical import.");
    }

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
      throw new Error("Forbidden: Only high-level admins can import historical data.");
    }

    // Map and sanitize records
    const sanitized = records.map(r => ({
      id_number: String(r.id_number || '').trim(),
      school: String(r.school || '').trim(),
      last_name: String(r.last_name || '').trim(),
      first_name: String(r.first_name || '').trim(),
      middle_initial: String(r.middle_initial || '').substring(0, 1),
      suffix: String(r.suffix || ''),
      gender: String(r.gender || 'Male'),
      date_of_birth: r.date_of_birth || null,
      course_year: String(r.course_year || ''),
      academic_year: academicYear,
      status: 'approved', // Historical records are considered approved/final
      archived_by: user.id,
      archived_at: new Date().toISOString()
    }));

    // Batch insert (up to 1000 at a time for safety)
    const { error: importError } = await supabaseAdmin
      .from('enrollment_archives')
      .insert(sanitized);

    if (importError) throw importError;

    return res.status(200).json({
      success: true,
      count: sanitized.length,
      message: `Successfully imported ${sanitized.length} historical records into ${academicYear}.`
    });

  } catch (error) {
    console.error("Import Error:", error);
    return res.status(400).json({ success: false, error: error.message });
  }
}

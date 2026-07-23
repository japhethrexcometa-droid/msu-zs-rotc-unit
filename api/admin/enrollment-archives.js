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

    // --- Diagnostic Mode (Find Missing Ghosts) ---
    if (req.query.diagnostic === 'true') {
      const { data: archives, error: archiveError } = await supabaseAdmin
        .from('enrollment_archives')
        .select('id_number, first_name, last_name, school')
        .eq('status', 'approved');
      if (archiveError) throw archiveError;

      const { data: users, error: usersError } = await supabaseAdmin
        .from('users')
        .select('id_number, role');
      if (usersError) throw usersError;

      const userIds = new Set((users || []).map(u => String(u.id_number).trim().toUpperCase()));
      const missingFromArchives = (archives || []).filter(a => !userIds.has(String(a.id_number).trim().toUpperCase()));
      const officersInUsers = (users || []).filter(u => u.role === 'officer');
      
      const { data: requests, error: requestsError } = await supabaseAdmin
        .from('enrollment_requests')
        .select('id_number, first_name, last_name, school')
        .eq('status', 'approved');
      if (requestsError) throw requestsError;
      
      const missingFromRequests = (requests || []).filter(r => !userIds.has(String(r.id_number).trim().toUpperCase()));

      const allMissingIds = new Set();
      const allMissing = [];
      [...missingFromArchives, ...missingFromRequests].forEach(m => {
        const id = String(m.id_number).trim().toUpperCase();
        if (!allMissingIds.has(id)) {
          allMissingIds.add(id);
          allMissing.push(m);
        }
      });

      const htmlResponse = `
        <html>
          <head><title>Find Missing Cadets</title></head>
          <body style="font-family: sans-serif; padding: 20px;">
            <h2>Diagnostic: Find Missing Cadets (Ghost Records)</h2>
            <p>Total Approved in Archives: <strong>${(archives || []).length}</strong></p>
            <p>Total Approved in Requests Queue: <strong>${(requests || []).length}</strong></p>
            <p>Total Registered Accounts (Users table): <strong>${(users || []).length}</strong></p>
            <p>Total Officers: <strong>${officersInUsers.length}</strong></p>
            <hr/>
            <h3 style="color: red;">Found ${allMissing.length} Missing "Ghost" Records:</h3>
            <p>These students were marked as approved, but their accounts failed to create due to the timeout. Please tell them to re-enroll.</p>
            <table border="1" cellpadding="8" style="border-collapse: collapse; width: 100%; max-width: 800px;">
              <tr style="background: #f4f4f4;">
                <th>ID Number</th>
                <th>First Name</th>
                <th>Last Name</th>
                <th>School</th>
              </tr>
              ${allMissing.map(m => `
                <tr>
                  <td>${m.id_number}</td>
                  <td>${m.first_name}</td>
                  <td>${m.last_name}</td>
                  <td>${m.school}</td>
                </tr>
              `).join('')}
            </table>
            ${allMissing.length === 0 ? '<p style="color: green; font-weight: bold;">No missing records found! Everyone is perfectly synced.</p>' : ''}
          </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(htmlResponse);
    }
    // --- End Diagnostic Mode ---

    return res.status(200).json({ success: true, data, count, academicYears });
  } catch (error) {
    console.error('Enrollment Archives Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

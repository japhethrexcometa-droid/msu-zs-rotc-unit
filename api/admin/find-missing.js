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
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    // For this diagnostic script, we will require a secret in the URL to prevent public exposure.
    if (req.query.secret !== 'rotc_admin_check') {
      return res.status(401).json({ error: "Unauthorized. Please add ?secret=rotc_admin_check to the URL." });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Fetch all approved archives
    const { data: archives, error: archiveError } = await supabaseAdmin
      .from('enrollment_archives')
      .select('id_number, first_name, last_name, school')
      .eq('status', 'approved');

    if (archiveError) throw archiveError;

    // 3. Fetch all active users
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id_number, role');

    if (usersError) throw usersError;

    // 4. Find the missing ones
    const userIds = new Set(users.map(u => String(u.id_number).trim().toUpperCase()));
    
    const missingFromArchives = (archives || []).filter(a => {
      const cleanId = String(a.id_number).trim().toUpperCase();
      return !userIds.has(cleanId);
    });

    const officersInUsers = (users || []).filter(u => u.role === 'officer');
    
    // Check if any of the missing are actually in the enrollment_requests table
    const { data: requests, error: requestsError } = await supabaseAdmin
      .from('enrollment_requests')
      .select('id_number, first_name, last_name, school')
      .eq('status', 'approved');
      
    if (requestsError) throw requestsError;
    
    const missingFromRequests = (requests || []).filter(r => {
      const cleanId = String(r.id_number).trim().toUpperCase();
      return !userIds.has(cleanId);
    });

    // Combine and deduplicate just in case
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

  } catch (error) {
    console.error("Diagnostic Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

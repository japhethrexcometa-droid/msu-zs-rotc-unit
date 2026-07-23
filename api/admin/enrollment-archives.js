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
    const { searchQuery, academicYear, page, pageSize, diagnostic } = req.query;

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const authHeader = req.headers.authorization;
    if (!authHeader) throw new Error("Missing Authorization Header");
    
    const token = authHeader.replace('Bearer ', '').trim();

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify Admin Access securely using Admin client
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized Token");

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

    // --- Handle POST: Recover Ghost Account ---
    if (req.method === 'POST') {
      const { id_number } = req.body;
      if (!id_number) throw new Error("id_number is required.");
      
      const cleanIdNumber = String(id_number).trim().toUpperCase();
      let cadetData = null;

      const { data: archiveData } = await supabaseAdmin
        .from('enrollment_archives')
        .select('*')
        .eq('id_number', cleanIdNumber)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (archiveData) {
        cadetData = archiveData;
      } else {
        const { data: reqData } = await supabaseAdmin
          .from('enrollment_requests')
          .select('*')
          .eq('id_number', cleanIdNumber)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (reqData) cadetData = reqData;
      }

      if (!cadetData) throw new Error(`Could not find approved record for ID: ${cleanIdNumber}`);

      const authEmail = `${cleanIdNumber}@rotc.msubuug.edu.ph`;

      const { data: existingUser } = await supabaseAdmin.from('users').select('id').eq('id_number', cleanIdNumber).maybeSingle();
      let userId = existingUser?.id;

      if (!userId) {
        const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: authEmail,
          password: cleanIdNumber,
          email_confirm: true
        });

        if (createError) {
          if (createError.message.includes('already registered')) {
            const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
            const foundUser = listData.users.find(u => u.email === authEmail);
            if (foundUser) userId = foundUser.id;
            else throw createError;
          } else throw createError;
        } else {
          userId = authData.user.id;
        }
      }

      const fullName = [cadetData.first_name, cadetData.middle_initial ? cadetData.middle_initial + '.' : '', cadetData.last_name].filter(Boolean).join(' ');
      let role = 'cadet';
      const explicitRole = String(cadetData.role || '').trim().toLowerCase();
      if (explicitRole === 'officer' || explicitRole === 'cadet') role = explicitRole;
      else {
        const yearClass = String(cadetData.year_class || '').trim();
        if (yearClass.includes('2CL') || yearClass.includes('1CL')) role = 'officer';
      }

      const userProfile = {
        id: userId,
        id_number: cleanIdNumber,
        full_name: fullName,
        gender: cadetData.gender,
        role: role,
        school: cadetData.school,
        platoon: 'Unassigned',
        year_level: cadetData.year_level || '1st Year',
        year_class: cadetData.year_class || '1st Year',
        is_active: true,
        is_deleted: false,
        blood_type: cadetData.blood_type,
        emergency_contact_name: cadetData.emergency_name,
        emergency_contact_number: cadetData.emergency_contact
      };

      const { error: upsertError } = await supabaseAdmin.from('users').upsert(userProfile);
      if (upsertError) throw upsertError;

      if (cadetData.email) {
        const htmlContent = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a472a;">Welcome to MSU ZS ROTC</h2>
            <p>Dear ${cadetData.first_name},</p>
            <p>Your enrollment request has been approved and your account is ready.</p>
            <div style="background: #f4f4f4; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>ID Number:</strong> ${cleanIdNumber}</p>
              <p style="margin: 5px 0 0 0;"><strong>Password:</strong> ${cleanIdNumber}</p>
            </div>
            <p>You can now log in to the ROTC Portal using these credentials. Please change your password after logging in.</p>
            <br/>
            <p>Best regards,<br/>MSU ZS ROTC Administration</p>
          </div>
        `;
        await supabaseAdmin.from('email_queue').insert({
          recipient: cadetData.email,
          subject: "Welcome to MSU ZS ROTC Unit",
          html_body: htmlContent,
          status: 'pending'
        });
      }

      return res.status(200).json({ success: true, message: `Account recovered for ${cleanIdNumber}` });
    }
    // --- End POST: Recover Ghost Account ---

    // --- Diagnostic Mode (Find Missing Ghosts) ---
    if (diagnostic === 'true') {
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

      return res.status(200).json({
        success: true,
        ghosts: allMissing,
        stats: {
          archives: (archives || []).length,
          requests: (requests || []).length,
          users: (users || []).length,
          officers: officersInUsers.length
        }
      });
    }
    // --- End Diagnostic Mode ---

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

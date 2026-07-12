import { createClient } from '@supabase/supabase-js';

// Reusing role determination and schema validation logic
function determineRole(requestData) {
  const explicitRole = String(requestData.role || '').trim().toLowerCase();
  if (explicitRole === 'officer' || explicitRole === 'cadet') {
    return explicitRole;
  }
  const yearClass = String(requestData.year_class || '').trim();
  if (yearClass.includes('2CL') || yearClass.includes('1CL')) {
    return 'officer';
  }
  return 'cadet';
}

const VALID_USERS_COLUMNS = [
  'id', 'id_number', 'full_name', 'role', 'gender',
  'school', 'platoon', 'designation', 'year_level', 'year_class',
  'qr_token', 'short_token', 'photo_url',
  'blood_type', 'emergency_contact_name', 'emergency_contact_number',
  'is_active', 'is_deleted', 'created_at'
];

function validateUsersPayload(payload) {
  const invalid = Object.keys(payload).filter(k => !VALID_USERS_COLUMNS.includes(k));
  if (invalid.length > 0) {
    throw new Error(`SCHEMA VIOLATION: [${invalid.join(', ')}] do not exist in public.users table.`);
  }
}

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
    const { requestIds } = req.body;
    if (!Array.isArray(requestIds) || requestIds.length === 0) {
      throw new Error("No request IDs provided.");
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
    if (!userData || (userData.role !== 'admin' && userData.role !== 'officer')) {
      throw new Error("Forbidden");
    }

    // Fetch all requests in one go
    const { data: requests, error: fetchError } = await supabaseAdmin
      .from('enrollment_requests')
      .select('*')
      .in('id', requestIds)
      .eq('status', 'pending');

    if (fetchError) throw fetchError;
    if (!requests || requests.length === 0) {
      return res.status(200).json({ success: true, processed: 0, message: "No pending requests found." });
    }

    const results = { success: 0, failed: 0, errors: [] };
    const startTime = Date.now();

    // Process each request (ideally these would be parallelized with Promise.all but sequential is safer for Supabase Auth limits)
    for (const request of requests) {
      // Safety check: If we're approaching Vercel's 10s limit, stop processing
      if (Date.now() - startTime > 8000) {
        results.errors.push({ message: "Timed out. Some requests were not processed. Please try again for the remaining." });
        break;
      }

      try {
        const cleanIdNumber = String(request.id_number).trim().toUpperCase();
        const authEmail = `${cleanIdNumber}@rotc.msubuug.edu.ph`;

        // 1. Check if user already exists in public.users to handle gracefully
        const { data: existingUser } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('id_number', cleanIdNumber)
          .single();

        let userId = existingUser?.id;

        if (!userId) {
          // 1a. Create Auth User if not exists
          const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: authEmail,
            password: cleanIdNumber,
            email_confirm: true
          });

          // Handle case where auth user exists but public profile doesn't (rare sync issue)
          if (createError) {
            if (createError.message.includes('already registered')) {
              // Try to find the user id via listUsers or just handle as error for now
              // For simplicity, we'll try to get the user by email
              const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
              const foundUser = listData.users.find(u => u.email === authEmail);
              if (foundUser) {
                userId = foundUser.id;
              } else {
                throw createError;
              }
            } else {
              throw createError;
            }
          } else {
            userId = authData.user.id;
          }
        }

        // 2. Create or Update User Profile (Upsert)
        const fullName = [request.first_name, request.middle_initial ? request.middle_initial + '.' : '', request.last_name].filter(Boolean).join(' ');
        const userProfile = {
          id: userId,
          id_number: cleanIdNumber,
          full_name: fullName,
          gender: request.gender,
          role: determineRole(request),
          school: request.school,
          platoon: 'Unassigned',
          year_level: request.year_level || '1st Year',
          year_class: request.year_class || '1st Year',
          is_active: true,
          is_deleted: false,
          blood_type: request.blood_type,
          emergency_contact_name: request.emergency_name,
          emergency_contact_number: request.emergency_contact
        };

        validateUsersPayload(userProfile);
        const { error: upsertError } = await supabaseAdmin.from('users').upsert(userProfile);

        if (upsertError) throw upsertError;

        // 3. Update Request Status
        await supabaseAdmin.from('enrollment_requests').update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        }).eq('id', request.id);

        // 4. Queue Email
        const htmlContent = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a472a;">Welcome to MSU ZS ROTC</h2>
            <p>Dear ${request.first_name},</p>
            <p>Your enrollment request has been approved.</p>
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
          recipient: request.email,
          subject: "Welcome to MSU ZS ROTC Unit",
          html_body: htmlContent,
          status: 'pending'
        });

        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push({ id: request.id, error: err.message });
      }
    }

    return res.status(200).json({ success: true, ...results });

  } catch (error) {
    console.error("Bulk Process Error:", error);
    return res.status(400).json({ success: false, error: error.message });
  }
}

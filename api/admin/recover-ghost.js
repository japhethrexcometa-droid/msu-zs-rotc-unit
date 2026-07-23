import { createClient } from '@supabase/supabase-js';

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
    const { id_number } = req.body;
    if (!id_number) {
      throw new Error("id_number is required.");
    }

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

    const cleanIdNumber = String(id_number).trim().toUpperCase();

    // Find the cadet's data first in archives, then fallback to requests
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

    if (!cadetData) {
      throw new Error(`Could not find approved record for ID: ${cleanIdNumber}`);
    }

    const authEmail = `${cleanIdNumber}@rotc.msubuug.edu.ph`;

    // 1. Check if user already exists in public.users
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id_number', cleanIdNumber)
      .maybeSingle();

    let userId = existingUser?.id;

    if (!userId) {
      // Create Auth User
      const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: authEmail,
        password: cleanIdNumber,
        email_confirm: true
      });

      if (createError) {
        if (createError.message.includes('already registered')) {
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

    // 2. Create User Profile (Upsert)
    const fullName = [cadetData.first_name, cadetData.middle_initial ? cadetData.middle_initial + '.' : '', cadetData.last_name].filter(Boolean).join(' ');
    
    // Determine Role
    let role = 'cadet';
    const explicitRole = String(cadetData.role || '').trim().toLowerCase();
    if (explicitRole === 'officer' || explicitRole === 'cadet') {
      role = explicitRole;
    } else {
      const yearClass = String(cadetData.year_class || '').trim();
      if (yearClass.includes('2CL') || yearClass.includes('1CL')) {
        role = 'officer';
      }
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

    validateUsersPayload(userProfile);
    const { error: upsertError } = await supabaseAdmin.from('users').upsert(userProfile);

    if (upsertError) throw upsertError;

    // 3. Queue Email
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

    if (cadetData.email) {
      await supabaseAdmin.from('email_queue').insert({
        recipient: cadetData.email,
        subject: "Welcome to MSU ZS ROTC Unit",
        html_body: htmlContent,
        status: 'pending'
      });
    }

    return res.status(200).json({ success: true, message: `Account recovered for ${cleanIdNumber}` });

  } catch (error) {
    console.error("Ghost Recovery Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

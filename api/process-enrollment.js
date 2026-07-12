import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMA CONTRACT: Exact columns in public.users table
// Update this list when adding new columns via SQL migration
// ⛔ enrollment_requests columns (email, contact_number, etc.) do NOT exist here
// ═══════════════════════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════════════════════
// ROLE DETERMINATION — Bulletproof: uses explicit role + year_class fallback
// 2CL / 1CL year_class ⇒ officer  |  Basic Cadet ⇒ cadet
// This prevents silent 'cadet' default when fullRequestData.role is missing
// ═══════════════════════════════════════════════════════════════════════════════
function determineRole(requestData) {
  // 1. Check explicit role from enrollment form
  const explicitRole = String(requestData.role || '').trim().toLowerCase();
  if (explicitRole === 'officer' || explicitRole === 'cadet') {
    return explicitRole;
  }

  // 2. Fallback: infer from year_class (2CL/1CL = officer, Basic Cadet = cadet)
  const yearClass = String(requestData.year_class || '').trim();
  if (yearClass.includes('2CL') || yearClass.includes('1CL')) {
    console.log(`[ROLE-FIX] Inferred 'officer' from year_class="${yearClass}" (explicit role was "${requestData.role}")`);
    return 'officer';
  }

  // 3. Default to cadet (Basic Cadet / unknown)
  console.log(`[ROLE-FIX] Defaulting to 'cadet' — role="${requestData.role}", year_class="${yearClass}"`);
  return 'cadet';
}

export default async function handler(req, res) {
  // SMTP Diagnostic Logging (Fix 7)
  console.log('[SMTP-CHECK] SMTP_EMAIL set:', !!process.env.SMTP_EMAIL);
  console.log('[SMTP-CHECK] SMTP_PASSWORD set:', !!process.env.SMTP_PASSWORD);
  console.log('[SMTP-CHECK] CRON_SECRET set:', !!process.env.CRON_SECRET);

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

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
    // VERY IMPORTANT: Ensure Vercel has SUPABASE_SERVICE_ROLE_KEY set (NOT VITE_...)
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables on server. Make sure SUPABASE_SERVICE_ROLE_KEY is set in Vercel.");
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new Error("Missing Authorization header.");
    }

    // 2. Initialize Clients
    const supabaseUserClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY || '', {
      global: { headers: { Authorization: authHeader } }
    });
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Verify Admin Access
    const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized: " + (authError?.message || "User not found"));

    const { data: userData } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single();
    if (!userData || userData.role !== 'admin') {
      throw new Error("Forbidden: Only admins can process enrollments.");
    }

    const { type, requestId, email, firstName, idNumber, fullRequestData } = req.body;

    if (type !== 'approve' && type !== 'reject') {
      throw new Error("Only 'approve' and 'reject' types are supported.");
    }

    // ─── REJECT FLOW ────────────────────────────────────────────────────
    if (type === 'reject') {
      const { rejectionReason } = req.body;
      if (!rejectionReason) throw new Error("Rejection reason is required.");

      const { error: updateError } = await supabaseAdmin.from('enrollment_requests').update({
        status: 'rejected',
        rejection_reason: rejectionReason,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      }).eq('id', requestId);

      if (updateError) throw new Error("Failed to update request: " + updateError.message);

      // Queue rejection email (Fix 5: same pattern as approval)
      try {
        const rejectionHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a472a;">MSU ZS ROTC Enrollment Update</h2>
            <p>Dear ${firstName},</p>
            <p>We regret to inform you that your enrollment request has been <strong>rejected</strong>.</p>
            <div style="background: #fff3f3; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
              <p style="margin: 0;"><strong>Reason:</strong> ${rejectionReason}</p>
            </div>
            <p>If you believe this was a mistake, please contact the ROTC office for assistance.</p>
            <br/>
            <p>Best regards,<br/>MSU ZS ROTC Administration</p>
          </div>
        `;
        await supabaseAdmin.from('email_queue').insert({
          recipient: email,
          subject: "MSU ZS ROTC - Enrollment Update",
          html_body: rejectionHtml,
          status: 'pending'
        });
        console.log('[EMAIL] Rejection email queued for:', email);
      } catch (emailError) {
        console.error("Failed to queue rejection email:", emailError);
      }

      // Auto-trigger email processor (Fix 4: send immediately, don't wait for cron)
      try {
        const baseUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:3000';
        const triggerRes = await fetch(`${baseUrl}/api/cron/process-emails`, {
          method: 'POST',
          headers: { 'Authorization': authHeader }
        });
        const triggerResult = await triggerRes.json();
        console.log('[EMAIL] Auto-triggered queue after rejection:', triggerResult);
      } catch (triggerErr) {
        console.error('[EMAIL] Auto-trigger failed (will retry via cron):', triggerErr.message);
      }

      return res.status(200).json({ success: true, message: "Enrollment rejected." });
    }

    // ─── APPROVE FLOW ───────────────────────────────────────────────────

    const cleanIdNumber = String(idNumber).trim().toUpperCase();

    // Password is the student ID number — cadets can change it after first login
    const tempPassword = cleanIdNumber;

    // CRITICAL: Use the dummy-email convention that matches the login flow in auth.ts
    // Login constructs: `${idNumber}@rotc.msubuug.edu.ph`
    // The student's real email (from enrollment form) is ONLY for sending notifications
    const authEmail = `${cleanIdNumber}@rotc.msubuug.edu.ph`;

    // PRE-CHECK: Does this user already exist in public.users?
    const { data: existingUser } = await supabaseAdmin.from('users')
      .select('id, role').eq('id_number', cleanIdNumber).maybeSingle();

    if (existingUser) {
      if (existingUser.role === 'admin' || existingUser.role === 'officer') {
        return res.status(400).json({ 
          error: "This ID number belongs to an active Admin or Officer. You cannot re-enroll or override this account, as it will destroy their login session." 
        });
      }

      // User profile exists — but auth might be broken (stale from failed attempts)
      // Self-healing: delete the old auth user and recreate with correct credentials
      try {
        await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
      } catch (_) { /* ignore if auth user doesn't exist */ }

      const { data: fixedAuth, error: fixError } = await supabaseAdmin.auth.admin.createUser({
        email: authEmail,
        password: tempPassword,
        email_confirm: true
      });

      if (fixError) throw new Error("Failed to fix user auth: " + fixError.message);

      // Update the public.users row to point to the new auth user ID
      await supabaseAdmin.from('users')
        .update({ id: fixedAuth.user.id })
        .eq('id_number', cleanIdNumber);

      // Mark enrollment request as approved
      await supabaseAdmin.from('enrollment_requests').update({
        status: 'approved', reviewed_by: user.id, reviewed_at: new Date().toISOString()
      }).eq('id', requestId);

      return res.status(200).json({ success: true, message: "Account repaired and approved." });
    }

    // 4. Create fresh account (no existing user)
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: authEmail,
      password: tempPassword,
      email_confirm: true
    });

    if (createError) throw new Error("Failed to create user auth: " + createError.message);

    // 5. Insert Profile — columns validated against schema contract (api/schema/users.contract.mjs)
    const fullName = [
      fullRequestData.first_name,
      fullRequestData.middle_initial ? fullRequestData.middle_initial + '.' : '',
      fullRequestData.last_name
    ].filter(Boolean).join(' ');

    const userProfile = {
      id: authData.user.id,
      id_number: cleanIdNumber,
      full_name: fullName,
      gender: fullRequestData.gender,
      role: determineRole(fullRequestData),
      school: fullRequestData.school,
      platoon: 'Unassigned',
      year_level: fullRequestData.year_level || '1st Year',
      year_class: fullRequestData.year_class || '1st Year',
      is_active: true,
      is_deleted: false,
      blood_type: fullRequestData.blood_type,
      emergency_contact_name: fullRequestData.emergency_name,
      emergency_contact_number: fullRequestData.emergency_contact
    };

    // Validate payload against schema contract BEFORE hitting the database
    validateUsersPayload(userProfile);

    const { error: insertError } = await supabaseAdmin.from('users').insert(userProfile);

    if (insertError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw new Error("Failed to create user profile: " + insertError.message);
    }

    // 6. Update Request Status
    const { error: updateError } = await supabaseAdmin.from('enrollment_requests').update({ 
      status: 'approved',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString()
    }).eq('id', requestId);

    if (updateError) {
      console.error("Failed to update request status, but user was created:", updateError);
    }

    // 7. Queue Email instead of sending synchronously (Background Email Processing)
    try {
      const htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a472a;">Welcome to MSU ZS ROTC</h2>
          <p>Dear ${firstName},</p>
          <p>Your enrollment request has been approved.</p>
          <div style="background: #f4f4f4; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>ID Number:</strong> ${cleanIdNumber}</p>
            <p style="margin: 5px 0 0 0;"><strong>Password:</strong> ${tempPassword}</p>
          </div>
          <p>You can now log in to the ROTC Portal using these credentials. Please change your password after logging in.</p>
          <br/>
          <p>Best regards,<br/>MSU ZS ROTC Administration</p>
        </div>
      `;

      await supabaseAdmin.from('email_queue').insert({
        recipient: email,
        subject: "Welcome to MSU ZS ROTC Unit",
        html_body: htmlContent,
        status: 'pending'
      });
      console.log('[EMAIL] Approval email queued for:', email);
    } catch (emailError) {
      console.error("Failed to queue email:", emailError);
    }

    // Auto-trigger email processor (Fix 4: send immediately, don't wait for cron)
    try {
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';
      const triggerRes = await fetch(`${baseUrl}/api/cron/process-emails`, {
        method: 'POST',
        headers: { 'Authorization': authHeader }
      });
      const triggerResult = await triggerRes.json();
      console.log('[EMAIL] Auto-triggered queue after approval:', triggerResult);
    } catch (triggerErr) {
      console.error('[EMAIL] Auto-trigger failed (will retry via cron):', triggerErr.message);
    }

    return res.status(200).json({ success: true, message: "Enrollment processed." });

  } catch (error) {
    console.error("Vercel Serverless Error:", error);
    return res.status(400).json({ success: false, error: error.message });
  }
}

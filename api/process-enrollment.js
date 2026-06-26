import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { validateUsersPayload } from './schema/users.contract.mjs';

export default async function handler(req, res) {
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
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
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

    if (type !== 'approve') {
      throw new Error("Only 'approve' type is supported by this endpoint.");
    }

    // 4. Create Account
    // Password is the student ID number — cadets can change it after first login
    const tempPassword = idNumber;

    // CRITICAL: Use the dummy-email convention that matches the login flow in auth.ts
    // Login constructs: `${idNumber}@rotc.msubuug.edu.ph`
    // The student's real email (from enrollment form) is ONLY for sending notifications
    const authEmail = `${idNumber.trim().toUpperCase()}@rotc.msubuug.edu.ph`;

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
      id_number: idNumber,
      full_name: fullName,
      gender: fullRequestData.gender,
      role: 'cadet',
      school: fullRequestData.school,
      platoon: 'Unassigned',
      is_active: true,
      is_deleted: false,
      blood_type: fullRequestData.blood_type,
      emergency_contact_name: fullRequestData.emergency_contact_name,
      emergency_contact_number: fullRequestData.emergency_contact_number
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
      processed_by: user.id,
      processed_at: new Date().toISOString()
    }).eq('id', requestId);

    if (updateError) {
      console.error("Failed to update request status, but user was created:", updateError);
    }

    // 7. Send Email via Nodemailer (No TCP restrictions on Vercel AWS Lambda!)
    try {
      if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
        console.warn("SMTP credentials missing, skipping email.");
      } else {
        const transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD
          }
        });

        const htmlContent = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a472a;">Welcome to MSU ZS ROTC</h2>
            <p>Dear ${firstName},</p>
            <p>Your enrollment request has been approved.</p>
            <div style="background: #f4f4f4; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>ID Number:</strong> ${idNumber}</p>
              <p style="margin: 5px 0 0 0;"><strong>Password:</strong> ${tempPassword}</p>
            </div>
            <p>You can now log in to the ROTC Portal using these credentials. Please change your password after logging in.</p>
            <br/>
            <p>Best regards,<br/>MSU ZS ROTC Administration</p>
          </div>
        `;

        await transporter.sendMail({
          from: `"MSU ZS ROTC Unit" <${process.env.SMTP_EMAIL}>`,
          to: email,
          subject: "Welcome to MSU ZS ROTC Unit",
          html: htmlContent
        });
      }
    } catch (emailError) {
      console.error("Non-blocking email error:", emailError);
    }

    return res.status(200).json({ success: true, message: "Enrollment processed." });

  } catch (error) {
    console.error("Vercel Serverless Error:", error);
    return res.status(400).json({ success: false, error: error.message });
  }
}

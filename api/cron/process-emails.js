import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  // 1. Setup CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Security check: Either Vercel Cron Secret OR Admin Bearer Token
  const authHeader = req.headers.authorization;
  const isCronSecret = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  let isAdmin = false;

  if (!isCronSecret && authHeader) {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseUserClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY || '', {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: { user } } = await supabaseUserClient.auth.getUser();
      if (user) {
        const { data: userData } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single();
        if (userData && (userData.role === 'admin' || userData.role === 'officer')) {
          isAdmin = true;
        }
      }
    } catch (e) {
      console.error("Auth check failed:", e);
    }
  }

  if (!isCronSecret && !isAdmin) {
    console.warn("Unauthorized cron/manual request");
    if (process.env.NODE_ENV === 'production') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    // 1. Fetch up to 20 pending emails to avoid timing out the function
    const { data: emails, error: fetchError } = await supabaseAdmin
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .limit(20);

    if (fetchError) throw fetchError;
    if (!emails || emails.length === 0) {
      return res.status(200).json({ success: true, sent: 0, failed: 0, message: "No pending emails" });
    }

    // 2. Setup transporter
    if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
      return res.status(500).json({ error: "SMTP credentials missing" });
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD
      }
    });

    // 3. Mark them as 'processing' so another cron doesn't grab them
    const emailIds = emails.map(e => e.id);
    await supabaseAdmin
      .from('email_queue')
      .update({ status: 'processing' })
      .in('id', emailIds);

    const results = { sent: 0, failed: 0 };

    // 4. Send emails sequentially to avoid overwhelming SMTP
    for (const email of emails) {
      try {
        await transporter.sendMail({
          from: `"MSU ZS ROTC Unit" <${process.env.SMTP_EMAIL}>`,
          to: email.recipient,
          subject: email.subject,
          html: email.html_body
        });

        await supabaseAdmin
          .from('email_queue')
          .update({ status: 'sent', processed_at: new Date().toISOString() })
          .eq('id', email.id);

        results.sent++;
      } catch (sendErr) {
        console.error(`Failed to send email to ${email.recipient}:`, sendErr);
        const newAttempts = email.attempts + 1;
        const newStatus = newAttempts >= 3 ? 'failed' : 'pending';

        await supabaseAdmin
          .from('email_queue')
          .update({ 
            status: newStatus, 
            attempts: newAttempts, 
            error_message: sendErr.message 
          })
          .eq('id', email.id);
          
        results.failed++;
      }
    }

    return res.status(200).json({ success: true, ...results });
  } catch (error) {
    console.error("Cron email processor error:", error);
    return res.status(500).json({ error: error.message });
  }
}

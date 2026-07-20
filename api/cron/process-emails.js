import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

// Small delay helper to avoid Gmail rate limits
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default async function handler(req, res) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
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
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
      const supabaseUserClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '', {
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
    // 1. Fetch up to 10 pending emails per batch (reduced from 20 to avoid Gmail rate limits)
    const { data: emails, error: fetchError } = await supabaseAdmin
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10);

    if (fetchError) throw fetchError;
    if (!emails || emails.length === 0) {
      return res.status(200).json({ success: true, sent: 0, failed: 0, message: "No pending emails" });
    }

    // 2. Setup transporter with timeouts to detect connection issues faster
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
      },
      connectionTimeout: 10000,  // 10s to establish connection
      greetingTimeout: 10000,    // 10s for SMTP greeting
      socketTimeout: 15000,      // 15s for socket inactivity
      pool: false,               // Don't pool — create fresh connection per email
    });

    // 2.1 Verify SMTP connection before processing batch
    try {
      await transporter.verify();
    } catch (verifyErr) {
      console.error('SMTP connection verification failed:', verifyErr.code, verifyErr.message);
      return res.status(500).json({ 
        error: `SMTP connection failed: ${verifyErr.code || verifyErr.message}`,
        hint: 'Check SMTP_EMAIL and SMTP_PASSWORD in Vercel env vars. Gmail requires an App Password.'
      });
    }

    // 3. Mark them as 'processing' so another cron doesn't grab them
    const emailIds = emails.map(e => e.id);
    await supabaseAdmin
      .from('email_queue')
      .update({ status: 'processing' })
      .in('id', emailIds);

    const results = { sent: 0, failed: 0, errors: [] };

    // 4. Send emails sequentially with 2s delay between each to avoid Gmail rate limits
    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];

      // Add delay between emails (skip before the first one)
      if (i > 0) {
        await delay(2000);
      }

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
        console.error(`Failed to send email to ${email.recipient}:`, sendErr.code, sendErr.message);
        const newAttempts = (email.attempts || 0) + 1;
        const newStatus = newAttempts >= 5 ? 'failed' : 'pending';

        await supabaseAdmin
          .from('email_queue')
          .update({ 
            status: newStatus, 
            attempts: newAttempts, 
            error_message: `[${sendErr.code || 'UNKNOWN'}] ${sendErr.message}` 
          })
          .eq('id', email.id);
          
        results.failed++;
        results.errors.push({ recipient: email.recipient, error: sendErr.code || sendErr.message });

        // If SMTP auth fails, stop processing — all remaining will fail too
        if (sendErr.code === 'EAUTH' || sendErr.responseCode === 535) {
          console.error('SMTP authentication failed — stopping batch');
          // Reset remaining emails back to pending
          const remainingIds = emails.slice(i + 1).map(e => e.id);
          if (remainingIds.length > 0) {
            await supabaseAdmin
              .from('email_queue')
              .update({ status: 'pending' })
              .in('id', remainingIds);
          }
          break;
        }
      }
    }

    return res.status(200).json({ success: true, ...results });
  } catch (error) {
    console.error("Cron email processor error:", error);
    return res.status(500).json({ error: error.message });
  }
}

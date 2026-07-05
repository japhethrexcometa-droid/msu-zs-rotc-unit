import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Security check for cron jobs if using Vercel cron
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn("Unauthorized cron request");
    // Depending on setup, you might want to return 401. 
    // If testing locally, we might allow it. For production, enforce:
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
      return res.status(200).json({ message: "No pending emails" });
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

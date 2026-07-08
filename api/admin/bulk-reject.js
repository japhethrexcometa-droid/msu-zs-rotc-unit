import { createClient } from '@supabase/supabase-js';

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
    const { requestIds, reason } = req.body;
    if (!Array.isArray(requestIds) || requestIds.length === 0) {
      throw new Error("No request IDs provided.");
    }
    if (!reason || !reason.trim()) {
      throw new Error("Rejection reason is required.");
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

    for (const request of requests) {
      // Safety check: If we're approaching Vercel's 10s limit, stop processing
      if (Date.now() - startTime > 8000) {
        results.errors.push({ message: "Timed out. Some requests were not processed. Please try again for the remaining." });
        break;
      }

      try {
        // 1. Update Request Status
        const { error: updateError } = await supabaseAdmin.from('enrollment_requests').update({
          status: 'rejected',
          rejection_reason: reason,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        }).eq('id', request.id);

        if (updateError) throw updateError;

        // 2. Queue Rejection Email
        const htmlContent = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #721c24;">Enrollment Update - MSU ZS ROTC</h2>
            <p>Dear ${request.first_name},</p>
            <p>We regret to inform you that your enrollment request has been rejected.</p>
            <div style="background: #fff5f5; padding: 15px; border-radius: 8px; border: 1px solid #feb2b2; margin: 20px 0;">
              <p style="margin: 0;"><strong>Reason for Rejection:</strong></p>
              <p style="margin: 5px 0 0 0; color: #c53030;">${reason}</p>
            </div>
            <p>If you believe this is a mistake or need further clarification, please visit the ROTC office.</p>
            <br/>
            <p>Best regards,<br/>MSU ZS ROTC Administration</p>
          </div>
        `;

        await supabaseAdmin.from('email_queue').insert({
          recipient: request.email,
          subject: "Enrollment Status Update - MSU ZS ROTC",
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
    console.error("Bulk Reject Error:", error);
    return res.status(400).json({ success: false, error: error.message });
  }
}

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
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const authHeader = req.headers.authorization;

    if (!authHeader) throw new Error("Missing Authorization header");

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseUser = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY || '', {
      global: { headers: { Authorization: authHeader } }
    });

    // 1. Authenticate Admin
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { data: userData } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single();
    if (!userData || userData.role !== 'admin') {
      throw new Error("Forbidden: Only administrators can retry failed emails.");
    }

    // 2. Reset Failed Emails in the Queue
    const { data: failedDocs, error: selectError } = await supabaseAdmin
      .from('email_queue')
      .select('id')
      .eq('status', 'failed');

    if (selectError) throw selectError;

    const resetCount = failedDocs ? failedDocs.length : 0;

    if (resetCount > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('email_queue')
        .update({
          status: 'pending',
          attempts: 0,
          error_message: null
        })
        .eq('status', 'failed');

      if (updateError) throw updateError;

      // 3. Auto-trigger email processing (non-blocking)
      try {
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const host = req.headers.host || 'localhost:3000';
        fetch(`${protocol}://${host}/api/cron/process-emails`, {
          method: 'POST',
          headers: { 'Authorization': authHeader }
        })
        .then(res => res.json())
        .then(result => console.log('[EMAIL] Auto-triggered queue processing after retry:', result))
        .catch(err => console.error('[EMAIL] Auto-trigger fetch promise failed after retry:', err.message));
      } catch (emailTriggerErr) {
        console.error('[EMAIL] Auto-trigger failed after retry (will retry via cron):', emailTriggerErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      count: resetCount,
      message: `Successfully reset ${resetCount} failed emails to pending status.`
    });

  } catch (error) {
    console.error("Retry Emails Error:", error);
    return res.status(400).json({ success: false, error: error.message });
  }
}

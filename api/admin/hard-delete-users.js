import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const { userIds } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new Error("No user IDs provided.");
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const authHeader = req.headers.authorization;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables.");
    }

    // 1. Verify caller is admin via JWT
    const supabaseUserClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '', {
      global: { headers: { Authorization: authHeader } }
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { data: userData } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single();
    if (!userData || userData.role !== 'admin') {
      throw new Error("Forbidden: only admins can hard-delete users.");
    }

    // 2. Collect id_numbers for cleaning enrollment data
    const { data: targetUsers } = await supabaseAdmin
      .from('users')
      .select('id_number')
      .in('id', userIds);

    const idNumbers = (targetUsers || []).map(u => u.id_number).filter(Boolean);

    // 3. Delete from enrollment_archives by id_number
    if (idNumbers.length > 0) {
      await supabaseAdmin.from('enrollment_archives').delete().in('id_number', idNumbers);
    }

    // 4. Delete from enrollment_requests by id_number
    if (idNumbers.length > 0) {
      await supabaseAdmin.from('enrollment_requests').delete().in('id_number', idNumbers);
    }

    // 5. Delete from attendance
    await supabaseAdmin.from('attendance').delete().in('cadet_id', userIds);
    await supabaseAdmin.from('attendance').delete().in('scanned_by', userIds);

    // 6. Delete from pull_out_requests (ignore if table doesn't exist)
    try {
      await supabaseAdmin.from('pull_out_requests').delete().in('cadet_id', userIds);
    } catch (_) { /* table may not exist */ }

    // 7. Delete from scan_audit_logs (ignore if table doesn't exist)
    try {
      await supabaseAdmin.from('scan_audit_logs').delete().in('cadet_id', userIds);
      await supabaseAdmin.from('scan_audit_logs').delete().in('scanned_by', userIds);
    } catch (_) { /* table may not exist */ }

    // 8. Delete from public.users
    const { data: deletedUsers, error: deleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .in('id', userIds)
      .select('id');

    if (deleteError) throw deleteError;
    const deletedCount = (deletedUsers || []).length;

    // 9. Delete from auth.users (service role can do this)
    for (const uid of userIds) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(uid);
      } catch (_) {
        // User may not exist in auth.users (legacy/custom auth)
      }
    }

    return res.status(200).json({
      success: true,
      deleted: deletedCount,
      message: `${deletedCount} user(s) permanently deleted`
    });

  } catch (error) {
    console.error("Hard Delete Error:", error);
    return res.status(400).json({ success: false, error: error.message });
  }
}

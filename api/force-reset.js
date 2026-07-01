import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) throw new Error("Missing Supabase env vars");
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const ids = ['1008352', '1008354'];
    let results = [];

    for (let id of ids) {
      // Find the user by id_number
      const { data: user, error: findError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id_number', id)
        .single();

      if (findError || !user) {
        results.push({ id, status: 'Not found in public.users' });
        continue;
      }

      // Force update the password in Supabase Auth using the official Admin API
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: id
      });

      if (updateError) {
        results.push({ id, status: 'Failed: ' + updateError.message });
      } else {
        results.push({ id, status: 'Success - Password is now ' + id });
      }
    }

    return res.status(200).json({ success: true, results });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

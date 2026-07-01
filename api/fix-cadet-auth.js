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
      // Find the user by id_number using ilike to catch any weird hidden spaces in the DB
      const { data: user, error: findError } = await supabaseAdmin
        .from('users')
        .select('id, id_number')
        .ilike('id_number', `%${id}%`)
        .maybeSingle();

      if (findError || !user) {
        results.push({ id, status: `Not found in public.users. DB Error: ${findError?.message || 'No rows match'}` });
        continue;
      }

      // We know loginUser generates EXACTLY this email string to attempt login:
      const expectedEmail = `${id.trim().toUpperCase()}@rotc.msubuug.edu.ph`;

      // Force update both the email AND password in GoTrue
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        email: expectedEmail,
        password: id,
        email_confirm: true
      });

      if (updateError) {
        results.push({ id, status: 'Failed to update Auth: ' + updateError.message });
      } else {
        // Also let's update public.users just in case there were hidden spaces
        await supabaseAdmin.from('users').update({ id_number: id }).eq('id', user.id);
        
        results.push({ id, status: `Success - Email is exactly ${expectedEmail}, Password is ${id}` });
      }
    }

    return res.status(200).json({ success: true, results });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

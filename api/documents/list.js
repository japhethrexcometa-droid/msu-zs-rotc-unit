import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const authHeader = req.headers.authorization;

    if (!authHeader) throw new Error("Missing Authorization header");

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseUser = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY || '', {
      global: { headers: { Authorization: authHeader } }
    });

    // 1. Authenticate User (Cadets/Members)
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // 2. Fetch Public Documents
    const { search, folder } = req.query;
    let query = supabaseAdmin.from('archived_documents').select('*').eq('is_public', true);

    if (folder) query = query.eq('folder_name', folder);
    if (search) query = query.ilike('filename', `%${search}%`);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    return res.status(200).json({ success: true, data });

  } catch (error) {
    console.error("Public Documents API Error:", error);
    return res.status(400).json({ success: false, error: error.message });
  }
}

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

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
    if (!userData || (userData.role !== 'admin' && userData.role !== 'officer')) {
      throw new Error("Forbidden");
    }

    // 2. Handle Actions
    if (req.method === 'POST') {
      const { filename, display_name, original_name, folder_name, file_size, mime_type, storage_path, is_public } = req.body;

      const { data, error } = await supabaseAdmin.from('archived_documents').insert({
        filename,
        display_name: display_name || original_name,
        original_name,
        folder_name: folder_name || 'Uncategorized',
        file_size,
        mime_type,
        storage_path,
        is_public: !!is_public,
        uploaded_by: user.id
      }).select().single();

      if (error) throw error;
      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'GET') {
      const { search, folder, page = 1, pageSize = 20 } = req.query;
      let query = supabaseAdmin.from('archived_documents').select('*', { count: 'exact' });

      if (folder) query = query.eq('folder_name', folder);
      if (search) query = query.ilike('filename', `%${search}%`);

      const from = (parseInt(page) - 1) * parseInt(pageSize);
      const to = from + parseInt(pageSize) - 1;

      const [{ data, count }, { data: folders }] = await Promise.all([
        query.order('created_at', { ascending: false }).range(from, to),
        supabaseAdmin.from('archived_documents').select('folder_name')
      ]);

      const uniqueFolders = [...new Set((folders || []).map(f => f.folder_name))];

      return res.status(200).json({
        success: true,
        data: data || [],
        count: count || 0,
        folders: uniqueFolders
      });
    }

    if (req.method === 'PATCH') {
      const { id, newFilename, old_name, new_name, oldFolderName, newFolderName, oldName, newName } = req.body;

      // 1. Handle folder rename request
      const actualOldFolderName = old_name || oldFolderName || oldName;
      const actualNewFolderName = new_name || newFolderName || newName;

      if (actualOldFolderName && actualNewFolderName) {
        const { error } = await supabaseAdmin
          .from('archived_documents')
          .update({
            folder_name: actualNewFolderName,
            updated_at: new Date().toISOString()
          })
          .eq('folder_name', actualOldFolderName);

        if (error) throw error;
        return res.status(200).json({ success: true, message: "Folder and all its documents renamed successfully" });
      }

      // 2. Handle single document display name rename request
      if (!id || !newFilename) throw new Error("Missing ID or new filename");

      // We only rename the "display name" in the DB metadata for safety
      const { error } = await supabaseAdmin
        .from('archived_documents')
        .update({ display_name: newFilename, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      return res.status(200).json({ success: true, message: "Document renamed successfully" });
    }

    if (req.method === 'DELETE') {
      const { id, path } = req.query;
      if (!id || !path) throw new Error("Missing ID or path");

      // Delete from storage first
      const { error: storageError } = await supabaseAdmin.storage.from('vault').remove([path]);
      if (storageError) throw storageError;

      // Delete metadata
      const { error: dbError } = await supabaseAdmin.from('archived_documents').delete().eq('id', id);
      if (dbError) throw dbError;

      return res.status(200).json({ success: true, message: "Document deleted successfully" });
    }

    throw new Error("Method not allowed");

  } catch (error) {
    console.error("Documents API Error:", error);
    return res.status(400).json({ success: false, error: error.message });
  }
}

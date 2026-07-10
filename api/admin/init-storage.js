import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log(`[InitStorage] Target: ${supabaseUrl?.substring(0, 15)}...`);
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
      throw new Error("Forbidden: Only administrators can access this system.");
    }

    // 2. Check and Create 'vault' bucket
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    if (listError) throw listError;

    const vaultExists = buckets.find(b => b.id === 'vault');

    if (!vaultExists) {
      const { error: createError } = await supabaseAdmin.storage.createBucket('vault', {
        public: false,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/vnd.ms-powerpoint',
          'text/csv'
        ]
      });
      if (createError) throw createError;

      // Add RLS Policies for Storage via SQL (Supabase doesn't have a direct API for storage policies yet, but we can try)
      // Usually policies are done via migrations, but we already have them in our migrations.

      return res.status(200).json({ success: true, message: "Vault bucket created successfully" });
    }

    // 3. Schema Health Check & Force Reload
    // Check if critical tables are visible in the schema cache
    const checkTables = ['enrollment_archives', 'archived_documents'];
    for (const table of checkTables) {
      const { error: schemaError } = await supabaseAdmin.from(table).select('id').limit(1);

      if (schemaError && (schemaError.message.includes("could not find table") || schemaError.code === '42P01')) {
        console.warn(`Schema cache stale or table missing: ${table}`);

        // Attempt to trigger a reload if we detect missing tables
        await supabaseAdmin.rpc('reload_schema_cache').catch(() => {
          // Fallback if RPC doesn't exist
          supabaseAdmin.from('users').select('id').limit(1);
        });

        return res.status(200).json({
          success: true,
          message: `The '${table}' table was not found. Please run the SQL fix from 'supabase/fix_archives_and_vault.sql' in your Supabase SQL Editor.`,
          schemaStale: true
        });
      }
    }

    return res.status(200).json({ success: true, message: "Storage and Database are healthy" });

  } catch (error) {
    console.error("Storage Init Error:", error);
    return res.status(400).json({ success: false, error: error.message });
  }
}

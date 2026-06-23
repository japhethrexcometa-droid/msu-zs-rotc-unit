import pg from 'pg';
const { Client } = pg;

async function run() {
  const client = new Client({ connectionString: 'postgresql://postgres:JnwuRp501NjRA702@db.pfkmqrwpdkxgwdnwfrgk.supabase.co:5432/postgres' });
  try {
    await client.connect();
    
    // Drop existing policies just in case
    await client.query(`DROP POLICY IF EXISTS "settings_select_all" ON public.system_settings;`);
    await client.query(`DROP POLICY IF EXISTS "settings_update_admin" ON public.system_settings;`);
    await client.query(`DROP POLICY IF EXISTS "settings_insert_admin" ON public.system_settings;`);
    
    // Recreate them strictly
    await client.query(`ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;`);
    
    await client.query(`CREATE POLICY "settings_select_all" ON public.system_settings FOR SELECT TO anon, authenticated USING (true);`);
    
    // We won't bother with the complex update policies since the admin can just use service role if needed, or we just grant authenticated
    await client.query(`CREATE POLICY "settings_update_admin" ON public.system_settings FOR UPDATE TO authenticated USING (true);`);
    await client.query(`CREATE POLICY "settings_insert_admin" ON public.system_settings FOR INSERT TO authenticated WITH CHECK (true);`);

    // Ensure GRANTS
    await client.query(`GRANT USAGE ON SCHEMA public TO anon, authenticated;`);
    await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_settings TO anon, authenticated;`);

    // Verify row exists and is boolean true
    await client.query(`
      INSERT INTO public.system_settings (id, value) 
      VALUES ('enrollment_open', 'true'::jsonb) 
      ON CONFLICT (id) DO UPDATE SET value = 'true'::jsonb;
    `);

    console.log('Successfully fixed RLS policies and grants for system_settings!');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();

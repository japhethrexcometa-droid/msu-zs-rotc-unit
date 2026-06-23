import pg from 'pg';
const { Client } = pg;

async function run() {
  const client = new Client({ connectionString: 'postgresql://postgres:JnwuRp501NjRA702@db.pfkmqrwpdkxgwdnwfrgk.supabase.co:5432/postgres' });
  try {
    await client.connect();
    await client.query(`
      INSERT INTO public.system_settings (id, value, description) 
      VALUES ('enrollment_open', 'true'::jsonb, 'Toggle to allow or block new enrollment requests') 
      ON CONFLICT (id) DO UPDATE SET value = 'true'::jsonb;
    `);
    console.log('Successfully initialized system_settings row!');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();

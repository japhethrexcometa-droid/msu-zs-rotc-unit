import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env file manually from project root
const envPath = 'c:\\rotc-pwa\\.env';
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = envVars['VITE_SUPABASE_URL'] || envVars['SUPABASE_URL'];
const supabaseKey = envVars['SUPABASE_SERVICE_ROLE_KEY'] || envVars['VITE_SUPABASE_ANON_KEY']; 

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key');
  process.exit(1);
}

const db = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: users, error } = await db.from('users').select('id, full_name, role, is_active').eq('role', 'admin');
  if (error) {
    console.error('Error fetching admins:', error);
  } else {
    console.log('Admins in DB:', JSON.stringify(users, null, 2));
  }
}
check();

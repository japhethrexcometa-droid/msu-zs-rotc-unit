const url = 'https://pfkmqrwpdkxgwdnwfrgk.supabase.co/functions/v1/process-enrollment';
async function run() {
  try {
    const res = await fetch(url, { method: 'OPTIONS' });
    console.log('OPTIONS Status:', res.status);
    console.log('OPTIONS Headers:', Object.fromEntries(res.headers.entries()));
    const text = await res.text();
    console.log('OPTIONS Body:', text);
  } catch (e) {
    console.error('Fetch error:', e);
  }
}
run();

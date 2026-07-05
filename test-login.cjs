const https = require('https');
https.get('https://msu-zs-rotc-unit.vercel.app/', (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const match = data.match(/src="(\/assets\/index-[^"]+\.js)"/);
    if (match) {
      https.get('https://msu-zs-rotc-unit.vercel.app' + match[1], (res2) => {
        let js = '';
        res2.on('data', c => js += c);
        res2.on('end', () => {
          const supabaseUrl = js.match(/https:\/\/[a-zA-Z0-9-]+\.supabase\.co/);
          const supabaseKey = js.match(/eyJ[a-zA-Z0-9_=-]+\.[a-zA-Z0-9_=-]+\.[a-zA-Z0-9_=-]+/g);
          console.log('URL:', supabaseUrl ? supabaseUrl[0] : 'Not found');
          console.log('Key:', supabaseKey ? supabaseKey[0] : 'Not found');
        });
      });
    } else {
      console.log('No JS bundle found');
    }
  });
});

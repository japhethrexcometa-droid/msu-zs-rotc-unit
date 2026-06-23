const https = require('https');

https.get('https://msu-zs-rotc-unit.vercel.app/', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const matches = data.match(/src="(\/assets\/index-[^"]+\.js)"/);
    if (matches && matches[1]) {
      const jsUrl = 'https://msu-zs-rotc-unit.vercel.app' + matches[1];
      console.log('Found JS URL:', jsUrl);
      https.get(jsUrl, (jsRes) => {
        let jsData = '';
        jsRes.on('data', chunk => jsData += chunk);
        jsRes.on('end', () => {
          const supabaseUrlMatch = jsData.match(/https:\/\/[a-z0-9]+\.supabase\.co/);
          if (supabaseUrlMatch) {
            console.log('Remote Supabase URL:', supabaseUrlMatch[0]);
          } else {
            console.log('No Remote Supabase URL found. Vercel is definitely using 127.0.0.1!');
          }
          
          const anonKeyMatch = jsData.match(/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g);
          if (anonKeyMatch) {
            console.log('Anon Keys Found:', [...new Set(anonKeyMatch)]);
          }
        });
      });
    } else {
      console.log('Could not find JS bundle in HTML');
    }
  });
});

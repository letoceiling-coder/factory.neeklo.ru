const fetch = require('node-fetch');
const { SocksProxyAgent } = require('socks-proxy-agent');
const url = process.env.EXTERNAL_PROXY_URL;
console.log('proxy', url ? url.replace(/:([^:@]+)@/, ':***@') : 'unset');
const agent = new SocksProxyAgent(url);
fetch('https://api.elevenlabs.io/v1/voices', {
  headers: { 'xi-api-key': '1b3811c4fa5f2241787a0761dcd6bd9ecb3ef88855a7f8d992ddc97eaa814ca3' },
  agent,
})
  .then(async (r) => {
    const t = await r.text();
    console.log('status', r.status, t.slice(0, 150));
  })
  .catch((e) => console.error('fetch_err', e.message));

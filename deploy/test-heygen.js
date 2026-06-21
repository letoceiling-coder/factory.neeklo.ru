/**
 * Test HeyGen API from worker environment (proxy + credentials).
 * Run: docker exec factory_worker node /app/test-heygen.js
 */
const { PrismaClient } = require('@prisma/client');
const nodeFetch = require('node-fetch');
const { SocksProxyAgent } = require('socks-proxy-agent');

async function extFetch(url, init = {}) {
  const proxy = process.env.EXTERNAL_PROXY_URL?.trim();
  const slugs = (process.env.EXTERNAL_PROXY_SLUGS || '').includes('heygen');
  if (proxy && slugs) {
    const agent = new SocksProxyAgent(proxy);
    return nodeFetch(url, { ...init, agent });
  }
  return nodeFetch(url, init);
}

async function main() {
  const envKey = process.env.HEYGEN_API_KEY;
  console.log('ENV_KEY_SET:', !!envKey, 'LEN:', envKey?.length || 0);

  const p = new PrismaClient();
  const row = await p.provider.findUnique({ where: { slug: 'heygen' } });
  console.log('DB_PROVIDER:', row ? { enabled: row.enabled, hasEncKey: !!row.apiKeyEnc } : null);
  await p.$disconnect();

  const apiKey = envKey;
  if (!apiKey) {
    console.log('NO API KEY');
    return;
  }

  const base = process.env.HEYGEN_BASE_URL || 'https://api.heygen.com';

  // 1. User info / quota
  const userRes = await extFetch(`${base}/v1/user/remaining_quota`, {
    headers: { 'X-Api-Key': apiKey },
  });
  console.log('QUOTA_STATUS:', userRes.status);
  console.log('QUOTA_BODY:', (await userRes.text()).slice(0, 500));

  // 2. List talking photos
  const listRes = await extFetch(`${base}/v1/talking_photo.list`, {
    headers: { 'X-Api-Key': apiKey },
  });
  console.log('TALKING_LIST_STATUS:', listRes.status);
  console.log('TALKING_LIST_BODY:', (await listRes.text()).slice(0, 500));
}

main().catch((e) => {
  console.error('ERR', e);
  process.exit(1);
});

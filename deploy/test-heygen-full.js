const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const nodeFetch = require('node-fetch');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

function decrypt(payload, rawKey) {
  if (!payload) return null;
  const key = /^[0-9a-fA-F]{64}$/.test(rawKey)
    ? Buffer.from(rawKey, 'hex')
    : crypto.createHash('sha256').update(rawKey).digest();
  const [ivB64, tagB64, dataB64] = payload.split('.');
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

async function extFetch(url, init = {}) {
  const proxy = process.env.EXTERNAL_PROXY_URL?.trim();
  if (proxy) {
    const agent = new SocksProxyAgent(proxy);
    return nodeFetch(String(url), { ...init, agent });
  }
  return nodeFetch(String(url), init);
}

async function main() {
  const p = new PrismaClient();
  const encKey = process.env.APP_ENCRYPTION_KEY || 'dev-insecure-key';
  const row = await p.provider.findUnique({ where: { slug: 'heygen' } });
  const apiKey = decrypt(row?.apiKeyEnc, encKey) || process.env.HEYGEN_API_KEY;
  console.log('API_KEY_OK:', !!apiKey, 'prefix:', apiKey?.slice(0, 8));

  const avatar = await p.avatar.findFirst({ where: { name: 'rina' } });
  console.log('AVATAR:', avatar?.sourceImageKey, avatar?.engineAvatarId);

  const base = process.env.HEYGEN_BASE_URL || 'https://api.heygen.com';

  const quota = await extFetch(`${base}/v1/user/remaining_quota`, { headers: { 'X-Api-Key': apiKey } });
  console.log('QUOTA:', quota.status, (await quota.text()).slice(0, 300));

  if (!avatar?.sourceImageKey) {
    await p.$disconnect();
    return;
  }

  const s3 = new S3Client({
    region: process.env.S3_REGION || 'ru-3',
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_KEY,
    },
    forcePathStyle: true,
  });
  const imageUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: avatar.sourceImageKey }),
    { expiresIn: 3600 },
  );
  console.log('IMAGE_URL_LEN:', imageUrl.length);

  const tpRes = await extFetch(`${base}/v2/talking_photo`, {
    method: 'POST',
    headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl }),
  });
  const tpBody = await tpRes.text();
  console.log('TALKING_PHOTO_V2:', tpRes.status, tpBody.slice(0, 400));

  if (tpRes.ok) {
    const id = JSON.parse(tpBody)?.data?.talking_photo_id;
    console.log('TALKING_PHOTO_ID:', id);
    await p.$disconnect();
    return;
  }

  const imgRes = await nodeFetch(imageUrl);
  console.log('S3_FETCH:', imgRes.status, imgRes.headers.get('content-type'));
  const buf = Buffer.from(await imgRes.arrayBuffer());
  const ct = imgRes.headers.get('content-type')?.split(';')[0] || 'image/jpeg';

  const upRes = await extFetch('https://upload.heygen.com/v1/talking_photo', {
    method: 'POST',
    headers: { 'X-Api-Key': apiKey, 'Content-Type': ct },
    body: buf,
  });
  const upBody = await upRes.text();
  console.log('TALKING_PHOTO_UPLOAD:', upRes.status, upBody.slice(0, 400));

  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

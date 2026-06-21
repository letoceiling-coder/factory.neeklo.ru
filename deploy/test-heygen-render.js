const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const nodeFetch = require('node-fetch');
const { SocksProxyAgent } = require('socks-proxy-agent');

function decrypt(payload, rawKey) {
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
    return nodeFetch(String(url), { ...init, agent: new SocksProxyAgent(proxy) });
  }
  return nodeFetch(String(url), init);
}

async function main() {
  const p = new PrismaClient();
  const apiKey = decrypt((await p.provider.findUnique({ where: { slug: 'heygen' } }))?.apiKeyEnc, process.env.APP_ENCRYPTION_KEY);
  const scene = await p.scene.findFirst({
    where: { projectId: '74c0c798-5794-4055-b481-cce3defaed14', audioKey: { not: null } },
  });
  const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
  const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
  const s3 = new S3Client({
    region: process.env.S3_REGION,
    endpoint: process.env.S3_ENDPOINT,
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY, secretAccessKey: process.env.S3_SECRET_KEY },
    forcePathStyle: true,
  });
  const audioUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: scene.audioKey }), { expiresIn: 3600 });
  const talkingPhotoId = 'b1dfebbc92a34935a3373e7ac421b6a1';
  const base = process.env.HEYGEN_BASE_URL || 'https://api.heygen.com';
  console.log('BASE:', base);

  const res = await extFetch(`${base}/v2/video/generate`, {
    method: 'POST',
    headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      video_inputs: [{
        character: { type: 'talking_photo', talking_photo_id: talkingPhotoId },
        voice: { type: 'audio', audio_url: audioUrl },
        background: { type: 'color', value: '#0a0a0f' },
      }],
      dimension: { width: 1280, height: 720 },
    }),
  });
  console.log('GENERATE:', res.status, (await res.text()).slice(0, 500));
  await p.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });

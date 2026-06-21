#!/usr/bin/env bash
docker exec factory_backend node <<'NODE'
const { S3Client, ListObjectsV2Command, PutObjectCommand } = require('@aws-sdk/client-s3');
const c = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION,
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY, secretAccessKey: process.env.S3_SECRET_KEY },
  forcePathStyle: true,
});
const bucket = process.env.S3_BUCKET || 'botme';
async function tryKey(key) {
  try {
    await c.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: 'test', ContentType: 'text/plain' }));
    console.log('PUT OK', key);
  } catch (e) {
    console.log('PUT FAIL', key, e.message);
  }
}
(async () => {
  try {
    const list = await c.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 5 }));
    console.log('LIST OK', (list.Contents || []).map((x) => x.Key));
  } catch (e) {
    console.log('LIST FAIL', e.message);
  }
  for (const key of [
    'uploads/image/test-factory.txt',
    'factory/uploads/image/test.txt',
    'factory/test.txt',
    'models/test.txt',
  ]) {
    await tryKey(key);
  }
})();
NODE

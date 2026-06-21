#!/usr/bin/env bash
set -u
echo "== S3 env (masked) =="
grep -E '^S3_' /opt/factory/backend/.env | sed 's/SECRET_KEY=.*/SECRET_KEY=***/'
echo "== selectel provider in DB =="
docker exec factory_backend node -e "
const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
p.provider.findUnique({where:{slug:'selectel'}}).then(r=>{
  console.log(JSON.stringify({slug:r?.slug,enabled:r?.enabled,hasKeyEnc:!!r?.apiKeyEnc,keyEncLen:r?.apiKeyEnc?.length||0,config:r?.config}));
}).finally(()=>p.\$disconnect());
"
echo "== direct S3 put with env =="
docker exec factory_backend node -e "
require('dotenv').config({path:'/app/.env'});
const {S3Client,PutObjectCommand}=require('@aws-sdk/client-s3');
const c=new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION||'ru-3',
  credentials:{accessKeyId:process.env.S3_ACCESS_KEY,secretAccessKey:process.env.S3_SECRET_KEY},
  forcePathStyle:true
});
c.send(new PutObjectCommand({Bucket:process.env.S3_BUCKET||'botme',Key:'uploads/image/factory-test.txt',Body:'test',ContentType:'text/plain'}))
.then(()=>console.log('env_upload_ok'))
.catch(e=>console.error('env_upload_err',e.name,e.message));
"

#!/usr/bin/env bash
AK=$(grep '^SELECTEL_S3_ACCESS_KEY=' /opt/models-gateway/.env | cut -d= -f2)
SK=$(grep '^SELECTEL_S3_SECRET_KEY=' /opt/models-gateway/.env | cut -d= -f2)
EP=$(grep '^SELECTEL_S3_ENDPOINT=' /opt/models-gateway/.env | cut -d= -f2)
RG=$(grep '^SELECTEL_S3_REGION=' /opt/models-gateway/.env | cut -d= -f2)
BK=$(grep '^SELECTEL_S3_BUCKET=' /opt/models-gateway/.env | cut -d= -f2)
echo "using ak ${AK:0:8}... bucket $BK"
docker exec \
  -e S3_ACCESS_KEY="$AK" \
  -e S3_SECRET_KEY="$SK" \
  -e S3_ENDPOINT="$EP" \
  -e S3_REGION="$RG" \
  -e S3_BUCKET="$BK" \
  factory_backend node /app/s3t.js

#!/usr/bin/env bash
set -u
MG=/opt/models-gateway/.env
ENV=/opt/factory/backend/.env
for var in ACCESS_KEY SECRET_KEY ENDPOINT REGION BUCKET; do
  val=$(grep "^SELECTEL_S3_${var}=" "$MG" | cut -d= -f2-)
  key="S3_${var}"
  [ "$var" = "ACCESS_KEY" ] && key="S3_ACCESS_KEY"
  [ "$var" = "SECRET_KEY" ] && key="S3_SECRET_KEY"
  if grep -q "^${key}=" "$ENV"; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV"
  else
    echo "${key}=${val}" >> "$ENV"
  fi
done
echo "S3 keys synced from models-gateway (masked):"
grep '^S3_ACCESS_KEY=' "$ENV" | sed 's/=.*/=***/'
cd /opt/factory && docker compose -f docker-compose.prod.yml up -d backend worker 2>&1 | tail -2
sleep 3
echo "upload test via API - skipped (needs multipart); S3 direct:"
docker exec factory_backend node /app/s3t.js 2>/dev/null | tail -4

#!/usr/bin/env bash
set -u
ENV=/opt/factory/backend/.env
PROXY='socks5://tgbridge:686171289ad5566b158dc6e8580f9666@10.78.0.2:1081'
BASE='http://127.0.0.1:3096/api'

upsert_env() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$ENV"; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV"
  else
    echo "${key}=${val}" >> "$ENV"
  fi
}

upsert_env EXTERNAL_PROXY_URL "$PROXY"
upsert_env EXTERNAL_PROXY_SLUGS 'elevenlabs,heygen,hedra,did'
echo "proxy env set"

cd /opt/factory
docker compose -f docker-compose.prod.yml up -d --build backend worker 2>&1 | tail -4
sleep 4

echo "== proxy env in container =="
docker exec factory_backend sh -c 'echo $EXTERNAL_PROXY_URL | sed "s/:[^:@]*@/:***@/"'

echo "== test elevenlabs via app (voices/catalog) =="
printf '{"email":"%s","password":"%s"}' 'admin@factory.neeklo.ru' 'f6d282a4f4a14b7786aa9eb8' > /tmp/au.json
curl -s -m 12 -X POST "$BASE/login" -H 'Content-Type: application/json' --data @/tmp/au.json > /tmp/ar.json
TOKEN=$(node -e 'try{const d=require("/tmp/ar.json");process.stdout.write(d.access_token||"")}catch(e){}' 2>/dev/null)
curl -s -m 20 "$BASE/voices/catalog" -H "Authorization: Bearer $TOKEN" | head -c 300; echo

echo "== providers elevenlabs =="
curl -s -m 12 "$BASE/providers/elevenlabs/status" -H "Authorization: Bearer $TOKEN"; echo

rm -f /tmp/au.json /tmp/ar.json
echo "== DONE =="

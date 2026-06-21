#!/usr/bin/env bash
set -u
BASE="http://127.0.0.1:3096/api"
EMAIL="admin@factory.neeklo.ru"
PASS="${ADMIN_PASS:-}"

echo "== SEED / BOOT LOGS =="
docker logs factory_backend 2>&1 | grep -iE 'seed|provider|listening' | tail -6

echo "== HEALTH =="
curl -s -m 8 "$BASE/health"; echo

echo "== LOGIN =="
printf '{"email":"%s","password":"%s"}' "$EMAIL" "$PASS" > /tmp/factory_login.json
curl -s -m 10 -X POST "$BASE/login" -H 'Content-Type: application/json' --data @/tmp/factory_login.json > /tmp/factory_login_resp.json
head -c 300 /tmp/factory_login_resp.json; echo

TOKEN=$(node -e 'try{const d=require("/tmp/factory_login_resp.json");process.stdout.write(d.access_token||d.accessToken||d.token||"")}catch(e){process.stdout.write("")}' 2>/dev/null)
if [ -z "$TOKEN" ]; then
  TOKEN=$(python3 -c 'import json;d=json.load(open("/tmp/factory_login_resp.json"));print(d.get("access_token") or d.get("accessToken") or d.get("token") or "")' 2>/dev/null)
fi
echo "TOKEN_LEN=${#TOKEN}"

echo "== /me =="
curl -s -m 8 "$BASE/me" -H "Authorization: Bearer $TOKEN" | head -c 250; echo
echo "== /providers =="
curl -s -m 8 "$BASE/providers" -H "Authorization: Bearer $TOKEN" | head -c 600; echo
echo "== /dashboard =="
curl -s -m 8 "$BASE/dashboard" -H "Authorization: Bearer $TOKEN" | head -c 300; echo
echo "== /workflows/palette =="
curl -s -m 8 "$BASE/workflows/palette" -H "Authorization: Bearer $TOKEN" | head -c 150; echo

rm -f /tmp/factory_login.json /tmp/factory_login_resp.json
echo "== DONE =="

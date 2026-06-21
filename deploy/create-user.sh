#!/usr/bin/env bash
set -u
BASE="http://127.0.0.1:3096/api"
ADMIN_EMAIL="admin@factory.neeklo.ru"
ADMIN_PASS="${ADMIN_PASS:-}"

NEW_EMAIL="${NEW_EMAIL:-}"
NEW_NAME="${NEW_NAME:-}"
NEW_PASS="${NEW_PASS:-}"
NEW_ROLE="${NEW_ROLE:-user}"

printf '{"email":"%s","password":"%s"}' "$ADMIN_EMAIL" "$ADMIN_PASS" > /tmp/au.json
curl -s -m 12 -X POST "$BASE/login" -H 'Content-Type: application/json' --data @/tmp/au.json > /tmp/ar.json
TOKEN=$(node -e 'try{const d=require("/tmp/ar.json");process.stdout.write(d.access_token||"")}catch(e){}' 2>/dev/null)
echo "admin TOKEN_LEN=${#TOKEN}"

printf '{"email":"%s","password":"%s","name":"%s","role":"%s"}' "$NEW_EMAIL" "$NEW_PASS" "$NEW_NAME" "$NEW_ROLE" > /tmp/nu.json
echo "== create user =="
curl -s -m 12 -X POST "$BASE/users" -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" --data @/tmp/nu.json
echo
echo "== users list =="
curl -s -m 12 "$BASE/users" -H "Authorization: Bearer $TOKEN"
echo
rm -f /tmp/au.json /tmp/ar.json /tmp/nu.json

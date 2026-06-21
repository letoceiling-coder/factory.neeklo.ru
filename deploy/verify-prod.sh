#!/usr/bin/env bash
set -u
HOST="factory.neeklo.ru"
EMAIL="admin@${HOST}"
PASS="${ADMIN_PASS:-}"

echo "== HTTP -> HTTPS redirect =="
curl -s -m 10 -o /dev/null -w 'http %{http_code} -> %{redirect_url}\n' "http://${HOST}/"

echo "== HTTPS health =="
curl -s -m 10 "https://${HOST}/api/health"; echo

echo "== HTTPS SPA (index) =="
curl -s -m 10 -o /tmp/idx.html -w 'index http %{http_code}\n' "https://${HOST}/"
grep -o '<title>[^<]*</title>' /tmp/idx.html | head -1
grep -o 'assets/[^"]*\.js' /tmp/idx.html | head -1

echo "== HTTPS login =="
printf '{"email":"%s","password":"%s"}' "$EMAIL" "$PASS" > /tmp/pl.json
curl -s -m 12 -X POST "https://${HOST}/api/login" -H 'Content-Type: application/json' --data @/tmp/pl.json > /tmp/pr.json
head -c 120 /tmp/pr.json; echo
TOKEN=$(node -e 'try{const d=require("/tmp/pr.json");process.stdout.write(d.access_token||"")}catch(e){}' 2>/dev/null)
echo "TOKEN_LEN=${#TOKEN}"

echo "== HTTPS /me =="
curl -s -m 10 "https://${HOST}/api/me" -H "Authorization: Bearer $TOKEN"; echo

echo "== SSL cert =="
echo | openssl s_client -servername "$HOST" -connect "${HOST}:443" 2>/dev/null | openssl x509 -noout -subject -issuer -dates 2>/dev/null

rm -f /tmp/pl.json /tmp/pr.json /tmp/idx.html
echo "== DONE =="

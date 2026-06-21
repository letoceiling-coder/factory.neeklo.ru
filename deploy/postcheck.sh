#!/usr/bin/env bash
echo "== factory containers =="
cd /opt/factory && docker compose -f docker-compose.prod.yml ps --format '{{.Name}} | {{.State}} | {{.Status}}'
echo "== neighbor sites still OK =="
for h in models.neeklo.ru bot-me.neeklo.ru api.neeklo.ru aura.neeklo.ru; do
  code=$(curl -s -m 8 -o /dev/null -w '%{http_code}' "https://$h/")
  echo "$h -> $code"
done
echo "== cleanup =="
rm -f /tmp/factory_src.tgz && echo cleaned

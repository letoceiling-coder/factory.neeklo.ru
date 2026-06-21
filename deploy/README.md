# Деплой Factory.neeklo.ru

Сервер: `root@212.67.9.173` · Домен: `factory.neeklo.ru`

## 1. Подготовка сервера

```bash
ssh root@212.67.9.173

# Docker + compose plugin
curl -fsSL https://get.docker.com | sh

# nginx + certbot (host-level reverse proxy + SSL)
apt-get update && apt-get install -y nginx certbot python3-certbot-nginx
```

## 2. Код и переменные окружения

```bash
git clone <repo-url> /opt/factory && cd /opt/factory
cp .env.example backend/.env
nano backend/.env   # заполнить ключи: OPENROUTER, ELEVENLABS, HEYGEN/HEDRA/DID, S3, JWT_SECRET, APP_ENCRYPTION_KEY
```

S3 (Selectel) уже заполнен значениями по умолчанию: бакет `botme`, регион `ru-3`, endpoint `s3.ru-3.storage.selcloud.ru`.

## 3. Запуск контейнеров

```bash
docker compose -f docker-compose.prod.yml up -d --build
# backend 127.0.0.1:3096, frontend 127.0.0.1:8090, + worker, postgres, redis
docker compose -f docker-compose.prod.yml exec backend npm run seed   # создать админа
```

## 4. Reverse proxy + SSL

```bash
cp deploy/nginx.prod.conf /etc/nginx/sites-available/factory.neeklo.ru
ln -s /etc/nginx/sites-available/factory.neeklo.ru /etc/nginx/sites-enabled/
mkdir -p /var/www/certbot
nginx -t && systemctl reload nginx
certbot --nginx -d factory.neeklo.ru
```

## 5. Проверка

```bash
curl https://factory.neeklo.ru/api/health
```

## Обновление

```bash
cd /opt/factory && git pull
docker compose -f docker-compose.prod.yml up -d --build
```

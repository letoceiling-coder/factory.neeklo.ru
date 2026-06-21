# Factory.neeklo.ru — Видео-завод с AI-аватарами

Платформа для генерации длинных реалистичных видеороликов с говорящим AI-аватаром по сценарию.
Управление вручную (нодовый редактор пайплайна) и через автономного AI-агента.

- Реалистичная речь (ElevenLabs) + синхрон губ (audio-driven рендер аватара)
- Мульти-провайдер аватаров: HeyGen / Hedra / D-ID (выбор движка на узле графа)
- Сборка финального видео через self-hosted FFmpeg (concat, субтитры, музыка, переходы)
- Хранилище: Selectel S3 (бакет `botme`, регион `ru-3`)
- Премиум-дизайн, RU/EN (RU по умолчанию)

## Стек

- Frontend: Vite + React 19 + TypeScript, Tailwind CSS v4, shadcn-стиль, `@xyflow/react`, react-query, кастомная i18n
- Backend: NestJS 11 + Prisma 6 + PostgreSQL 16, Redis 7 + BullMQ, JWT auth
- Медиа: FFmpeg

## Структура

```
factory.neeklo.ru/
├── backend/      # NestJS API + движок графа + воркеры очередей + интеграции
├── frontend/     # Vite React SPA админка
├── deploy/       # nginx, certbot, скрипты выката
├── docs/         # архитектура
├── scripts/      # i18n-аудит
├── docker-compose.yml        # dev: postgres + redis
└── docker-compose.prod.yml   # prod: + backend + worker + frontend
```

## Быстрый старт (dev)

```bash
# 1. Поднять инфраструктуру (Postgres + Redis)
docker compose up -d

# 2. Backend
cd backend
cp ../.env.example .env       # отредактировать ключи
npm install
npx prisma migrate dev
npm run seed
npm run start:dev             # API на http://localhost:3000

# 3. Worker (в отдельном терминале)
cd backend
npm run worker:dev

# 4. Frontend
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

Логин по умолчанию: `ADMIN_EMAIL` / `ADMIN_PASSWORD` из `.env`.

## Деплой (prod)

Сервер `root@212.67.9.173`, домен `factory.neeklo.ru`. См. [deploy/README.md](deploy/README.md).

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

## i18n

Перевод RU/EN, по умолчанию RU. Аудит паритета ключей:

```bash
node scripts/i18n-audit.mjs
```

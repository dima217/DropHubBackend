# Деплой main-app на Railway

## Файлы

| Файл | Назначение |
|------|------------|
| `docker-compose.railway.yml` | Drag & drop на canvas пустого Railway-проекта (переменные из `.env.development`) |

## Быстрый старт

1. Создайте в Railway **Empty project**.

2. Перетащите **`docker-compose.railway.yml`** на canvas. Railway создаст сервисы: `postgres`, `redis`, `rabbitmq`, `app`.

3. Для сервиса **app**:
   - **Settings → Networking → Generate Domain** (публичный API, порт `3000`)
   - Обновите `BASE_URL` и `GOOGLE_CALLBACK_URL` на Railway-домен

4. Дождитесь деплоя всех сервисов. `app` стартует после healthcheck postgres/redis/rabbitmq.

5. **Push (FCM):** сервис **app** → **Variables** → добавьте `GOOGLE_APPLICATION_CREDENTIALS_JSON` — скопируйте **весь** JSON из `secrets/drophub-2ac8d-firebase-adminsdk-fbsvc-d31519da74.json` (одной строкой или multiline в Raw Editor). **Redeploy** app.

   В Deploy Logs должно быть: `Firebase Admin initialized for FCM`.

## Связка с file-service

RabbitMQ и Redis из этого compose используются file-service. В **тот же Railway-проект** импортируйте `file-service/docker-compose.railway.yml`.

В file-service переменные должны указывать на общие сервисы:

```
REDIS_HOST=redis
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
```

## Переменные приложения

| Переменная | Обязательно | Описание |
|------------|-------------|----------|
| `JWT_SECRET` | да | Access token |
| `JWT_REFRESH_SECRET` | да | Refresh token |
| `DB_*` | да | PostgreSQL (совпадает с сервисом postgres) |
| `REDIS_*` | да | Кэш и очереди Bull |
| `RABBITMQ_URL` | да | RPC к file-service |
| `GOOGLE_CLIENT_ID` | для OAuth | Web client ID |
| `GOOGLE_CLIENT_SECRET` | для OAuth | |
| `GOOGLE_ID_TOKEN_AUDIENCES` | для mobile | Client IDs через запятую |
| `MAIL_*` | для email | SMTP |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | для FCM push | **Railway:** вставьте содержимое `secrets/drophub-...json` целиком в Variables → Raw Editor |
| `GOOGLE_APPLICATION_CREDENTIALS` | локально | Путь к JSON-файлу в контейнере (не нужен на Railway, если задан `_JSON`) |

## Ограничения Railway

- Не используйте `drophub-network` external — в railway-compose уже убрано
- Один volume на сервис — учтено
- `depends_on` на Railway не гарантирует порядок; приложение переподключится при старте БД
- Для production лучше заменить self-hosted postgres/redis на **Railway Database** и обновить Variables через reference variables

## Альтернатива: GitHub deploy

Если drag & drop не сработает для `build:` сервиса:

1. Подключите репозиторий → Root Directory: `main-app`
2. Добавьте managed Postgres/Redis или импортируйте только infra-сервисы из compose
3. Variables скопируйте из `docker-compose.railway.yml` → сервис `app`

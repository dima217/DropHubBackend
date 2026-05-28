# Деплой file-service на Railway

## Файлы

| Файл | Назначение |
|------|------------|
| `docker-compose.mongo.railway.yml` | Только MongoDB |
| `docker-compose.minio.railway.yml` | MinIO + minio-setup (бакеты) |
| `docker-compose.railway.yml` | Только file-service |

## Порядок импорта (один Railway-проект)

1. `main-app/docker-compose.railway.yml` — postgres, redis, rabbitmq, app
2. `file-service/docker-compose.mongo.railway.yml` — mongo
3. `file-service/docker-compose.minio.railway.yml` — minio, minio-setup
4. `file-service/docker-compose.railway.yml` — file-service

## Mongo отдельно

`docker-compose.mongo.railway.yml` — `mongo:7.0`, rs0 вручную (см. комментарии в файле и Start Command в UI).

```
MONGO_HOST=mongo.railway.internal
MONGO_REPLICA_SET=rs0
```

## MinIO отдельно

`docker-compose.minio.railway.yml` — передеплой minio/minio-setup без file-service.

**file-service (internal + presigned URL):**

```
S3_ENDPOINT=http://minio.railway.internal:9000
S3_PUBLIC_ENDPOINT=http://<minio-tcp-proxy>:<port>
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=files
S3_BUCKET_AVATAR=avatars
```

- `S3_ENDPOINT` — сервер → MinIO внутри Railway
- `S3_PUBLIC_ENDPOINT` — presigned URL для клиента (телефон/браузер). **Не** `minio.railway.internal` — снаружи ENOTFOUND

TCP Proxy minio (port **9000**), например: `http://zephyr.proxy.rlwy.net:38287`

После redeploy minio — **Redeploy minio-setup** (создаёт бакеты `files`, `avatars`).

### Проверка minio

1. **minio** → Deploy Logs — `API:` / `WebUI:` без crash.
2. **minio-setup** → Deploy Logs — без ошибок `mc alias` / `mc mb`.
3. Console: domain на port **9001**, логин `minioadmin` / `minioadmin`.

Shell в **minio**:

```bash
mc alias set local http://localhost:9000 minioadmin minioadmin
mc ls local
```

### 502 на публичном URL

- Port **9000** в браузере → 502 нормально (S3 API).
- Console → port **9001**.

## file-service

1. Импорт `docker-compose.railway.yml`
2. **Generate Domain**, port `3001`

## Связка с main-app

| Переменная | Значение |
|------------|----------|
| `RABBITMQ_URL` | `amqp://guest:guest@rabbitmq:5672` |
| `REDIS_HOST` | `redis` |
| `REDIS_PASSWORD` | пусто, если Redis без пароля |

## GitHub deploy

Root Directory: `file-service` — Variables из `docker-compose.railway.yml`.

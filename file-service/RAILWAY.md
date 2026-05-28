# Деплой file-service на Railway

## Файлы

| Файл | Назначение |
|------|------------|
| `docker-compose.mongo.railway.yml` | Только MongoDB — импорт отдельно, можно передеплоить без file-service |
| `docker-compose.railway.yml` | MinIO + file-service (переменные из `.env.development`) |

## Порядок импорта (один Railway-проект)

1. `main-app/docker-compose.railway.yml` — postgres, redis, rabbitmq, app
2. `file-service/docker-compose.mongo.railway.yml` — mongo
3. `file-service/docker-compose.railway.yml` — minio, file-service

## Mongo отдельно (replica set rs0)

`docker-compose.mongo.railway.yml` — custom Dockerfile (`docker/mongo-railway/`), потому что Railway **не применяет** `command: --replSet` к stock `mongo:7.0`.

Диагностика внешнего proxy (пример): если `rs.status()` → `not running with --replSet`, mongo поднят как standalone и file-service не подключится с `MONGO_REPLICA_SET=rs0`.

`file-service` Variables:

```
MONGO_HOST=mongo.railway.internal
MONGO_REPLICA_SET=rs0
```

Перед деплоем custom mongo: **удалите volume** у сервиса `mongo`.

## file-service

1. Перетащите **`docker-compose.railway.yml`** на canvas (без mongo).
2. Для **file-service**: **Settings → Networking → Generate Domain** (порт `3001`).
3. `minio-setup` — одноразовая задача; после успеха можно остановить.

## Связка с main-app

| Переменная | Значение |
|------------|----------|
| `RABBITMQ_URL` | `amqp://guest:guest@rabbitmq:5672` |
| `REDIS_HOST` | `redis` |
| `REDIS_PASSWORD` | пусто, если Redis без пароля на Railway |

## MinIO

- API внутри сети: `http://minio:9000`
- `S3_ENDPOINT` — только internal URL, не публичный domain

## Альтернатива: GitHub deploy

1. Root Directory: `file-service`
2. Variables из `docker-compose.railway.yml` → сервис `file-service`
3. Mongo — из `docker-compose.mongo.railway.yml` или Railway managed MongoDB

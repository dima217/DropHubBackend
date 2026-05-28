# Деплой file-service на Railway

## Файлы

| Файл | Назначение |
|------|------------|
| `docker-compose.mongo.railway.yml` | Только MongoDB (`mongo:7.0`), rs0 вручную |
| `docker-compose.railway.yml` | MinIO + file-service |

## Порядок импорта (один Railway-проект)

1. `main-app/docker-compose.railway.yml` — postgres, redis, rabbitmq, app
2. `file-service/docker-compose.mongo.railway.yml` — mongo
3. `file-service/docker-compose.railway.yml` — minio, file-service

## Mongo (`mongo:7.0`)

Образ как в локальном `docker-compose.yml`. Replica set **не создаётся автоматически** — один раз вручную после старта.

### 1. Деплой

- Импортируйте `docker-compose.mongo.railway.yml`
- При первом rs0 или смене конфига — **удалите volume** у mongo
- Если mongo стартует **без** `--replSet` (в логах нет replSet, `rs.status()` → `not running with --replSet`) — в Railway UI → mongo → **Settings → Start Command**:

```bash
/bin/bash -c "mkdir -p /data/mongo && echo 'mySuperSecretKey123' > /data/mongo/mongo-keyfile && chmod 600 /data/mongo/mongo-keyfile && exec mongod --replSet rs0 --auth --keyFile /data/mongo/mongo-keyfile --bind_ip_all"
```

### 2. Инициализация replica set (один раз)

Через Railway → mongo → **Shell** (или с машины через TCP Proxy):

```bash
mongosh -u admin -p password123 --authenticationDatabase admin
```

```javascript
rs.initiate({
  _id: 'rs0',
  members: [{ _id: 0, host: 'mongo.railway.internal:27017' }]
})
```

Проверка:

```javascript
rs.status().members[0].stateStr   // PRIMARY
```

### 3. file-service

Variables:

```
MONGO_HOST=mongo.railway.internal
MONGO_PORT=27017
MONGO_DATABASE=file-service
MONGO_USERNAME=admin
MONGO_PASSWORD=password123
MONGO_AUTH_SOURCE=admin
MONGO_REPLICA_SET=rs0
```

## file-service compose

1. Импорт `docker-compose.railway.yml`
2. **Generate Domain** для file-service (порт `3001`)

## Связка с main-app

| Переменная | Значение |
|------------|----------|
| `RABBITMQ_URL` | `amqp://guest:guest@rabbitmq:5672` |
| `REDIS_HOST` | `redis` |
| `REDIS_PASSWORD` | пусто, если Redis без пароля |

## MinIO

- MinIO internal: `S3_HOST=minio.railway.internal`, `S3_PORT=9000` (или `S3_ENDPOINT=http://minio.railway.internal:9000`)

# Docker Compose Setup

Этот docker-compose файл настраивает полное окружение для работы file-service с MinIO, MongoDB, Redis и RabbitMQ.

## Сервисы

- **file-service**: NestJS приложение (порт 3001)
- **mongo**: MongoDB 7.0 (порт 27017)
- **minio**: MinIO S3-совместимое хранилище
  - API: http://localhost:9000
  - Console: http://localhost:9001 (admin/minioadmin)
- **redis**: Redis 7 (порт 6379)
- **rabbitmq**: RabbitMQ с Management UI
  - AMQP: localhost:5672
  - Management UI: http://localhost:15672 (guest/guest)

## Запуск

```bash
# Запуск всех сервисов
docker-compose up -d

# Просмотр логов
docker-compose logs -f file-service

# Остановка
docker-compose down

# Остановка с удалением volumes
docker-compose down -v
```

## Проверка MinIO

1. Откройте консоль MinIO: http://localhost:9001
2. Войдите с учетными данными: `minioadmin` / `minioadmin`
3. Убедитесь, что бакет `files` создан автоматически

## Проверка приложения

После запуска приложение будет доступно на:
- HTTP API: http://localhost:3001

## Переменные окружения

Все переменные окружения настраиваются в `docker-compose.yml`. Для локальной разработки используйте `.env.example` как шаблон.

## Важные замечания

- MinIO использует `forcePathStyle: true`, что уже настроено в `s3.service.ts`
- S3 сервис автоматически определяет HTTP/HTTPS по endpoint
- MongoDB создается с пользователем `admin/password123` и базой `file-service`
- Все данные сохраняются в Docker volumes


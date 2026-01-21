# File Service Microservice

Микросервис для работы с файлами, хранилищем и комнатами.

## Архитектура

File Service обрабатывает:
- Метаданные файлов (MongoDB)
- Storage items (MongoDB)
- Rooms (MongoDB)
- S3/MinIO операции

## Коммуникация

- **Входящие команды**: через RabbitMQ очередь `file_service_queue`
- **Исходящие запросы**: проверка прав через RabbitMQ очередь `permission_service_queue`

## Команды RabbitMQ

### Входящие (от главного приложения):
- `file.create` - создание метаданных файла
- `file.getById` - получение файла по ID
- `file.getByRoom` - получение файлов комнаты
- `file.delete` - удаление файлов

### Исходящие (к главному приложению):
- `permission.verify` - проверка прав доступа

## Запуск

```bash
npm install
npm run start:dev
```

## Переменные окружения

```env
RABBITMQ_URL=amqp://localhost:5672
MONGO_URL=mongodb://localhost:27017/drop_hub_files
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=drop-hub-storage
PORT=3001
```


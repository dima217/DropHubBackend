# Use Case Diagram: полный чеклист

Этот документ нужен как сборочный список для **максимально полной** Use Case диаграммы по backend проекта DropHub.

## 1) Границы системы (System Boundary)

Сначала зафиксируй, что входит в диаграмму:

- Backend API (`main-app`)
- File microservice (`file-service`)
- Внешние зависимости:
  - S3/объектное хранилище
  - БД (PostgreSQL/Mongo, если используете обе)
  - Cache
  - Push/уведомления
  - Auth provider / JWT

Добавь отдельным решением:
- Делаете одну диаграмму на всю систему или 2 диаграммы (User-facing + Admin/Tech)?

## 2) Полный список акторов

Минимум для полной диаграммы:

- Гость (если есть публичные сценарии)
- Аутентифицированный пользователь
- Владелец хранилища
- Участник shared-доступа (read/write)
- Администратор системы
- Фоновый планировщик/cron (очистка, purge)
- Внешние системы:
  - S3
  - Push service
  - Token/Auth service

## 3) Use Cases верхнего уровня (обязательные группы)

## 3.1 Аутентификация и доступ

- Вход/валидация JWT
- Проверка прав на ресурс
- Выдача/отзыв прав
- Проверка shared scope

## 3.2 Хранилище (Storage)

- Получить хранилище пользователя
- Создать хранилище
- Получить структуру (`/storage/structure`)
- Получить full-tree
- Получить корзину (`/storage/trash`)
- Создать файл/папку
- Переименовать элемент
- Переместить элемент
- Копировать элемент
- Обновить теги
- Удалить (soft delete)
- Восстановить
- Удалить навсегда

## 3.3 Shared-доступ

- Получить shared items
- Получить участников shared item
- Выдать shared permission
- Отозвать shared permission
- Работать в shared scope (read/write сценарии)

## 3.4 Файлы (Download/Upload/Preview/Convert)

- Init upload
- Confirm upload
- Multipart upload (init/complete)
- Получить download links
- Скачать по токену
- Получить stream/preview/video thumbnail/video stream
- Конвертация файлов
- Удаление/истечение файлов

## 3.5 Поиск и фильтры

- Поиск по storage items
- Поиск по mime type / tags / creator

## 3.6 Уведомления/Push

- Уведомить о выдаче shared доступа
- (если есть) уведомления о других событиях

## 3.7 Админские сценарии

- Получить данные пользователя и его storages
- Восстановить удаленную структуру админом
- Массовые операции (batch move/copy/delete/restore/tags)

## 4) Для каждого Use Case собрать минимум атрибутов

На каждый UC зафиксируй:

- Актор(ы)
- Триггер (endpoint/команда)
- Предусловия (auth/role/resource ownership)
- Основной сценарий (happy path)
- Альтернативные ветки (например, shared scope)
- Ошибки/исключения (403/404/409/422/429)
- Постусловия (что изменилось в системе)
- Побочные эффекты (push, cache invalidation, audit, counters)

## 5) Связи между Use Cases (include/extend/generalization)

Отметь обязательные переиспользуемые под-сценарии:

- `<<include>>` Проверка аутентификации
- `<<include>>` Проверка прав доступа
- `<<include>>` Валидация входных данных
- `<<include>>` Проверка принадлежности ресурса storage
- `<<include>>` Обогащение metadata (fileMeta, counters)
- `<<extend>>` Работа через shared scope
- `<<extend>>` Batch вариант операции

## 6) Нефункциональные аспекты (лучше отдельными заметками)

Что важно для полной картины:

- Лимиты размера и quota enforcement
- Производительность и batch поведение
- Идемпотентность отдельных операций
- Консистентность счетчиков (`downloadCount`)
- Кэш и инвалидация
- Периодическая очистка/retention window

## 7) Данные/поля, которые нужно явно отразить в заметках к диаграмме

- `size` для файлов (в т.ч. в корзине)
- `downloadCount` (реальный инкремент)
- `sharedWith` для owner view
- `creator` для shared items
- `deletedAt`, `permanentDeleteAt`
- роли: `admin`, `write`, `read`

## 8) Вопросы, которые нужно закрыть перед финализацией диаграммы

- Нужны ли публичные/анонимные сценарии?
- Показывать ли внутренние микросервисные вызовы как отдельные UC?
- Нужен ли отдельный actor для cron/job?
- Включать ли технические UC (cache invalidation, s3 copy/delete)?
- Делать ли отдельный layer для admin endpoints?

## 9) Рекомендованная декомпозиция диаграмм (чтобы не было перегруза)

Сделай 3 диаграммы вместо одной гигантской:

1. **Core User Storage Use Cases**
2. **Shared + Permissions Use Cases**
3. **File Lifecycle (upload/download/preview/convert) + Admin**

И отдельной таблицей держи трассировку `Use Case -> endpoint -> сервис`.

## 10) Источники в коде, которые обязательно пройти

- `main-app/src/modules/storage/controllers`
- `main-app/src/modules/storage/services`
- `main-app/src/modules/permission/services`
- `main-app/src/modules/file/controllers`
- `main-app/src/modules/file-client/services`
- `file-service/src/modules/storage/services`
- `file-service/src/modules/file/services`
- `file-service/src/modules/storage/storage.controller.ts`
- `file-service/src/modules/file/file.controller.ts`

## 11) Definition of Done для "максимально полной" диаграммы

Диаграмма считается полной, когда:

- покрыты все actor-ы из раздела 2
- покрыты все группы UC из раздела 3
- на каждом UC есть precondition + postcondition
- все include/extend связи отмечены
- нет "технических черных дыр" (где данные меняются, но не описано как)
- есть трассировка на реальные endpoints/handlers


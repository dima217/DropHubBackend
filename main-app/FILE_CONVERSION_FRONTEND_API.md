# File Conversion API (Frontend Guide)

Документация для фронтенда по конвертации файлов в DropHub.

## Что делает API

Конвертация работает в режиме **save_as_new**:

- исходный файл не перезаписывается;
- результат сохраняется как **новый файл** в MinIO;
- новый файл автоматически привязывается:
  - к комнате (`room`) или
  - к хранилищу (`storage`).

---

## Доступные конвертации

`conversion` принимает одно из значений:

- `csv_to_json`
- `json_to_csv`
- `xml_to_json`
- `json_to_xml`
- `xlsx_to_json`
- `docx_to_pdf`
- `pdf_to_text`
- `pdf_to_images`
- `pptx_to_pdf`

---

## Авторизация

Все endpoints требуют Bearer JWT.

---

## Endpoints

## 1) Конвертация файла комнаты

`POST /file/convert-room`

### Права
- `ROOM`: `ADMIN | READ | WRITE`

### Request body

```json
{
  "roomId": "67f130f46075c9e8bbd35e4d",
  "fileId": "67f130f46075c9e8bbd35e53",
  "conversion": "docx_to_pdf"
}
```

---

## 2) Конвертация файла storage

`POST /file/convert-storage`

### Права
- `STORAGE`: `ADMIN | READ | WRITE`

### Request body

```json
{
  "storageId": "67f130f46075c9e8bbd35e4e",
  "fileId": "67f130f46075c9e8bbd35e53",
  "parentId": "67f130f46075c9e8bbd35e4f",
  "conversion": "pdf_to_images"
}
```

`parentId` опционален. Если не передан, будет использована папка исходного файла.

---

## 3) Legacy endpoint

`POST /file/convert`

Поддержан для обратной совместимости. Рекомендуется использовать `convert-room` / `convert-storage`.

---

## Response format (успех)

```json
{
  "success": true,
  "conversion": "pdf_to_images",
  "sourceFileId": "67f130f46075c9e8bbd35e53",
  "sourceChecksum": "9f0f3f5a...",
  "targetType": "storage",
  "targetId": "67f130f46075c9e8bbd35e4e",
  "createdFiles": [
    {
      "fileId": "67f130f46075c9e8bbd35eaa",
      "fileName": "report-page-1.png",
      "mimeType": "image/png",
      "size": 245121
    },
    {
      "fileId": "67f130f46075c9e8bbd35eab",
      "fileName": "report-page-2.png",
      "mimeType": "image/png",
      "size": 240442
    }
  ]
}
```

### Поля

- `sourceFileId` — исходный файл.
- `sourceChecksum` — sha256 исходного контента.
- `targetType` — `room` или `storage`.
- `targetId` — ID комнаты/хранилища, куда сохранен результат.
- `createdFiles` — массив созданных файлов (для `pdf_to_images` их может быть несколько).

---

## Ошибки

Типовые коды:

- `400 Bad Request`
  - невалидный `conversion`
  - переданы одновременно `roomId` и `storageId`
  - не передан ни `roomId`, ни `storageId`
  - исходный файл не принадлежит target-контексту
  - на сервере нет нужного бинарника (`soffice`, `pdftoppm`)
- `401 Unauthorized` — отсутствует/просрочен токен
- `403 Forbidden` — недостаточно прав
- `404 Not Found` — файл или room/storage не найдены

---

## Рекомендации для UI

- После успеха обновлять список файлов в текущем контексте (`room`/`storage`).
- Показывать тост:
  - одиночный результат: `Файл сконвертирован и сохранен`
  - множественный (`pdf_to_images`): `Создано N файлов`
- Для long-running конвертаций:
  - показывать loading state на кнопке;
  - блокировать повторный запуск, пока предыдущий не завершен.

---

## Пример использования (TypeScript)

```ts
type ConversionType =
  | 'csv_to_json'
  | 'json_to_csv'
  | 'xml_to_json'
  | 'json_to_xml'
  | 'xlsx_to_json'
  | 'docx_to_pdf'
  | 'pdf_to_text'
  | 'pdf_to_images'
  | 'pptx_to_pdf';

async function convertRoomFile(
  token: string,
  roomId: string,
  fileId: string,
  conversion: ConversionType,
) {
  const res = await fetch('/file/convert-room', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ roomId, fileId, conversion }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? `Convert failed (${res.status})`);
  }

  return res.json();
}
```

---

## Ограничения окружения

Для части конвертаций на backend должны быть установлены системные утилиты:

- `soffice` (LibreOffice) для:
  - `docx_to_pdf`
  - `pptx_to_pdf`
- `pdftoppm` (poppler) для:
  - `pdf_to_images`

Если бинарник отсутствует, API вернет `400` с описанием проблемы.

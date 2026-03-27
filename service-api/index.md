# Databird API для работы с каталогом

## Общая информация

- **Base URL:** `https://app.databird.ru/api`
- **Базовый префикс проектных методов:** `/projects/{projectId}`
- **Авторизация:** JWT Bearer token в заголовке:
  ```http
  Authorization: Bearer <token>
  ```
- **Получение токена:** `POST /login`
- **Срок жизни токена:** 24 часа

---

## Авторизация

### `POST /login`
Авторизация по логину/паролю, получение токена.

**Request body**
```json
{
  "username": "user@example.com",
  "password": "your_password"
}
```

**Response**
```json
{
  "accessToken": "eyJ....",
  "refreshToken": "eyJ...."
}
```

---

## 1) Чтение каталога (master data)

> Все эндпоинты ниже: `/api/projects/{projectId}/...`

### `POST /products/search`
Поиск/получение списка товаров каталога (master data), с пагинацией.

**Query params**
- `current` — номер страницы
- `pageSize` — размер страницы (по умолчанию 100)

**Request body (пример)**
```json
{
  "text": "кроссовки",
  "filters": [],
  "selected": [],
  "tabId": "optional_tab_id"
}
```

**Response (пример)**
```json
{
  "data": [
    {
      "_id": "65...",
      "productId": "SKU-001",
      "attributes": {
        "ID товара": "SKU-001",
        "Название": "Кроссовки",
        "Категория": "Обувь"
      },
      "tabs": {
        "tabId": {
          "name": "..."
        }
      }
    }
  ]
}
```

---

### `POST /products/count`
Количество товаров по фильтру.

**Query params**
- `current`
- `pageSize`

**Request body** — как у `/products/search`.

**Response**
```json
{
  "count": 12345
}
```

---

### `GET /products/{productId}`
Получение карточки товара по внутреннему `_id`.

**Response:** полный объект товара (master + `tabs`), если есть.

---

### `POST /products/attributes`
Получение списка атрибутов в выборке товаров.

**Query params**
- `tabId` (optional) — если передан, список атрибутов будет по вкладке; иначе по master data.

**Request body** — фильтр как у `/products/search`.

**Response**
```json
["Название", "Категория", "Цена"]
```

---

## 2) Обновление master data каталога

### `POST /products/{productId}/attributes`
Обновление одного атрибута в master data товара.

**Request body**
```json
{
  "key": "Название",
  "value": "Новое название товара"
}
```

**Response:** `200 OK`

---

### `DELETE /products/{productId}/attributes/{key}`
Удаление атрибута из master data товара.

**Response:** `200 OK`

---

### `POST /products`
Создание нового товара в каталоге.

**Request body**
```json
{
  "productId": "SKU-NEW-001",
  "categoryName": "Электроника"
}
```

**Response**
```json
{
  "_id": "65..."
}
```

**Ошибки**
- `409 Duplicate productId`

---

### `DELETE /products`
Массовое удаление товаров.

**Request body**
```json
{
  "selectList": ["65...", "65..."],
  "search": {
    "text": "",
    "filters": []
  }
}
```

- `selectList = "ALL"` — удалить все товары, попавшие под `search`.

---

## 3) Обновление данных вкладок (tab data)

### `POST /products/{productId}/{tabId}/attributes`
Обновление одного атрибута товара в конкретной вкладке.

**Request body**
```json
{
  "key": "Название",
  "value": "Название для маркетплейса"
}
```

**Response:** `200 OK`

---

## 4) Операции по вкладкам (справочно)

### `GET /tabs`
Список вкладок проекта.

### `GET /tabs/{tabId}`
Детали вкладки.

### `POST /tabs`
Создать вкладку.

**Request body**
```json
{
  "name": "Ozon вкладка",
  "feedId": "65...",
  "feedType": "OZON"
}
```

### `PATCH /tabs/{tabId}`
Переименовать вкладку.

**Request body**
```json
{
  "name": "Новое имя вкладки"
}
```

### `DELETE /tabs/{tabId}`
Удалить вкладку.

---

## 5) Массовое обновление каталога через Excel

### `POST /uploadProductsFromXls`
Загрузка XLSX для массового обновления:
- master data (`tabId` пустой),
- либо конкретной вкладки (`tabId` заполнен).

**FormData**
- `file`: xlsx-файл
- `tabId`: `""` или ID вкладки

**Response**
- объект состояния задачи/результата синхронизации (асинхронная обработка).

---

### `POST /saveProductsToXls`
Выгрузка текущей выборки в XLSX.

**Request body**
```json
{
  "search": {
    "text": "",
    "filters": [],
    "selected": []
  },
  "tabId": "optional_tab_id"
}
```

**Response**
- бинарный `.xlsx` (или JSON со статусом задачи).

---

## 6) Синхронизация данных по вкладкам

### `POST /products-sync/start`
Запуск синхронизации товаров по вкладкам.

**Request body (минимум)**
```json
{
  "taskToken": "sync/any-unique-token"
}
```

### `POST /products-sync/cancel`
Остановка синхронизации.

**Request body**
```json
{
  "taskToken": "sync/any-unique-token"
}
```

---

## 7) Контроль фоновых задач

### `POST /task/state`
Проверка статуса задачи.

**Request body**
```json
{
  "taskToken": "sync/any-unique-token"
}
```

### `POST /task/cancel`
Отмена задачи.

**Request body**
```json
{
  "taskToken": "sync/any-unique-token"
}
```

---

## Примеры cURL

### Обновить master-атрибут товара
```bash
curl -X POST "https://app.databird.ru/api/projects/{projectId}/products/{productId}/attributes" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"key":"Название","value":"Новое название"}'
```

### Обновить атрибут во вкладке
```bash
curl -X POST "https://app.databird.ru/api/projects/{projectId}/products/{productId}/{tabId}/attributes" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"key":"Название","value":"Название для вкладки"}'
```

### Прочитать список товаров
```bash
curl -X POST "https://app.databird.ru/api/projects/{projectId}/products/search?current=1&pageSize=50" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"text":"","filters":[]}'
```

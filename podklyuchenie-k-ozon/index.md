---
layout: default
title: 
---

# Подключение к Ozon

Для подключения маркетплейса Ozon к сервису Databird нужно заполнить 2 обязательных поля: “ID клиента в OZON” и “Ozon токен”.

![Untitled](./Untitled.png)

🧩 Их значения можно посмотреть в настройках кабинета Ozon:     [https://seller.ozon.ru/app/settings/api-keys?currentTab=sellerApi](https://seller.ozon.ru/app/settings/api-keys?currentTab=sellerApi)

1. Заходим в личный кабинет поставщика
2. Открываем «Настройки» и выбираем раздел API-ключи
3. В открывшемся окне сразу копируем “Client ID”, это ваш “**ID клиента в OZON**”
4. Далее во вкладке «Seller API» нажимаем «Сгенерировать ключ»

![Untitled](./Untitled%201.png)

1. В открывшемся боковом меню выбираем токен Admin (он в самом низу списка)

![Untitled](./Untitled%202.png)

1. Даём ключу любое имя, например - “Датаберд”. Нажимаем «Сгенерировать»
2. Копируем появившийся ключ в поле “**Ozon токен**”

## Необходимые разрешения для токена Озон

### Для импорта карточек из Озон (включая цены и остатки)

- v4/product/info/attributes
- v3/product/info/list
- v3/product/list
- v1/product/info/stocks-by-warehouse/fbs
- /v1/analytics/stocks
- v4/product/info/stocks

### Для зкспорта карточек на Озон

- v1/product/import/info
- v3/product/import
- v1/product/unarchive

### Для экспорта цен

- v1/product/import/prices

### Для экспорта остатков

- v1/warehouse/list
- v2/products/stocks

### Для управления акциями

- v1/actions/products/activate
- v1/actions/products/deactivate
- v1/actions/candidates
- v1/actions/products
- v3/product/list
- v1/actions


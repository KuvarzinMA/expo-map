# Приложение с картой, изображениями и локальной БД (Expo SDK 52)

React Native + Expo Router + TypeScript + SQLite (`expo-sqlite`). Маркеры и изображения сохраняются в локальной базе данных и не пропадают после перезапуска.

## Установка

```bash
npm install
npx expo install --fix   # выровняет версии пакетов под SDK 52
npx expo start
```

Отсканируйте QR-код в Expo Go. Нужна версия Expo Go, поддерживающая SDK 52 (на Android её можно скачать на https://expo.dev/go; для iOS — симулятор или development build).

Проверка типов: `npm run typecheck`.

Web (`npm run web`): карта строится на Leaflet, а база данных — это SQLite в браузере через sql.js (WebAssembly). Файлы sql.js лежат в `public/sqljs/`; данные сохраняются в `localStorage` браузера. В SDK 52 у `expo-sqlite` нет реализации для web, поэтому на web используется этот адаптер; на Android/iOS работает `expo-sqlite`. Код приложения одинаков для обеих платформ.

## Структура

```
app/_layout.tsx            Навигация, DatabaseProvider, экран загрузки/ошибки БД
app/index.tsx              Экран карты
app/marker/[id].tsx        Экран деталей маркера
components/                Map, Map.web, MarkerList, ImageList
contexts/DatabaseContext.tsx  Контекст БД: соединение, CRUD, статусы
database/schema.ts         Открытие БД и инициализация
database/types.ts          Интерфейс соединения DatabaseHandle
database/open.ts           Android/iOS: соединение через expo-sqlite
database/open.web.ts       Web: загрузка sql.js
database/webSqlite.ts      Web: адаптер sql.js -> DatabaseHandle, сохранение в localStorage
public/sqljs/              Файлы sql.js для web
database/migrations/       Версии схемы (PRAGMA user_version)
database/operations.ts     SQL-операции (слой доступа к данным)
database/errors.ts         Типы ошибок БД и сообщения для пользователя
types.ts                   Интерфейсы TypeScript
utils/                     Диалоги (Alert / window.confirm), форматирование
```

Слои: **UI** (экраны, компоненты) → **контекст** (`useDatabase`) → **операции** (`operations.ts`, чистый SQL) → **DatabaseHandle** (expo-sqlite на устройстве, sql.js в браузере). Компоненты не содержат SQL.

## Схема базы данных

Файл БД: `markers.db`.

```sql
CREATE TABLE markers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE marker_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    marker_id INTEGER NOT NULL,
    uri TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (marker_id) REFERENCES markers (id) ON DELETE CASCADE
);
```

Связь «один ко многим»: у маркера может быть много изображений. Для быстрой выборки по маркеру добавлен индекс `idx_marker_images_marker_id`. При каждом открытии соединения выполняется `PRAGMA foreign_keys = ON`, иначе SQLite не применяет `ON DELETE CASCADE`.

Количество изображений маркера считается запросом с `LEFT JOIN ... COUNT`, поэтому для списка маркеров не нужно отдельно загружать все картинки.

### Версии базы данных

Версия хранится в `PRAGMA user_version`. Список миграций — `database/migrations/index.ts`. При запуске применяются только ещё не выполненные миграции, каждая в своей транзакции (при сбое откатывается, версия не меняется). Чтобы изменить схему, добавьте миграцию с номером на 1 больше. Если версия БД новее версии приложения, приложение сообщает об этом и не портит данные.

## Контекст `DatabaseContext`

Предоставляет `addMarker`, `deleteMarker`, `getMarkers`, `addImage`, `deleteImage`, `getMarkerImages`, а также `getMarker`, `addImages` (несколько картинок атомарно), статусы `isLoading`, `error` и `retry`. Поле `revision` увеличивается после каждого изменения данных: экраны перечитывают БД, когда оно меняется. Соединение закрывается при размонтировании провайдера.

## Обработка ошибок

Все ошибки приводятся к `DatabaseError` с кодом:

| Код | Когда возникает |
|---|---|
| `CONNECTION` | не удалось открыть БД или БД не открыта |
| `INIT` | ошибка инициализации или миграции |
| `VERSION` | версия БД новее версии приложения |
| `TRANSACTION` | сбой внутри транзакции (она откатывается) |
| `CONSTRAINT` | нарушение ограничений (например, изображение для несуществующего маркера) |
| `QUERY` | прочие ошибки запросов |

- **Инициализация:** пока БД готовится, показывается экран загрузки; при ошибке — экран с описанием и кнопкой «Повторить» (стратегия восстановления: соединение закрывается и открывается заново).
- **Транзакции:** удаление маркера (изображения + маркер) и добавление нескольких изображений выполняются в `withTransactionAsync`: операция проходит целиком или не проходит вовсе.
- **Ограничения:** внешний ключ включён, нарушения распознаются и превращаются в понятное сообщение.
- **UI:** любая операция в экранах обёрнута в `try/catch`, пользователь видит сообщение через `errorMessage(e)`, приложение не падает.
- **Очистка ресурсов:** `useEffect` закрывает соединение и отменяет обновление состояния после размонтирования.
- **Логирование:** в режиме разработки (`__DEV__`) каждая операция пишет в консоль `[DB]` название и время выполнения, ошибки логируются всегда.

## Дополнительные возможности

Не реализовывались (по желанию): ORM, полнотекстовый поиск, резервное копирование, экспорт/импорт. ORM не используется: применяется прямой SQL через `expo-sqlite`.

## Известные ограничения

- В БД хранится URI изображения, а не сам файл. Для файлов из кэша picker'а система может их удалить; тогда в списке показывается значок-заглушка.
- Название маркера в БД не хранится, в интерфейсе используется «Маркер {id}».
- На web база хранится в `localStorage` (лимит браузера около 5 МБ), на устройстве — в файле SQLite.
- На web повреждённая сохранённая копия БД отбрасывается и создаётся новая (стратегия восстановления).

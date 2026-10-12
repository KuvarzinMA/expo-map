# Приложение с картой и изображениями (Expo SDK 52)

React Native + Expo Router + TypeScript. Пользователь добавляет маркеры на карту долгим нажатием, открывает экран маркера и прикрепляет к нему изображения из галереи.

## Установка

```bash
npm install
npx expo install --fix   # выровняет версии пакетов под SDK 52
npx expo start
```

Отсканируйте QR-код в Expo Go. **Важно:** приложение написано под SDK 52, поэтому нужна версия Expo Go, поддерживающая SDK 52 (на Android её можно скачать на https://expo.dev/go; в App Store обычно доступна только последняя версия — для iOS используйте симулятор или development build).

Проверка типов: `npm run typecheck`.

Проект проверен: `tsc --noEmit` проходит, `expo export` успешно собирает бандлы для Android, iOS и web, `expo install --check` не находит расхождений версий.

В браузере (`npm run web`) карта строится на Leaflet + OpenStreetMap (`components/Map.web.tsx`), потому что `react-native-maps` не поддерживает web. Маркер добавляется долгим нажатием или правым кликом. Для web-карты нужен интернет (тайлы OSM).

## Структура

```
app/_layout.tsx        Stack-навигация, провайдер состояния, ErrorBoundary
app/index.tsx          Экран карты
app/marker/[id].tsx    Экран деталей маркера
components/Map.tsx     Карта, маркеры, загрузка/ошибка/повтор
components/Map.web.tsx Карта для web (Leaflet)
components/MarkerList.tsx  Горизонтальный список маркеров поверх карты
components/ImageList.tsx   Сетка изображений, удаление, предпросмотр
context/MarkersContext.tsx Состояние маркеров и изображений
types.ts               Интерфейсы TypeScript
```

## Принятые решения

- **Состояние** хранится в React Context (`MarkersProvider`), так как оба экрана должны видеть одни и те же маркеры. В маршрут передаётся только `id`.
- **Типы** (`types.ts`): `Coordinates`, `MarkerImage`, `MarkerData`, `MarkerRouteParams`, `RootParamList`.
- **Обработка ошибок:**
  - карта: индикатор загрузки, при отсутствии `onMapReady` за 15 секунд — сообщение и кнопка «Повторить»;
  - выбор изображений: `try/catch`, проверка разрешений, обработка отмены;
  - навигация: `try/catch` вокруг `router.push/back`, экран «Маркер не найден», `ErrorBoundary` expo-router;
  - битые изображения в списке заменяются иконкой.
- Для `expo-image-picker` не указан `mediaTypes` — по умолчанию выбираются только изображения (работает и без устаревшего `MediaTypeOptions`).

## Дополнительные функции

- Выбор нескольких изображений за раз
- Полноэкранный предпросмотр изображения
- Список маркеров поверх карты с количеством фото
- Подтверждение удаления изображения и маркера

## Известные ограничения

- Данные хранятся только в памяти и пропадают при перезапуске приложения (можно добавить `@react-native-async-storage/async-storage`).
- URI изображений указывают на файлы в галерее/кэше picker'а; если файл удалят из системы, отобразится заглушка.
- В Expo Go на Android карта использует Google Maps, на iOS — Apple Maps.

/** Географические координаты. */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** Маркер на карте (строка таблицы `markers`). */
export interface Marker {
  id: number;
  latitude: number;
  longitude: number;
  /** Время создания, мс (из столбца created_at). */
  createdAt: number;
  /** Количество изображений (считается запросом с JOIN). */
  imageCount: number;
}

/** Изображение маркера (строка таблицы `marker_images`). */
export interface MarkerImage {
  id: number;
  markerId: number;
  uri: string;
  createdAt: number;
}

/** Параметры маршрута `app/marker/[id].tsx` (в адресе id — строка). */
export interface MarkerRouteParams {
  id: string;
  [key: string]: string;
}

/** Параметры навигации приложения (путь -> параметры). */
export type RootParamList = {
  '/': undefined;
  '/marker/[id]': MarkerRouteParams;
};

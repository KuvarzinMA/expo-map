/** Географические координаты. */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** Изображение, привязанное к маркеру. */
export interface MarkerImage {
  id: string;
  uri: string;
  addedAt: number;
}

/** Данные маркера на карте. */
export interface MarkerData extends Coordinates {
  id: string;
  title: string;
  createdAt: number;
  images: MarkerImage[];
}

/** Параметры маршрута `app/marker/[id].tsx`. */
export interface MarkerRouteParams {
  id: string;
  [key: string]: string;
}

/** Параметры навигации приложения (путь -> параметры). */
export type RootParamList = {
  '/': undefined;
  '/marker/[id]': MarkerRouteParams;
};

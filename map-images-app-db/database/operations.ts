import type { DatabaseHandle } from './types';
import { DatabaseErrorCode, toDatabaseError } from './errors';
import { Marker, MarkerImage } from '../types';

// ---------- служебное ----------

const log = (...args: unknown[]) => {
  if (__DEV__) console.log('[DB]', ...args);
};

/** Логирует операцию (в dev-режиме) и приводит ошибки к DatabaseError. */
async function tracked<T>(
  name: string,
  fn: () => Promise<T>,
  code: DatabaseErrorCode = 'QUERY'
): Promise<T> {
  const started = Date.now();
  try {
    const result = await fn();
    log(`${name} ок (${Date.now() - started} мс)`);
    return result;
  } catch (e) {
    const err = toDatabaseError(e, code);
    console.error(`[DB] ${name} ошибка [${err.code}]:`, err.message);
    throw err;
  }
}

// SQLite хранит CURRENT_TIMESTAMP как 'YYYY-MM-DD HH:MM:SS' в UTC.
const toTimestamp = (value: string | null): number => {
  if (!value) return 0;
  const t = Date.parse(value.replace(' ', 'T') + 'Z');
  return Number.isNaN(t) ? 0 : t;
};

interface MarkerRow {
  id: number;
  latitude: number;
  longitude: number;
  created_at: string | null;
  image_count: number;
}

interface ImageRow {
  id: number;
  marker_id: number;
  uri: string;
  created_at: string | null;
}

const mapMarker = (r: MarkerRow): Marker => ({
  id: r.id,
  latitude: r.latitude,
  longitude: r.longitude,
  createdAt: toTimestamp(r.created_at),
  imageCount: r.image_count,
});

const mapImage = (r: ImageRow): MarkerImage => ({
  id: r.id,
  markerId: r.marker_id,
  uri: r.uri,
  createdAt: toTimestamp(r.created_at),
});

const MARKERS_SELECT = `
  SELECT m.id, m.latitude, m.longitude, m.created_at,
         COUNT(i.id) AS image_count
  FROM markers m
  LEFT JOIN marker_images i ON i.marker_id = m.id`;

// ---------- маркеры ----------

export function addMarker(
  db: DatabaseHandle,
  latitude: number,
  longitude: number
): Promise<number> {
  return tracked('addMarker', async () => {
    const result = await db.runAsync(
      'INSERT INTO markers (latitude, longitude) VALUES (?, ?)',
      [latitude, longitude]
    );
    return result.lastInsertRowId;
  });
}

/** Удаляет маркер и его изображения в одной транзакции. */
export function deleteMarker(db: DatabaseHandle, id: number): Promise<void> {
  return tracked(
    'deleteMarker',
    () =>
      db.withTransactionAsync(async () => {
        await db.runAsync('DELETE FROM marker_images WHERE marker_id = ?', [id]);
        await db.runAsync('DELETE FROM markers WHERE id = ?', [id]);
      }),
    'TRANSACTION'
  );
}

export function getMarkers(db: DatabaseHandle): Promise<Marker[]> {
  return tracked('getMarkers', async () => {
    const rows = await db.getAllAsync<MarkerRow>(
      `${MARKERS_SELECT} GROUP BY m.id ORDER BY m.id`
    );
    return rows.map(mapMarker);
  });
}

export function getMarker(
  db: DatabaseHandle,
  id: number
): Promise<Marker | null> {
  return tracked('getMarker', async () => {
    const row = await db.getFirstAsync<MarkerRow>(
      `${MARKERS_SELECT} WHERE m.id = ? GROUP BY m.id`,
      [id]
    );
    return row ? mapMarker(row) : null;
  });
}

// ---------- изображения ----------

export function addImage(
  db: DatabaseHandle,
  markerId: number,
  uri: string
): Promise<void> {
  return tracked('addImage', async () => {
    await db.runAsync(
      'INSERT INTO marker_images (marker_id, uri) VALUES (?, ?)',
      [markerId, uri]
    );
  });
}

/** Добавляет несколько изображений атомарно: либо все, либо ни одного. */
export function addImages(
  db: DatabaseHandle,
  markerId: number,
  uris: string[]
): Promise<void> {
  return tracked(
    'addImages',
    () =>
      db.withTransactionAsync(async () => {
        for (const uri of uris) {
          await db.runAsync(
            'INSERT INTO marker_images (marker_id, uri) VALUES (?, ?)',
            [markerId, uri]
          );
        }
      }),
    'TRANSACTION'
  );
}

export function deleteImage(db: DatabaseHandle, id: number): Promise<void> {
  return tracked('deleteImage', async () => {
    await db.runAsync('DELETE FROM marker_images WHERE id = ?', [id]);
  });
}

export function getMarkerImages(
  db: DatabaseHandle,
  markerId: number
): Promise<MarkerImage[]> {
  return tracked('getMarkerImages', async () => {
    const rows = await db.getAllAsync<ImageRow>(
      'SELECT id, marker_id, uri, created_at FROM marker_images WHERE marker_id = ? ORDER BY id',
      [markerId]
    );
    return rows.map(mapImage);
  });
}

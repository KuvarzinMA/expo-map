import type { DatabaseHandle } from '../types';
import { DatabaseError } from '../errors';

/**
 * Версионирование схемы через PRAGMA user_version.
 * Чтобы изменить схему, добавьте новую миграцию с version = предыдущая + 1.
 */
export interface Migration {
  version: number;
  description: string;
  up: string[];
}

export const migrations: Migration[] = [
  {
    version: 1,
    description: 'Создание таблиц markers и marker_images',
    up: [
      `CREATE TABLE IF NOT EXISTS markers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS marker_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        marker_id INTEGER NOT NULL,
        uri TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (marker_id) REFERENCES markers (id) ON DELETE CASCADE
      );`,
      `CREATE INDEX IF NOT EXISTS idx_marker_images_marker_id
        ON marker_images (marker_id);`,
    ],
  },
];

export const LATEST_VERSION = migrations[migrations.length - 1].version;

const log = (...args: unknown[]) => {
  if (__DEV__) console.log('[DB]', ...args);
};

/** Применяет все ещё не выполненные миграции, каждую в своей транзакции. */
export async function migrateDatabase(db: DatabaseHandle): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );
  const current = row?.user_version ?? 0;
  log(`версия БД: ${current}, актуальная: ${LATEST_VERSION}`);

  if (current > LATEST_VERSION) {
    throw new DatabaseError(
      'VERSION',
      `Версия БД (${current}) новее версии приложения (${LATEST_VERSION})`
    );
  }

  for (const m of migrations.filter((x) => x.version > current)) {
    log(`миграция ${m.version}: ${m.description}`);
    // Если любой шаг упадёт, транзакция откатится и версия не изменится.
    await db.withTransactionAsync(async () => {
      for (const sql of m.up) {
        await db.execAsync(sql);
      }
      await db.execAsync(`PRAGMA user_version = ${m.version}`);
    });
  }
}

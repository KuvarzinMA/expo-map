import { DatabaseError, toDatabaseError } from './errors';
import { migrateDatabase } from './migrations';
import { openDatabase } from './open';
import type { DatabaseHandle } from './types';

export const DB_NAME = 'markers.db';

/** Открывает соединение, включает внешние ключи и применяет миграции. */
export async function initDatabase(): Promise<DatabaseHandle> {
  let db: DatabaseHandle;
  try {
    db = await openDatabase(DB_NAME);
  } catch (e) {
    console.error('Не удалось открыть базу данных:', e);
    throw e instanceof DatabaseError
      ? e
      : new DatabaseError(
          'CONNECTION',
          e instanceof Error ? e.message : String(e),
          e
        );
  }

  try {
    // Без этого SQLite не применяет ON DELETE CASCADE и проверку FOREIGN KEY.
    await db.execAsync('PRAGMA foreign_keys = ON;');
    await migrateDatabase(db);
    return db;
  } catch (e) {
    console.error('Ошибка инициализации базы данных:', e);
    await db.closeAsync().catch(() => undefined);
    throw toDatabaseError(e, 'INIT');
  }
}

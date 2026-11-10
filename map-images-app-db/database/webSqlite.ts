import type { DatabaseHandle, RunResult } from './types';

// Минимальные типы sql.js (чтобы не тянуть пакет в зависимости приложения).
export interface SqlJsStatement {
  bind(params?: unknown[]): boolean;
  step(): boolean;
  getAsObject(): Record<string, unknown>;
  free(): boolean;
}
export interface SqlJsDatabase {
  run(sql: string, params?: unknown[]): unknown;
  exec(sql: string): { columns: string[]; values: unknown[][] }[];
  prepare(sql: string): SqlJsStatement;
  export(): Uint8Array;
  close(): void;
  getRowsModified(): number;
}
export interface SqlJsStatic {
  Database: new (data?: ArrayLike<number>) => SqlJsDatabase;
}
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
};

const fromBase64 = (text: string): Uint8Array => {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

/**
 * Реализация DatabaseHandle поверх sql.js (SQLite в WebAssembly).
 * Файл БД целиком сохраняется в storage (localStorage) после каждой записи.
 */
export function createWebDatabase(
  SQL: SqlJsStatic,
  storage: KeyValueStorage,
  name: string
): DatabaseHandle {
  const key = `sqlite:${name}`;

  let db: SqlJsDatabase;
  const stored = storage.getItem(key);
  try {
    db = new SQL.Database(stored ? fromBase64(stored) : undefined);
    db.exec('PRAGMA schema_version'); // проверка, что файл не повреждён
  } catch (e) {
    // Стратегия восстановления: повреждённую сохранённую копию отбрасываем.
    console.warn('[DB] сохранённая база повреждена, создаётся новая', e);
    storage.removeItem(key);
    db = new SQL.Database();
  }

  let depth = 0;
  let closed = false;

  const persist = () => {
    if (closed || depth > 0) return;
    try {
      storage.setItem(key, toBase64(db.export()));
    } catch (e) {
      console.warn('[DB] не удалось сохранить базу в localStorage', e);
    } finally {
      // db.export() в sql.js сбрасывает PRAGMA foreign_keys.
      db.run('PRAGMA foreign_keys = ON');
    }
  };

  const rows = <T,>(sql: string, params?: unknown[]): T[] => {
    const stmt = db.prepare(sql);
    try {
      if (params && params.length > 0) stmt.bind(params);
      const result: T[] = [];
      while (stmt.step()) result.push(stmt.getAsObject() as T);
      return result;
    } finally {
      stmt.free();
    }
  };

  return {
    async execAsync(sql) {
      db.exec(sql);
      persist();
    },

    async runAsync(sql, params): Promise<RunResult> {
      db.run(sql, params && params.length > 0 ? params : undefined);
      const changes = db.getRowsModified();
      const idRow = db.exec('SELECT last_insert_rowid()');
      const lastInsertRowId = Number(idRow[0]?.values[0]?.[0] ?? 0);
      persist();
      return { lastInsertRowId, changes };
    },

    async getAllAsync<T>(sql: string, params?: unknown[]) {
      return rows<T>(sql, params);
    },

    async getFirstAsync<T>(sql: string, params?: unknown[]) {
      return rows<T>(sql, params)[0] ?? null;
    },

    async withTransactionAsync(task) {
      if (depth > 0) {
        await task(); // вложенный вызов выполняется в рамках внешней транзакции
        return;
      }
      db.run('BEGIN');
      depth = 1;
      try {
        await task();
        db.run('COMMIT');
      } catch (e) {
        try {
          db.run('ROLLBACK');
        } catch {
          /* транзакция уже закрыта */
        }
        throw e;
      } finally {
        depth = 0;
      }
      persist();
    },

    async closeAsync() {
      if (closed) return;
      persist();
      closed = true;
      db.close();
    },
  };
}

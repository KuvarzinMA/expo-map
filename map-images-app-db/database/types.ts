/** Результат INSERT/UPDATE/DELETE. */
export interface RunResult {
  lastInsertRowId: number;
  changes: number;
}

/**
 * Минимальный интерфейс соединения с БД.
 * На Android/iOS его реализует expo-sqlite (database/open.ts),
 * в браузере — SQLite через sql.js (database/open.web.ts).
 */
export interface DatabaseHandle {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: unknown[]): Promise<RunResult>;
  getAllAsync<T>(sql: string, params?: unknown[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: unknown[]): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
  closeAsync(): Promise<void>;
}

import { openDatabaseAsync, type SQLiteBindValue } from 'expo-sqlite';
import type { DatabaseHandle } from './types';

/** Android/iOS: соединение через expo-sqlite. */
export async function openDatabase(name: string): Promise<DatabaseHandle> {
  const db = await openDatabaseAsync(name);
  const bind = (p?: unknown[]) => (p ?? []) as SQLiteBindValue[];

  return {
    execAsync: (sql) => db.execAsync(sql),
    runAsync: async (sql, params) => {
      const r = await db.runAsync(sql, bind(params));
      return { lastInsertRowId: r.lastInsertRowId, changes: r.changes };
    },
    getAllAsync: <T,>(sql: string, params?: unknown[]) =>
      db.getAllAsync<T>(sql, bind(params)),
    getFirstAsync: <T,>(sql: string, params?: unknown[]) =>
      db.getFirstAsync<T>(sql, bind(params)),
    withTransactionAsync: (task) => db.withTransactionAsync(task),
    closeAsync: () => db.closeAsync(),
  };
}

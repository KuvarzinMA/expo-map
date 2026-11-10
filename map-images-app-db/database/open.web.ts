import { DatabaseError } from './errors';
import type { DatabaseHandle } from './types';
import { createWebDatabase, SqlJsStatic } from './webSqlite';

// Файлы sql.js лежат в public/sqljs и раздаются Expo как статика.
const BASE_URL = '/sqljs/';

declare global {
  interface Window {
    initSqlJs?: (config: {
      locateFile: (file: string) => string;
    }) => Promise<SqlJsStatic>;
  }
}

let sqlPromise: Promise<SqlJsStatic> | null = null;

function loadSqlJs(): Promise<SqlJsStatic> {
  if (!sqlPromise) {
    sqlPromise = new Promise<void>((resolve, reject) => {
      if (window.initSqlJs) return resolve();
      const script = document.createElement('script');
      script.src = `${BASE_URL}sql-wasm.js`;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Не удалось загрузить sql-wasm.js'));
      document.head.appendChild(script);
    })
      .then(() =>
        window.initSqlJs!({ locateFile: (file) => `${BASE_URL}${file}` })
      )
      .catch((e) => {
        sqlPromise = null; // позволяем повторить попытку
        throw e;
      });
  }
  return sqlPromise;
}

/** Web: SQLite через sql.js, данные хранятся в localStorage. */
export async function openDatabase(name: string): Promise<DatabaseHandle> {
  try {
    const SQL = await loadSqlJs();
    return createWebDatabase(SQL, window.localStorage, name);
  } catch (e) {
    throw new DatabaseError(
      'CONNECTION',
      e instanceof Error ? e.message : String(e),
      e
    );
  }
}

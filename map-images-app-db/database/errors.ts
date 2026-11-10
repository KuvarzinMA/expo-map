/** Категории ошибок базы данных. */
export type DatabaseErrorCode =
  | 'CONNECTION' // не удалось открыть/использовать соединение
  | 'INIT' // ошибка инициализации или миграции
  | 'VERSION' // версия БД новее, чем знает приложение
  | 'TRANSACTION' // ошибка внутри транзакции
  | 'CONSTRAINT' // нарушение ограничений (FOREIGN KEY, NOT NULL и т.д.)
  | 'QUERY'; // любая другая ошибка запроса

export class DatabaseError extends Error {
  readonly code: DatabaseErrorCode;
  readonly original?: unknown;

  constructor(code: DatabaseErrorCode, message: string, original?: unknown) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.original = original;
  }
}

/** Приводит любую ошибку к DatabaseError, распознавая нарушения ограничений. */
export function toDatabaseError(
  e: unknown,
  fallback: DatabaseErrorCode
): DatabaseError {
  if (e instanceof DatabaseError) return e;
  const message = e instanceof Error ? e.message : String(e);
  const code: DatabaseErrorCode = /constraint/i.test(message)
    ? 'CONSTRAINT'
    : fallback;
  return new DatabaseError(code, message, e);
}

/** Понятное пользователю сообщение об ошибке. */
export function errorMessage(e: unknown): string {
  const err = e instanceof DatabaseError ? e : toDatabaseError(e, 'QUERY');
  switch (err.code) {
    case 'CONNECTION':
      return 'Нет соединения с базой данных. Попробуйте перезапустить приложение.';
    case 'INIT':
      return 'Не удалось подготовить базу данных.';
    case 'VERSION':
      return 'База данных создана более новой версией приложения.';
    case 'TRANSACTION':
      return 'Операция не выполнена и была отменена. Данные не изменились.';
    case 'CONSTRAINT':
      return 'Операция нарушает связи данных (например, маркер уже удалён).';
    default:
      return 'Ошибка при работе с базой данных.';
  }
}

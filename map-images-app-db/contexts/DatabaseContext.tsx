import type { DatabaseHandle } from '../database/types';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as ops from '../database/operations';
import { DatabaseError, toDatabaseError } from '../database/errors';
import { initDatabase } from '../database/schema';
import { Marker, MarkerImage } from '../types';

interface DatabaseContextType {
  // Операции с базой данных
  addMarker: (latitude: number, longitude: number) => Promise<number>;
  deleteMarker: (id: number) => Promise<void>;
  getMarkers: () => Promise<Marker[]>;
  getMarker: (id: number) => Promise<Marker | null>;
  addImage: (markerId: number, uri: string) => Promise<void>;
  addImages: (markerId: number, uris: string[]) => Promise<void>;
  deleteImage: (id: number) => Promise<void>;
  getMarkerImages: (markerId: number) => Promise<MarkerImage[]>;

  // Статусы
  isLoading: boolean;
  error: Error | null;
  /** Увеличивается после каждого изменения данных: по нему экраны перечитывают БД. */
  revision: number;
  /** Повторная попытка инициализации после ошибки. */
  retry: () => void;
}

const DatabaseContext = createContext<DatabaseContextType | null>(null);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DatabaseHandle | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [attempt, setAttempt] = useState(0);

  // Открытие соединения и очистка при размонтировании / повторной попытке.
  useEffect(() => {
    let cancelled = false;
    let opened: DatabaseHandle | null = null;

    setDb(null);
    setError(null);
    setIsLoading(true);

    initDatabase()
      .then((database) => {
        if (cancelled) {
          database.closeAsync().catch(() => undefined);
          return;
        }
        opened = database;
        setDb(database);
      })
      .catch((e) => {
        if (!cancelled) setError(toDatabaseError(e, 'INIT'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      opened?.closeAsync().catch(() => undefined);
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  const bump = useCallback(() => setRevision((r) => r + 1), []);

  const requireDb = useCallback((): DatabaseHandle => {
    if (!db) {
      throw new DatabaseError('CONNECTION', 'База данных не открыта');
    }
    return db;
  }, [db]);

  const value = useMemo<DatabaseContextType>(
    () => ({
      addMarker: async (latitude, longitude) => {
        const id = await ops.addMarker(requireDb(), latitude, longitude);
        bump();
        return id;
      },
      deleteMarker: async (id) => {
        await ops.deleteMarker(requireDb(), id);
        bump();
      },
      getMarkers: () => ops.getMarkers(requireDb()),
      getMarker: (id) => ops.getMarker(requireDb(), id),
      addImage: async (markerId, uri) => {
        await ops.addImage(requireDb(), markerId, uri);
        bump();
      },
      addImages: async (markerId, uris) => {
        await ops.addImages(requireDb(), markerId, uris);
        bump();
      },
      deleteImage: async (id) => {
        await ops.deleteImage(requireDb(), id);
        bump();
      },
      getMarkerImages: (markerId) => ops.getMarkerImages(requireDb(), markerId),
      isLoading,
      error,
      revision,
      retry,
    }),
    [requireDb, bump, isLoading, error, revision, retry]
  );

  return (
    <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>
  );
}

export function useDatabase(): DatabaseContextType {
  const ctx = useContext(DatabaseContext);
  if (!ctx) {
    throw new Error('useDatabase должен использоваться внутри <DatabaseProvider>');
  }
  return ctx;
}

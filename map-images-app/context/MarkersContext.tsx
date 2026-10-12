import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { Coordinates, MarkerData, MarkerImage } from '../types';

interface MarkersContextValue {
  markers: MarkerData[];
  addMarker: (coords: Coordinates) => MarkerData;
  removeMarker: (id: string) => void;
  getMarker: (id: string) => MarkerData | undefined;
  addImages: (markerId: string, uris: string[]) => void;
  removeImage: (markerId: string, imageId: string) => void;
}

const MarkersContext = createContext<MarkersContextValue | null>(null);

const createId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function MarkersProvider({ children }: { children: React.ReactNode }) {
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [counter, setCounter] = useState(1);

  const addMarker = useCallback(
    (coords: Coordinates) => {
      const marker: MarkerData = {
        id: createId(),
        title: `Маркер ${counter}`,
        latitude: coords.latitude,
        longitude: coords.longitude,
        createdAt: Date.now(),
        images: [],
      };
      setCounter((c) => c + 1);
      setMarkers((prev) => [...prev, marker]);
      return marker;
    },
    [counter]
  );

  const removeMarker = useCallback((id: string) => {
    setMarkers((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const getMarker = useCallback(
    (id: string) => markers.find((m) => m.id === id),
    [markers]
  );

  const addImages = useCallback((markerId: string, uris: string[]) => {
    const now = Date.now();
    const newImages: MarkerImage[] = uris.map((uri) => ({
      id: createId(),
      uri,
      addedAt: now,
    }));
    setMarkers((prev) =>
      prev.map((m) =>
        m.id === markerId ? { ...m, images: [...m.images, ...newImages] } : m
      )
    );
  }, []);

  const removeImage = useCallback((markerId: string, imageId: string) => {
    setMarkers((prev) =>
      prev.map((m) =>
        m.id === markerId
          ? { ...m, images: m.images.filter((img) => img.id !== imageId) }
          : m
      )
    );
  }, []);

  const value = useMemo(
    () => ({ markers, addMarker, removeMarker, getMarker, addImages, removeImage }),
    [markers, addMarker, removeMarker, getMarker, addImages, removeImage]
  );

  return (
    <MarkersContext.Provider value={value}>{children}</MarkersContext.Provider>
  );
}

export function useMarkers(): MarkersContextValue {
  const ctx = useContext(MarkersContext);
  if (!ctx) {
    throw new Error('useMarkers должен использоваться внутри <MarkersProvider>');
  }
  return ctx;
}

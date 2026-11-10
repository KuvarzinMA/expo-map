import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Map from '../components/Map';
import MarkerList from '../components/MarkerList';
import { useDatabase } from '../contexts/DatabaseContext';
import { errorMessage } from '../database/errors';
import { Coordinates, Marker } from '../types';
import { showMessage } from '../utils/dialogs';

export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getMarkers, addMarker, revision } = useDatabase();
  const [markers, setMarkers] = useState<Marker[]>([]);

  // Загружаем маркеры из БД при открытии и после любых изменений данных.
  useEffect(() => {
    let cancelled = false;
    getMarkers()
      .then((list) => {
        if (!cancelled) setMarkers(list);
      })
      .catch((e) => {
        if (!cancelled) showMessage('Ошибка базы данных', errorMessage(e));
      });
    return () => {
      cancelled = true;
    };
  }, [getMarkers, revision]);

  const openMarker = useCallback(
    (id: number) => {
      try {
        router.push(`/marker/${id}`);
      } catch (e) {
        console.error('Ошибка навигации', e);
        showMessage('Ошибка навигации', 'Не удалось открыть экран маркера.');
      }
    },
    [router]
  );

  const handleLongPress = useCallback(
    async (coords: Coordinates) => {
      try {
        await addMarker(coords.latitude, coords.longitude);
      } catch (e) {
        showMessage('Не удалось добавить маркер', errorMessage(e));
      }
    },
    [addMarker]
  );

  return (
    <View style={styles.container}>
      <Map
        markers={markers}
        onLongPress={handleLongPress}
        onMarkerPress={openMarker}
      />

      <View style={[styles.hint, { top: insets.top + 8 }]} pointerEvents="none">
        <Text style={styles.hintText}>
          Долгое нажатие на карту — добавить маркер
        </Text>
      </View>

      <View style={[styles.list, { bottom: insets.bottom + 8 }]}>
        <MarkerList markers={markers} onSelect={openMarker} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hint: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  hintText: { fontSize: 13, color: '#333' },
  list: { position: 'absolute', left: 0, right: 0 },
});

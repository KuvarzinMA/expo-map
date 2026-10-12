import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { Coordinates, MarkerData } from '../types';

interface Props {
  markers: MarkerData[];
  onLongPress: (coords: Coordinates) => void;
  onMarkerPress: (id: string) => void;
}

const INITIAL_REGION: Region = {
  latitude: 50.0755,
  longitude: 14.4378,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

const LOAD_TIMEOUT_MS = 15000;

export default function Map({ markers, onLongPress, onMarkerPress }: Props) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0); // меняет key => перезагрузка карты

  // Если карта не загрузилась за разумное время — показываем ошибку.
  useEffect(() => {
    if (ready) return;
    const t = setTimeout(() => setFailed(true), LOAD_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [ready, attempt]);

  const retry = () => {
    setFailed(false);
    setReady(false);
    setAttempt((a) => a + 1);
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        key={attempt}
        style={StyleSheet.absoluteFill}
        initialRegion={INITIAL_REGION}
        onMapReady={() => {
          setReady(true);
          setFailed(false);
        }}
        onLongPress={(e) => onLongPress(e.nativeEvent.coordinate)}
        showsUserLocation={false}
      >
        {markers.map((m) => (
          <Marker
            key={m.id}
            coordinate={{ latitude: m.latitude, longitude: m.longitude }}
            title={m.title}
            description={`Фото: ${m.images.length}`}
            onPress={() => onMarkerPress(m.id)}
          />
        ))}
      </MapView>

      {!ready && !failed && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" />
          <Text style={styles.overlayText}>Загрузка карты…</Text>
        </View>
      )}

      {failed && !ready && (
        <View style={styles.overlay}>
          <Text style={styles.errorTitle}>Не удалось загрузить карту</Text>
          <Text style={styles.overlayText}>
            Проверьте подключение к интернету и попробуйте снова.
          </Text>
          <Pressable style={styles.button} onPress={retry}>
            <Text style={styles.buttonText}>Повторить</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  overlayText: { marginTop: 12, color: '#555', textAlign: 'center' },
  errorTitle: { fontSize: 18, fontWeight: '600', color: '#c0392b' },
  button: {
    marginTop: 16,
    backgroundColor: '#2f80ed',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});

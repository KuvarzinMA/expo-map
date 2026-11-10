import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ImageList from '../../components/ImageList';
import { useDatabase } from '../../contexts/DatabaseContext';
import { errorMessage } from '../../database/errors';
import { Marker, MarkerImage } from '../../types';
import { confirmAction, showMessage } from '../../utils/dialogs';
import { markerTitle } from '../../utils/format';

export default function MarkerDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const markerId = Number(id);
  const validId = Number.isInteger(markerId) && markerId > 0;

  const router = useRouter();
  const {
    getMarker,
    getMarkerImages,
    addImages,
    deleteImage,
    deleteMarker,
    revision,
  } = useDatabase();

  const [marker, setMarker] = useState<Marker | null>(null);
  const [images, setImages] = useState<MarkerImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState(false);
  const deletingRef = useRef(false); // чтобы не мигал «не найден» при удалении

  // Загружаем маркер и его изображения из БД (и перезагружаем после изменений).
  useEffect(() => {
    if (!validId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const m = await getMarker(markerId);
        const imgs = m ? await getMarkerImages(markerId) : [];
        if (cancelled || deletingRef.current) return;
        setMarker(m);
        setImages(imgs);
      } catch (e) {
        if (!cancelled) showMessage('Ошибка базы данных', errorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [validId, markerId, getMarker, getMarkerImages, revision]);

  const goBack = () => {
    try {
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (e) {
      console.error('Ошибка навигации', e);
      showMessage('Ошибка навигации', 'Не удалось вернуться к карте.');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!marker) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Маркер не найден' }} />
        <Text style={styles.errorTitle}>Маркер не найден</Text>
        <Text style={styles.muted}>Возможно, он был удалён.</Text>
        <Pressable style={styles.button} onPress={goBack}>
          <Text style={styles.buttonText}>Вернуться к карте</Text>
        </Pressable>
      </View>
    );
  }

  const pickImages = async () => {
    setPicking(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showMessage(
          'Нет доступа к галерее',
          'Разрешите доступ к фотографиям в настройках устройства.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        await addImages(
          marker.id,
          result.assets.map((a) => a.uri)
        );
      }
    } catch (e) {
      console.error('Ошибка выбора/сохранения изображения', e);
      showMessage('Не удалось добавить изображение', errorMessage(e));
    } finally {
      setPicking(false);
    }
  };

  const confirmDeleteImage = async (imageId: number) => {
    if (!(await confirmAction('Удалить изображение?'))) return;
    try {
      await deleteImage(imageId);
    } catch (e) {
      showMessage('Не удалось удалить изображение', errorMessage(e));
    }
  };

  const confirmDeleteMarker = async () => {
    const ok = await confirmAction(
      'Удалить маркер?',
      'Все его изображения тоже будут удалены.'
    );
    if (!ok) return;
    try {
      deletingRef.current = true;
      await deleteMarker(marker.id);
      goBack();
    } catch (e) {
      deletingRef.current = false;
      showMessage('Не удалось удалить маркер', errorMessage(e));
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: markerTitle(marker.id) }} />

      <View style={styles.info}>
        <Text style={styles.label}>Широта</Text>
        <Text style={styles.value}>{marker.latitude.toFixed(6)}</Text>
        <Text style={styles.label}>Долгота</Text>
        <Text style={styles.value}>{marker.longitude.toFixed(6)}</Text>
        <Text style={styles.label}>Создан</Text>
        <Text style={styles.value}>
          {new Date(marker.createdAt).toLocaleString('ru-RU')}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[styles.button, styles.flex, picking && styles.disabled]}
          onPress={pickImages}
          disabled={picking}
        >
          {picking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Добавить изображение</Text>
          )}
        </Pressable>
        <Pressable style={[styles.button, styles.danger]} onPress={confirmDeleteMarker}>
          <Text style={styles.buttonText}>Удалить маркер</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>Изображения ({images.length})</Text>
      <View style={styles.flex}>
        <ImageList images={images} onDelete={confirmDeleteImage} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  info: {
    padding: 16,
    backgroundColor: '#f6f7f9',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  label: { fontSize: 12, color: '#888', marginTop: 6 },
  value: { fontSize: 16, color: '#222' },
  actions: { flexDirection: 'row', gap: 8, padding: 12 },
  button: {
    backgroundColor: '#2f80ed',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  danger: { backgroundColor: '#e74c3c' },
  disabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600' },
  section: { paddingHorizontal: 16, fontSize: 16, fontWeight: '600' },
  errorTitle: { fontSize: 18, fontWeight: '600', color: '#c0392b' },
  muted: { color: '#777', marginTop: 6, marginBottom: 16 },
});

import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ImageList from '../../components/ImageList';
import { useMarkers } from '../../context/MarkersContext';

export default function MarkerDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getMarker, addImages, removeImage, removeMarker } = useMarkers();
  const [picking, setPicking] = useState(false);

  const marker = id ? getMarker(id) : undefined;

  const goBack = () => {
    try {
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (e) {
      console.error('Ошибка навигации', e);
      Alert.alert('Ошибка навигации', 'Не удалось вернуться к карте.');
    }
  };

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
        Alert.alert(
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
        addImages(
          marker.id,
          result.assets.map((a) => a.uri)
        );
      }
    } catch (e) {
      console.error('Ошибка выбора изображения', e);
      Alert.alert('Ошибка', 'Не удалось выбрать изображение. Попробуйте ещё раз.');
    } finally {
      setPicking(false);
    }
  };

  const confirmDeleteImage = (imageId: string) => {
    Alert.alert('Удалить изображение?', undefined, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => removeImage(marker.id, imageId),
      },
    ]);
  };

  const confirmDeleteMarker = () => {
    Alert.alert('Удалить маркер?', 'Все его изображения тоже будут удалены.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => {
          goBack();
          removeMarker(marker.id);
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: marker.title }} />

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

      <Text style={styles.section}>Изображения ({marker.images.length})</Text>
      <View style={styles.flex}>
        <ImageList images={marker.images} onDelete={confirmDeleteImage} />
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

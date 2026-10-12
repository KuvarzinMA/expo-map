import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { MarkerImage } from '../types';

interface Props {
  images: MarkerImage[];
  onDelete: (imageId: string) => void;
}

const COLUMNS = 3;
const GAP = 6;
const PADDING = 12;

export default function ImageList({ images, onDelete }: Props) {
  const { width } = useWindowDimensions();
  const [preview, setPreview] = useState<string | null>(null);
  const [brokenIds, setBrokenIds] = useState<Set<string>>(new Set());

  const size = (width - PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS;

  if (images.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Пока нет изображений</Text>
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={images}
        keyExtractor={(i) => i.id}
        numColumns={COLUMNS}
        contentContainerStyle={{ padding: PADDING, gap: GAP }}
        columnWrapperStyle={{ gap: GAP }}
        renderItem={({ item }) => (
          <Pressable
            style={{ width: size, height: size }}
            onPress={() => setPreview(item.uri)}
          >
            {brokenIds.has(item.id) ? (
              <View style={[styles.image, styles.broken]}>
                <Ionicons name="alert-circle-outline" size={28} color="#999" />
              </View>
            ) : (
              <Image
                source={{ uri: item.uri }}
                style={styles.image}
                onError={() =>
                  setBrokenIds((prev) => new Set(prev).add(item.id))
                }
              />
            )}
            <Pressable
              style={styles.delete}
              hitSlop={8}
              onPress={() => onDelete(item.id)}
            >
              <Ionicons name="close" size={16} color="#fff" />
            </Pressable>
          </Pressable>
        )}
      />

      <Modal
        visible={preview !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreview(null)}
      >
        <Pressable style={styles.modal} onPress={() => setPreview(null)}>
          {preview && (
            <Image
              source={{ uri: preview }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          )}
          <Text style={styles.modalHint}>Нажмите, чтобы закрыть</Text>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', height: '100%', borderRadius: 8, backgroundColor: '#ddd' },
  broken: { alignItems: 'center', justifyContent: 'center' },
  delete: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#888', fontSize: 15 },
  modal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: { width: '100%', height: '85%' },
  modalHint: { color: '#bbb', marginTop: 12 },
});

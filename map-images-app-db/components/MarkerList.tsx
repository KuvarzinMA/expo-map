import { FlatList, Pressable, StyleSheet, Text } from 'react-native';
import { Marker } from '../types';
import { markerTitle } from '../utils/format';

interface Props {
  markers: Marker[];
  onSelect: (id: number) => void;
}

export default function MarkerList({ markers, onSelect }: Props) {
  if (markers.length === 0) return null;

  return (
    <FlatList
      data={markers}
      keyExtractor={(m) => String(m.id)}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      renderItem={({ item }) => (
        <Pressable style={styles.chip} onPress={() => onSelect(item.id)}>
          <Text style={styles.title}>{markerTitle(item.id)}</Text>
          <Text style={styles.sub}>Фото: {item.imageCount}</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 12, gap: 8 },
  chip: {
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  title: { fontWeight: '600', color: '#222' },
  sub: { fontSize: 12, color: '#777', marginTop: 2 },
});

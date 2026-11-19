import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { SectionCanvas } from '@/drawing/strokes';
import { stripHeight } from '@/game/geometry';
import { useGameStore } from '@/game/store';
import { colors } from '@/theme';

const THUMB = 96;

export default function GalleryScreen() {
  const gallery = useGameStore((s) => s.gallery);

  if (gallery.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No finished drawings yet.</Text>
        <Button label="Start a game" onPress={() => router.replace('/new')} />
      </View>
    );
  }

  return (
    <FlatList
      data={gallery}
      keyExtractor={(g) => g.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <Pressable
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
          onPress={() => router.push({ pathname: '/reveal/[id]', params: { id: item.id } })}>
          <View style={styles.thumb}>
            {item.sections.map((s, i) => (
              <SectionCanvas key={i} strokes={s.strokes} width={THUMB} unitsH={stripHeight(item)} />
            ))}
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.title}>{item.prompt ? `"${item.prompt}"` : 'No inspo word'}</Text>
            <Text style={styles.sub}>{item.artists.join(', ')}</Text>
            <Text style={styles.sub}>{new Date(item.finishedAt ?? item.createdAt).toLocaleDateString()}</Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12, width: '100%', maxWidth: 560, alignSelf: 'center' },
  row: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
  },
  thumb: { borderWidth: 1, borderColor: colors.line, borderRadius: 4, overflow: 'hidden' },
  title: { fontSize: 17, fontWeight: '700', color: colors.ink },
  sub: { fontSize: 14, color: colors.muted },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  emptyText: { fontSize: 17, color: colors.muted },
});

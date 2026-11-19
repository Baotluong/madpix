import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { ShareImageButton } from '@/components/share-image-button';
import { randomPrompt } from '@/game/prompts';
import { deleteFromGallery, startGame, useGameStore } from '@/game/store';
import { confirm } from '@/lib/confirm';
import { goHome } from '@/lib/go-home';
import { colors } from '@/theme';
import { RevealView } from './reveal-view';

/** A pass-and-play drawing from this device's gallery. */
export default function RevealScreen() {
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const game = useGameStore((s) => s.gallery.find((g) => g.id === id));

  if (!game) {
    return (
      <View style={styles.missing}>
        <Text style={styles.meta}>This drawing isn&apos;t on this device anymore.</Text>
        <Button label="Home" onPress={() => goHome()} />
      </View>
    );
  }

  // Unfold one strip at a time right after a game ends; show it all at once from the gallery.
  const animate = fresh === '1';

  const remove = async () => {
    if (await confirm('Delete this drawing?', 'It will be removed from this device.', 'Delete')) {
      deleteFromGallery(game.id);
      router.back();
    }
  };

  return (
    <RevealView game={game} animate={animate}>
      <ShareImageButton game={game} />
      {!game.remote && (
        <Button
          label="New drawing, same artists"
          variant="secondary"
          onPress={() => {
            // Same artists; a fresh inspo word if this drawing used one.
            startGame(game.artists, game.prompt ? randomPrompt(game.prompt) : null);
            router.replace('/play');
          }}
        />
      )}
      <View style={styles.row}>
        {!animate && router.canGoBack() && (
          <Button label="Back" variant="ghost" onPress={() => router.back()} style={{ flex: 1 }} />
        )}
        <Button label="Home" variant="ghost" onPress={() => goHome()} style={{ flex: 1 }} />
        {!animate && <Button label="Delete" variant="ghost" onPress={remove} style={{ flex: 1 }} />}
      </View>
    </RevealView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  meta: { fontSize: 16, fontWeight: '700', color: colors.ink, textAlign: 'center' },
});

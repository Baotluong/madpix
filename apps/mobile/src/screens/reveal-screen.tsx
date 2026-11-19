import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FlipInXDown } from 'react-native-reanimated';

import { Button } from '@/components/button';
import { sharePage } from '@/drawing/export-image';
import { SectionCanvas } from '@/drawing/strokes';
import { stripHeight } from '@/game/geometry';
import { randomPrompt } from '@/game/prompts';
import { deleteFromGallery, startGame, useGameStore } from '@/game/store';
import { confirm } from '@/lib/confirm';
import { goHome } from '@/lib/go-home';
import { colors } from '@/theme';

const STEP_MS = 700;

export default function RevealScreen() {
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const game = useGameStore((s) => s.gallery.find((g) => g.id === id));
  const { width: W } = useWindowDimensions();
  const [sharing, setSharing] = useState(false);

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
  const width = Math.min(W - 32, 480);
  const n = game.sections.length;

  const share = async () => {
    setSharing(true);
    try {
      await sharePage(game);
    } catch (e) {
      console.warn('Share failed', e);
    } finally {
      setSharing(false);
    }
  };

  const remove = async () => {
    if (await confirm('Delete this drawing?', 'It will be removed from this device.', 'Delete')) {
      deleteFromGallery(game.id);
      router.back();
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {game.prompt && (
        <Animated.Text entering={animate ? FadeIn.duration(400) : undefined} style={styles.prompt}>
          Everyone&apos;s inspo was <Text style={styles.promptWord}>{game.prompt}</Text>
        </Animated.Text>
      )}

      <View style={[styles.page, { width }]}>
        {game.sections.map((section, i) => (
          <Animated.View
            key={i}
            entering={animate ? FlipInXDown.delay(400 + i * STEP_MS).duration(STEP_MS) : undefined}>
            <SectionCanvas strokes={section.strokes} width={width} unitsH={stripHeight(game)} />
          </Animated.View>
        ))}
      </View>

      <Animated.View
        entering={animate ? FadeIn.delay(400 + n * STEP_MS) : undefined}
        style={styles.after}>
        <Text style={styles.meta}>By {game.artists.join(', ')}</Text>
        <Text style={styles.metaSmall}>{new Date(game.finishedAt ?? game.createdAt).toLocaleString()}</Text>
        <Button label={sharing ? 'Preparing image...' : 'Save / share image'} onPress={share} disabled={sharing} />
        <Button
          label="Play again with the same artists"
          variant="secondary"
          onPress={() => {
            // Same artists; a fresh inspo word if this game used one.
            startGame(game.artists, game.prompt ? randomPrompt(game.prompt) : null);
            router.replace('/play');
          }}
        />
        <Button label="Home" variant="ghost" onPress={() => goHome()} />
        {!animate && <Button label="Delete" variant="ghost" onPress={remove} />}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', padding: 16, gap: 16 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  prompt: { fontSize: 17, color: colors.muted },
  promptWord: { fontWeight: '800', color: colors.ink },
  page: {
    backgroundColor: colors.paper,
    borderRadius: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  after: { width: '100%', maxWidth: 480, gap: 10, alignItems: 'stretch' },
  meta: { fontSize: 16, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  metaSmall: { fontSize: 13, color: colors.muted, textAlign: 'center', marginBottom: 6 },
});

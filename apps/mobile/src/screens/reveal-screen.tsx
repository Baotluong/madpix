import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FlipInXDown } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { sharePage } from '@/drawing/export-image';
import { SectionCanvas } from '@/drawing/strokes';
import { STRIP_W, stripHeight } from '@/game/geometry';
import { randomPrompt } from '@/game/prompts';
import { deleteFromGallery, startGame, useGameStore } from '@/game/store';
import { confirm } from '@/lib/confirm';
import { goHome } from '@/lib/go-home';
import { colors } from '@/theme';

const STEP_MS = 700;

export default function RevealScreen() {
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const game = useGameStore((s) => s.gallery.find((g) => g.id === id));
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
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
  const n = game.sections.length;
  const unitsH = stripHeight(game);
  // Fit the whole page to the screen height so everyone sees it at once.
  const pageAspect = (unitsH / STRIP_W) * n;
  const width = Math.floor(
    Math.min((H - insets.top - insets.bottom - 32) / pageAspect, (W - insets.left - insets.right) * 0.6),
  );

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
    <SafeAreaView style={styles.screen} edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.page, { width }]}>
        {game.sections.map((section, i) => (
          <Animated.View
            key={i}
            entering={animate ? FlipInXDown.delay(300 + i * STEP_MS).duration(STEP_MS) : undefined}>
            <SectionCanvas strokes={section.strokes} width={width} unitsH={unitsH} />
          </Animated.View>
        ))}
      </View>

      <Animated.View entering={animate ? FadeIn.delay(300 + n * STEP_MS) : undefined} style={styles.side}>
        <ScrollView contentContainerStyle={styles.sideContent}>
          {game.prompt && (
            <Text style={styles.prompt}>
              Everyone&apos;s inspo was <Text style={styles.promptWord}>{game.prompt}</Text>
            </Text>
          )}
          <Text style={styles.meta}>By {game.artists.join(', ')}</Text>
          <Text style={styles.metaSmall}>{new Date(game.finishedAt ?? game.createdAt).toLocaleString()}</Text>
          <Button label={sharing ? 'Preparing image...' : 'Save / share image'} onPress={share} disabled={sharing} />
          <Button
            label="New drawing, same artists"
            variant="secondary"
            onPress={() => {
              // Same artists; a fresh inspo word if this drawing used one.
              startGame(game.artists, game.prompt ? randomPrompt(game.prompt) : null);
              router.replace('/play');
            }}
          />
          <View style={styles.row}>
            {!animate && router.canGoBack() && (
              <Button label="Back" variant="ghost" onPress={() => router.back()} style={{ flex: 1 }} />
            )}
            <Button label="Home" variant="ghost" onPress={() => goHome()} style={{ flex: 1 }} />
            {!animate && <Button label="Delete" variant="ghost" onPress={remove} style={{ flex: 1 }} />}
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, padding: 16 },
  side: { flex: 1, maxWidth: 380, alignSelf: 'stretch' },
  sideContent: { flexGrow: 1, justifyContent: 'center', gap: 10 },
  row: { flexDirection: 'row', gap: 4 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  prompt: { fontSize: 17, color: colors.muted, textAlign: 'center' },
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
  meta: { fontSize: 16, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  metaSmall: { fontSize: 13, color: colors.muted, textAlign: 'center', marginBottom: 6 },
});

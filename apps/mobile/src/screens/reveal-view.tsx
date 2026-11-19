import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FlipInXDown } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { SectionCanvas } from '@/drawing/strokes';
import { STRIP_W, stripHeight } from '@/game/geometry';
import type { Game } from '@/game/types';
import { colors } from '@/theme';

const STEP_MS = 700;

/** The unfolded page on the left, details and [actions] on the right. */
export function RevealView({ game, animate, children }: { game: Game; animate: boolean; children: ReactNode }) {
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const n = game.sections.length;
  const unitsH = stripHeight(game);
  // Fit the whole page to the screen height so everyone sees it at once.
  const pageAspect = (unitsH / STRIP_W) * n;
  const width = Math.floor(
    Math.min((H - insets.top - insets.bottom - 32) / pageAspect, (W - insets.left - insets.right) * 0.6),
  );

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
          {children}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, padding: 16 },
  side: { flex: 1, maxWidth: 380, alignSelf: 'stretch' },
  sideContent: { flexGrow: 1, justifyContent: 'center', gap: 10 },
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

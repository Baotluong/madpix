import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { UnfoldingPage, unfoldSchedule } from '@/drawing/unfolding-page';
import { STRIP_W, stripHeight } from '@/game/geometry';
import type { Game } from '@/game/types';
import { colors } from '@/theme';

/**
 * The unfolded page on the left, details and [actions] on the right. Tapping the page opens it
 * full screen, where it unfolds again.
 */
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="See the drawing full screen"
        onPress={() => router.push({ pathname: '/view/[id]', params: { id: game.id } })}
        style={({ pressed }) => pressed && { opacity: 0.9 }}>
        <UnfoldingPage game={game} width={width} animate={animate} />
        <View style={styles.expand} pointerEvents="none">
          <Ionicons name="expand" size={16} color={colors.card} />
        </View>
      </Pressable>

      <Animated.View entering={animate ? FadeIn.delay(unfoldSchedule(game).total) : undefined} style={styles.side}>
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
  expand: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    backgroundColor: 'rgba(31,36,48,0.45)',
    borderRadius: 8,
    padding: 5,
  },
  meta: { fontSize: 16, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  metaSmall: { fontSize: 13, color: colors.muted, textAlign: 'center', marginBottom: 6 },
});

import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { stripPx, UnfoldingPage, unfoldSchedule } from '@/drawing/unfolding-page';
import { useGameStore } from '@/game/store';
import { colors } from '@/theme';

/**
 * A finished drawing, big: as wide as the screen allows while one strip still fits on screen.
 * It unfolds and redraws, scrolling along with the strip being drawn.
 */
export default function PageViewer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const game = useGameStore((s) => s.gallery.find((g) => g.id === id));
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [run, setRun] = useState(0);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);

  const width = Math.floor(Math.min(W - insets.left - insets.right - 120, 2 * (H - 64)));
  const strip = game ? stripPx(game, width) : 0;

  // Keep the strip that's unfolding in the middle of the screen.
  useEffect(() => {
    if (!game) return;
    scroll.current?.scrollTo({ y: 0, animated: false });
    const timers = unfoldSchedule(game).steps.map((step, i) =>
      setTimeout(
        () => scroll.current?.scrollTo({ y: Math.max(0, 24 + i * strip - (H - strip) / 2), animated: true }),
        step.flipAt,
      ),
    );
    return () => timers.forEach(clearTimeout);
  }, [game, run, strip, H]);

  if (!game) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>This drawing isn&apos;t on this device.</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.link}>Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView ref={scroll} contentContainerStyle={styles.content}>
        <UnfoldingPage key={run} game={game} width={width} animate />
      </ScrollView>
      <View style={[styles.controls, { left: insets.left + 12 }]}>
        <RoundButton icon="close" label="Close" onPress={() => router.back()} />
      </View>
      <View style={[styles.controls, { right: insets.right + 12 }]}>
        <RoundButton icon="refresh" label="Replay" onPress={() => setRun((r) => r + 1)} />
      </View>
    </View>
  );
}

function RoundButton({ icon, label, onPress }: { icon: 'close' | 'refresh'; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.round, pressed && { opacity: 0.7 }]}>
      <Ionicons name={icon} size={24} color={colors.card} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.desk },
  content: { alignItems: 'center', paddingVertical: 24 },
  controls: { position: 'absolute', top: 12 },
  round: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.bg },
  missingText: { fontSize: 16, color: colors.ink },
  link: { fontSize: 16, color: colors.brandDark, fontWeight: '700' },
});

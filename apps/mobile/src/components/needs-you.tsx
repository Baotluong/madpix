import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DrawingView } from '@/remote/api';
import { parseTime, timeLeft } from '@/remote/to-game';
import { colors } from '@/theme';

/** How many cards fit on a landscape phone; the rest are behind "+N more". */
const MAX_CARDS = 3;

/** Online drawings waiting on me: my turn to draw, or finished and not unfolded here yet. */
export const needsMe = (d: DrawingView, seen: string[]) =>
  d.myTurn || (d.status === 'FINISHED' && !seen.includes(d.id));

/**
 * The home screen's "Your move" cards: one tap to draw your turn or unfold a finished page.
 * Turns first (the ones running out soonest first), then finished pages.
 */
export function NeedsYou({ drawings }: { drawings: DrawingView[] }) {
  const sorted = [...drawings].sort((a, b) => rank(a) - rank(b));
  const shown = sorted.slice(0, MAX_CARDS);
  const more = sorted.length - shown.length;
  return (
    <View style={styles.block}>
      <Text style={styles.heading}>Your move</Text>
      <View style={styles.row}>
        {shown.map((d) => (
          <Card key={d.id} view={d} />
        ))}
      </View>
      {more > 0 && (
        <Pressable onPress={() => router.push('/friends')} hitSlop={8}>
          <Text style={styles.more}>+{more} more</Text>
        </Pressable>
      )}
    </View>
  );
}

/** Turns before finished pages; among turns, the soonest deadline first. */
function rank(d: DrawingView) {
  if (!d.myTurn) return Number.MAX_SAFE_INTEGER;
  return d.turnEndsAt ? parseTime(d.turnEndsAt) : Number.MAX_SAFE_INTEGER - 1;
}

function Card({ view }: { view: DrawingView }) {
  const finished = view.status === 'FINISHED';
  const others = view.artists.filter((a) => a.joined && !a.isMe).map((a) => a.name);
  const who =
    others.length > 0
      ? `with ${others.join(', ')}`
      : view.visibility === 'PUBLIC'
        ? 'Public drawing'
        : 'Just you so far';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/remote/[id]', params: { id: view.id } })}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
      <View style={styles.titleRow}>
        <Ionicons name={finished ? 'sparkles' : 'pencil'} size={15} color={colors.brandDark} />
        <Text style={styles.title} numberOfLines={1}>
          {finished ? 'Finished!' : 'Your turn'}
        </Text>
      </View>
      <Text style={styles.line} numberOfLines={1}>
        {finished ? 'Tap to unfold' : view.prompt ? `Inspo: ${view.prompt}` : 'No inspo'}
      </Text>
      <Text style={styles.small} numberOfLines={1}>
        {who}
      </Text>
      {!finished && view.turnEndsAt && <Text style={styles.deadline}>{timeLeft(view.turnEndsAt)}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: { alignSelf: 'stretch', gap: 8, alignItems: 'center' },
  heading: { fontSize: 15, fontWeight: '800', color: colors.card, textTransform: 'uppercase', letterSpacing: 1 },
  row: { flexDirection: 'row', gap: 10, justifyContent: 'center', alignSelf: 'stretch' },
  card: {
    flex: 1,
    maxWidth: 190,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 2,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 16, fontWeight: '900', color: colors.ink, flexShrink: 1 },
  line: { fontSize: 14, fontWeight: '600', color: colors.ink },
  small: { fontSize: 12, color: colors.muted },
  deadline: { fontSize: 12, fontWeight: '700', color: colors.brandDark },
  more: { fontSize: 14, fontWeight: '700', color: colors.card, textDecorationLine: 'underline' },
});

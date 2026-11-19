import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { DrawingCanvas } from '@/drawing/drawing-canvas';
import { PageOverview } from '@/drawing/page-overview';
import { SectionCanvas } from '@/drawing/strokes';
import { Toolbar, type Tool } from '@/drawing/toolbar';
import { SECTION, SLIVER } from '@/game/geometry';
import { finishTurn, quitGame, saveDraft, useGameStore } from '@/game/store';
import type { Game, Stroke } from '@/game/types';
import { confirm } from '@/lib/confirm';
import { goHome } from '@/lib/go-home';
import { colors, PALETTE, SIZES } from '@/theme';

export default function PlayScreen() {
  const ready = useGameStore((s) => s.ready);
  const game = useGameStore((s) => s.current);
  if (!ready) return null;
  if (!game) return <Redirect href="/" />;
  // A new key per turn resets all drawing state for the next artist.
  return <Turn key={`${game.id}-${game.sections.length}`} game={game} />;
}

function Turn({ game }: { game: Game }) {
  const turn = game.sections.length;
  const artist = game.artists[turn];
  const [phase, setPhase] = useState<'handoff' | 'drawing'>('handoff');

  if (phase === 'handoff') {
    return <Handoff game={game} onReady={() => setPhase('drawing')} />;
  }
  return <Drawing game={game} artist={artist} />;
}

/** The cover screen between turns, so the next artist can't see the last drawing. */
function Handoff({ game, onReady }: { game: Game; onReady: () => void }) {
  const turn = game.sections.length;
  const artist = game.artists[turn];
  return (
    <SafeAreaView style={styles.handoff}>
      <Text style={styles.handoffStep}>
        Strip {turn + 1} of {game.artists.length}
      </Text>
      <Text style={styles.handoffTitle}>
        {turn === 0 ? `${artist}, you start!` : `Pass the phone to ${artist}`}
      </Text>
      {turn > 0 && <Text style={styles.handoffBody}>No peeking, {game.artists[turn - 1]}.</Text>}
      <Text style={styles.handoffBody}>
        {turn === 0
          ? 'Draw anything in the top strip. The next artist only sees its bottom edge.'
          : 'You will see a thin sliver of the strip above yours. Continue from it!'}
      </Text>
      {game.prompt && (
        <View style={styles.inspoCard}>
          <Text style={styles.inspoLabel}>Inspo, if you want it</Text>
          <Text style={styles.inspoWord}>{game.prompt}</Text>
        </View>
      )}
      <Button label={`I'm ${artist}, let's draw`} variant="secondary" onPress={onReady} />
    </SafeAreaView>
  );
}

function Drawing({ game, artist }: { game: Game; artist: string }) {
  const turn = game.sections.length;
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [strokes, setStrokes] = useState<Stroke[]>(game.draft);
  const [past, setPast] = useState<Stroke[][]>([]);
  const [future, setFuture] = useState<Stroke[][]>([]);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState(PALETTE[0]);
  const [sizeIndex, setSizeIndex] = useState(1);
  const [overview, setOverview] = useState(false);

  const showSliver = turn > 0;
  // Header, inspo chip, toolbar and the Done button take roughly this much height.
  const chrome = 64 + (game.prompt ? 36 : 0) + 104 + 72;
  const available = H - insets.top - insets.bottom - chrome;
  const size = Math.floor(Math.min(W - 24, 560, available / (showSliver ? 1 + SLIVER : 1)));

  const commit = (next: Stroke[]) => {
    setPast((p) => [...p, strokes]);
    setFuture([]);
    setStrokes(next);
    saveDraft(next);
  };
  const undo = () => {
    const prev = past[past.length - 1];
    if (!prev) return;
    setPast(past.slice(0, -1));
    setFuture([strokes, ...future]);
    setStrokes(prev);
    saveDraft(prev);
  };
  const redo = () => {
    const [next, ...rest] = future;
    if (!next) return;
    setFuture(rest);
    setPast([...past, strokes]);
    setStrokes(next);
    saveDraft(next);
  };

  const fold = async () => {
    const last = turn === game.artists.length - 1;
    const ok = await confirm(
      last ? 'Unfold the page?' : 'Fold the paper?',
      last
        ? "You're the last artist. Time to see what you all made!"
        : "You won't be able to change your strip after this.",
      last ? 'Unfold!' : 'Fold it',
    );
    if (!ok) return;
    const done = finishTurn(strokes);
    if (done) router.replace({ pathname: '/reveal/[id]', params: { id: done.id, fresh: '1' } });
  };

  const quit = async () => {
    if (await confirm('Quit this game?', 'The drawing will be thrown away.', 'Quit')) {
      quitGame();
      goHome();
    }
  };

  const overviewWidth = Math.min(W - 48, 420, (H - 200) / game.artists.length);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={quit} hitSlop={10}>
          <Text style={styles.headerLink}>Quit</Text>
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerName}>{artist}</Text>
          <Text style={styles.headerStep}>
            Strip {turn + 1} of {game.artists.length}
          </Text>
        </View>
        <Pressable onPress={() => setOverview(true)} hitSlop={10}>
          <Text style={styles.headerLink}>Whole page</Text>
        </Pressable>
      </View>

      {game.prompt && (
        <View style={styles.chip}>
          <Text style={styles.chipText}>Inspo: {game.prompt}</Text>
        </View>
      )}

      <View style={styles.paper}>
        {showSliver && (
          <View>
            <SectionCanvas
              strokes={game.sections[turn - 1].strokes}
              width={size}
              fromY={SECTION * (1 - SLIVER)}
            />
            <View pointerEvents="none" style={styles.sliverShade} />
          </View>
        )}
        {showSliver && <View style={[styles.foldLine, { width: size }]} />}
        <DrawingCanvas
          size={size}
          strokes={strokes}
          color={tool === 'eraser' ? colors.paper : color}
          penWidth={tool === 'eraser' ? SIZES[sizeIndex] * 2 : SIZES[sizeIndex]}
          onStroke={(s) => commit([...strokes, s])}
        />
      </View>

      <Toolbar
        tool={tool}
        color={color}
        sizeIndex={sizeIndex}
        canUndo={past.length > 0}
        canRedo={future.length > 0}
        onTool={setTool}
        onColor={setColor}
        onSize={setSizeIndex}
        onUndo={undo}
        onRedo={redo}
        onClear={() => commit([])}
      />

      <View style={styles.footer}>
        <Button
          label={turn === game.artists.length - 1 ? 'Done: unfold the page' : 'Done: fold the paper'}
          onPress={fold}
        />
      </View>

      <Modal visible={overview} transparent animationType="fade" onRequestClose={() => setOverview(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOverview(false)}>
          <ScrollView contentContainerStyle={styles.overviewContent}>
            <Text style={styles.overviewTitle}>The whole page</Text>
            <PageOverview game={game} strokes={strokes} width={overviewWidth} />
            <Text style={styles.overviewHint}>Tap anywhere to keep drawing</Text>
          </ScrollView>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  handoff: {
    flex: 1,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  handoffStep: { fontSize: 16, fontWeight: '700', color: colors.card, opacity: 0.85 },
  handoffTitle: { fontSize: 32, fontWeight: '900', color: colors.card, textAlign: 'center' },
  handoffBody: { fontSize: 17, color: colors.card, textAlign: 'center', lineHeight: 24, maxWidth: 420 },
  inspoCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    marginVertical: 8,
  },
  inspoLabel: { fontSize: 13, color: colors.muted },
  inspoWord: { fontSize: 28, fontWeight: '800', color: colors.ink },
  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLink: { fontSize: 16, fontWeight: '600', color: colors.brandDark },
  headerName: { fontSize: 18, fontWeight: '800', color: colors.ink },
  headerStep: { fontSize: 13, color: colors.muted },
  chip: {
    alignSelf: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 8,
  },
  chipText: { color: colors.muted, fontSize: 14 },
  paper: { alignItems: 'center' },
  // Slightly dims the sliver so it reads as "not yours".
  sliverShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(91,141,230,0.08)' },
  foldLine: { borderTopWidth: 2, borderStyle: 'dashed', borderColor: colors.brand },
  footer: { paddingHorizontal: 16, paddingBottom: 8, width: '100%', maxWidth: 560, alignSelf: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(31,36,48,0.75)' },
  overviewContent: { alignItems: 'center', padding: 24, gap: 12 },
  overviewTitle: { color: colors.card, fontSize: 20, fontWeight: '800' },
  overviewHint: { color: colors.card, opacity: 0.8 },
});

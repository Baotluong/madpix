import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, router } from 'expo-router';
import { NavigationBar } from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { canvasHeight, DrawingCanvas } from '@/drawing/drawing-canvas';
import { PageOverview } from '@/drawing/page-overview';
import { IconButton, PANEL_CONTENT_W, Toolbar, type Tool } from '@/drawing/toolbar';
import { STRIP_W, stripHeight } from '@/game/geometry';
import { finishTurn, quitGame, saveDraft, useGameStore } from '@/game/store';
import type { Game, Stroke } from '@/game/types';
import { confirm } from '@/lib/confirm';
import { goHome } from '@/lib/go-home';
import { colors, PALETTE, SIZES } from '@/theme';

const PANEL_PAD = 8;
const PANEL_W = PANEL_CONTENT_W + PANEL_PAD * 2;
const MARGIN = 8;
const INSPO_MS = 2500;

export default function PlayScreen() {
  const ready = useGameStore((s) => s.ready);
  const game = useGameStore((s) => s.current);
  if (!ready) return null;
  if (!game) return <Redirect href="/" />;
  return (
    <>
      {/* Full screen while playing: every pixel goes to the paper. Swipe from an edge to bring the bars back. */}
      <StatusBar hidden />
      <NavigationBar hidden />
      {/* A new key per turn resets all drawing state for the next artist. */}
      <Turn key={`${game.id}-${game.sections.length}`} game={game} />
    </>
  );
}

function Turn({ game }: { game: Game }) {
  const [phase, setPhase] = useState<'handoff' | 'drawing'>('handoff');
  if (phase === 'handoff') {
    return <Handoff game={game} onReady={() => setPhase('drawing')} />;
  }
  return <Drawing game={game} />;
}

/** The cover screen between turns, so the next artist can't see the last drawing. */
function Handoff({ game, onReady }: { game: Game; onReady: () => void }) {
  const turn = game.sections.length;
  const artist = game.artists[turn];
  return (
    <SafeAreaView style={styles.handoff}>
      <ScrollView contentContainerStyle={styles.handoffContent}>
        <Text style={styles.handoffStep}>
          Artist {turn + 1} of {game.artists.length}
        </Text>
        <Text style={styles.handoffTitle}>
          {turn === 0 ? `${artist}, you start!` : `Pass the phone to ${artist}`}
        </Text>
        <Text style={styles.handoffBody}>
          {turn === 0
            ? 'Draw anything in the top strip. The next artist only sees its bottom edge.'
            : `No peeking, ${game.artists[turn - 1]}! ${artist}: you'll see a thin sliver of the strip above yours. Continue from it.`}
        </Text>
        {game.prompt && (
          <View style={styles.inspoCard}>
            <Text style={styles.inspoLabel}>Inspo, if you want it</Text>
            <Text style={styles.inspoWord}>{game.prompt}</Text>
          </View>
        )}
        <Button label={`I'm ${artist}, let's draw`} variant="secondary" onPress={onReady} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Drawing({ game }: { game: Game }) {
  const turn = game.sections.length;
  const artist = game.artists[turn];
  const isLast = turn === game.artists.length - 1;
  const unitsH = stripHeight(game);
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const landscape = W > H;

  const [strokes, setStrokes] = useState<Stroke[]>(game.draft);
  const [past, setPast] = useState<Stroke[][]>([]);
  const [future, setFuture] = useState<Stroke[][]>([]);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState(PALETTE[0]);
  const [sizeIndex, setSizeIndex] = useState(1);
  const [overview, setOverview] = useState(false);
  // The inspo word pops up when drawing starts, then hides; the bulb brings it back.
  const [showInspo, setShowInspo] = useState(!!game.prompt);
  useEffect(() => {
    if (!showInspo) return;
    const t = setTimeout(() => setShowInspo(false), INSPO_MS);
    return () => clearTimeout(t);
  }, [showInspo]);

  // Make the strip (plus the sliver) as big as the screen allows next to the tools.
  const hasSliver = turn > 0;
  const availW = landscape
    ? W - insets.left - insets.right - PANEL_W - MARGIN * 2
    : W - insets.left - insets.right - MARGIN * 2;
  const availH = landscape
    ? H - insets.top - insets.bottom - MARGIN * 2
    : H - insets.top - insets.bottom - 260;
  const stripWidth = Math.floor(Math.min(availW, availH / canvasHeight(1, unitsH, hasSliver)));

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

  const done = async () => {
    const ok = await confirm(
      isLast ? 'Unfold the page?' : 'Fold the paper?',
      isLast
        ? "You're the last artist. Time to see what you all made!"
        : "You won't be able to change your strip after this.",
      isLast ? 'Unfold!' : 'Fold it',
    );
    if (!ok) return;
    const finished = finishTurn(strokes);
    if (finished) router.replace({ pathname: '/reveal/[id]', params: { id: finished.id, fresh: '1' } });
  };

  const quit = async () => {
    if (await confirm('Quit this drawing?', 'It will be thrown away.', 'Quit')) {
      quitGame();
      goHome();
    }
  };

  const pageAspect = (unitsH / STRIP_W) * game.artists.length;
  const overviewWidth = Math.min(W - 48, 420, (H - 100) / pageAspect);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.body, landscape && styles.bodyLandscape]}>
        <View style={styles.paperArea}>
          <View>
            <DrawingCanvas
              width={stripWidth}
              unitsH={unitsH}
              strokes={strokes}
              prevStrokes={hasSliver ? game.sections[turn - 1].strokes : undefined}
              showNextHint={!isLast}
              color={tool === 'eraser' ? colors.paper : color}
              penWidth={tool === 'eraser' ? SIZES[sizeIndex] * 2 : SIZES[sizeIndex]}
              onStroke={(s) => commit([...strokes, s])}
            />
            {showInspo && game.prompt && (
              <Animated.View
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(400)}
                pointerEvents="none"
                style={styles.inspoBubble}>
                <Text style={styles.inspoBubbleText}>
                  Inspo: <Text style={{ fontWeight: '800' }}>{game.prompt}</Text>
                </Text>
              </Animated.View>
            )}
          </View>
        </View>

        <View style={[styles.panel, !landscape && styles.panelPortrait]}>
          <View style={styles.panelTop}>
            <Text style={styles.artist} numberOfLines={1}>
              {artist}
            </Text>
            <View style={styles.controls}>
              <IconButton plain label="Quit" onPress={quit}>
                <Ionicons name="close" size={24} color={colors.muted} />
              </IconButton>
              {game.prompt && (
                <IconButton plain label="Show inspo word" onPress={() => setShowInspo(true)}>
                  <Ionicons name="bulb-outline" size={22} color={colors.brandDark} />
                </IconButton>
              )}
              <IconButton plain label="See the whole page" onPress={() => setOverview(true)}>
                <Ionicons name="eye-outline" size={23} color={colors.brandDark} />
              </IconButton>
            </View>
          </View>
          <Toolbar
            vertical={landscape}
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
          <Button label="Done" onPress={done} style={styles.done} />
        </View>
      </View>

      <Modal
        visible={overview}
        transparent
        animationType="fade"
        supportedOrientations={['landscape', 'portrait']}
        onRequestClose={() => setOverview(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOverview(false)}>
          <ScrollView contentContainerStyle={styles.overviewContent}>
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
  handoff: { flex: 1, backgroundColor: colors.brand },
  handoffContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  handoffStep: { fontSize: 15, fontWeight: '700', color: colors.card, opacity: 0.85 },
  handoffTitle: { fontSize: 28, fontWeight: '900', color: colors.card, textAlign: 'center' },
  handoffBody: { fontSize: 16, color: colors.card, textAlign: 'center', lineHeight: 22, maxWidth: 520 },
  inspoCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  inspoLabel: { fontSize: 13, color: colors.muted },
  inspoWord: { fontSize: 24, fontWeight: '800', color: colors.ink },
  body: { flex: 1, padding: MARGIN, gap: MARGIN },
  bodyLandscape: { flexDirection: 'row', paddingRight: 0 },
  paperArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  inspoBubble: {
    position: 'absolute',
    // At the bottom so it never hides the sliver at the top.
    bottom: 12,
    alignSelf: 'center',
    backgroundColor: colors.ink,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  inspoBubbleText: { color: colors.card, fontSize: 15 },
  panel: {
    width: PANEL_W,
    paddingHorizontal: PANEL_PAD,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panelPortrait: { width: '100%', maxWidth: 560, alignSelf: 'center', gap: 6 },
  panelTop: { alignSelf: 'stretch', gap: 2 },
  artist: { fontSize: 16, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  controls: { flexDirection: 'row', justifyContent: 'space-between' },
  done: { alignSelf: 'stretch', minHeight: 44 },
  backdrop: { flex: 1, backgroundColor: 'rgba(31,36,48,0.75)' },
  overviewContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 16, gap: 10 },
  overviewHint: { color: colors.card, opacity: 0.8 },
});

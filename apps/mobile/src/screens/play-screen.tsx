import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, router } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { canvasHeight, DrawingCanvas } from '@/drawing/drawing-canvas';
import { PageOverview } from '@/drawing/page-overview';
import { Toolbar, type Tool } from '@/drawing/toolbar';
import { STRIP_W, stripHeight } from '@/game/geometry';
import { finishTurn, quitGame, saveDraft, useGameStore } from '@/game/store';
import type { Game, Stroke } from '@/game/types';
import { confirm } from '@/lib/confirm';
import { goHome } from '@/lib/go-home';
import { colors, PALETTE, SIZES } from '@/theme';

const HEADER_H = 44;
const PANEL_W = 196;
const INSPO_MS = 2500;

/** Strips are wide, so drawing happens with the phone turned sideways. */
function useLandscapeWhileMounted() {
  useEffect(() => {
    // Not supported on web; the layout adapts to the window instead.
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, []);
}

export default function PlayScreen() {
  useLandscapeWhileMounted();
  const ready = useGameStore((s) => s.ready);
  const game = useGameStore((s) => s.current);
  if (!ready) return null;
  if (!game) return <Redirect href="/" />;
  // A new key per turn resets all drawing state for the next artist.
  return <Turn key={`${game.id}-${game.sections.length}`} game={game} />;
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
          Strip {turn + 1} of {game.artists.length}
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

  // Fit the strip (plus the sliver) into the space left by the header and tools.
  const hasSliver = turn > 0;
  const availW = landscape ? W - insets.left - insets.right - PANEL_W - 16 : Math.min(W - 24, 900);
  const availH = landscape
    ? H - insets.top - insets.bottom - HEADER_H - 12
    : H - insets.top - insets.bottom - HEADER_H - 120 - 72;
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

  const fold = async () => {
    const ok = await confirm(
      isLast ? 'Unfold the page?' : 'Fold the paper?',
      isLast
        ? "You're the last artist. Time to see what you all made!"
        : "You won't be able to change your strip after this.",
      isLast ? 'Unfold!' : 'Fold it',
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

  const pageAspect = (unitsH / STRIP_W) * game.artists.length;
  const overviewWidth = Math.min(W - 48, 420, (H - 120) / pageAspect);
  const doneLabel = isLast ? 'Unfold the page' : 'Fold the paper';

  const toolbar = (
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
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerSide}>
          <Pressable onPress={quit} hitSlop={10}>
            <Text style={styles.headerLink}>Quit</Text>
          </Pressable>
        </View>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {artist}
          <Text style={styles.headerStep}>
            {'  ·  '}strip {turn + 1} of {game.artists.length}
          </Text>
        </Text>
        <View style={[styles.headerSide, styles.headerRight]}>
          {game.prompt && (
            <Pressable onPress={() => setShowInspo(true)} hitSlop={10} accessibilityLabel="Show inspo word">
              <Ionicons name="bulb-outline" size={22} color={colors.brandDark} />
            </Pressable>
          )}
          <Pressable onPress={() => setOverview(true)} hitSlop={10}>
            <Text style={styles.headerLink}>Whole page</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.body, landscape && styles.bodyLandscape]}>
        <View style={styles.paperArea}>
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

        {landscape ? (
          <View style={styles.panel}>
            {toolbar}
            <Button label={doneLabel} onPress={fold} style={styles.panelDone} />
          </View>
        ) : (
          <View style={styles.portraitTools}>
            {toolbar}
            <Button label={doneLabel} onPress={fold} />
          </View>
        )}
      </View>

      <Modal
        visible={overview}
        transparent
        animationType="fade"
        supportedOrientations={['landscape', 'portrait']}
        onRequestClose={() => setOverview(false)}>
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
  header: { height: HEADER_H, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  // Equal-width sides keep the title truly centered.
  headerSide: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  headerRight: { justifyContent: 'flex-end', gap: 18 },
  headerLink: { fontSize: 16, fontWeight: '600', color: colors.brandDark },
  headerTitle: { flexShrink: 1, fontSize: 17, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  headerStep: { fontSize: 14, fontWeight: '400', color: colors.muted },
  body: { flex: 1, alignItems: 'center' },
  bodyLandscape: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: 16 },
  paperArea: { alignItems: 'center' },
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
    width: PANEL_W - 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    paddingBottom: 8,
  },
  panelDone: { alignSelf: 'stretch', paddingHorizontal: 8 },
  portraitTools: { width: '100%', maxWidth: 560, paddingHorizontal: 16, gap: 4 },
  backdrop: { flex: 1, backgroundColor: 'rgba(31,36,48,0.75)' },
  overviewContent: { alignItems: 'center', padding: 24, gap: 12 },
  overviewTitle: { color: colors.card, fontSize: 20, fontWeight: '800' },
  overviewHint: { color: colors.card, opacity: 0.8 },
});

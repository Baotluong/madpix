import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Redirect, router } from 'expo-router';
import { NavigationBar } from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

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
const RAIL_W = 52;
/** Breathing room between the paper and the edge of the desk. */
const MARGIN = 6;
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

  const [strokes, setStrokes] = useState<Stroke[]>(game.draft);
  const [past, setPast] = useState<Stroke[][]>([]);
  const [future, setFuture] = useState<Stroke[][]>([]);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState(PALETTE[0]);
  const [sizeIndex, setSizeIndex] = useState(1);
  const [overview, setOverview] = useState(false);
  // Tools fold into a slim rail so the paper can take (almost) the whole screen.
  const [collapsed, setCollapsed] = useState(false);
  // The space left for the paper, measured rather than computed from insets.
  const [area, setArea] = useState<{ w: number; h: number } | null>(null);
  // The inspo word pops up when drawing starts, then hides; the bulb brings it back.
  const [showInspo, setShowInspo] = useState(!!game.prompt);
  useEffect(() => {
    if (!showInspo) return;
    const t = setTimeout(() => setShowInspo(false), INSPO_MS);
    return () => clearTimeout(t);
  }, [showInspo]);

  // Make the strip (plus the sliver) as big as the paper area allows.
  const hasSliver = turn > 0;
  const stripWidth = area
    ? Math.floor(Math.min(area.w - MARGIN * 2, (area.h - MARGIN * 2) / canvasHeight(1, unitsH, hasSliver)))
    : 0;

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

  const inspoButton = game.prompt && (
    <IconButton plain size={34} label="Show inspo word" onPress={() => setShowInspo(true)}>
      <Ionicons name="bulb-outline" size={22} color={colors.brandDark} />
    </IconButton>
  );
  const eyeButton = (
    <IconButton plain size={34} label="See the whole page" onPress={() => setOverview(true)}>
      <Ionicons name="eye-outline" size={23} color={colors.brandDark} />
    </IconButton>
  );

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top', 'bottom', 'left']} style={styles.paperArea}>
        <View
          style={styles.paperFit}
          onLayout={(e) => {
            const { width: w, height: h } = e.nativeEvent.layout;
            setArea((a) => (a && a.w === w && a.h === h ? a : { w, h }));
          }}>
          {stripWidth > 0 && (
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
          )}
        </View>
      </SafeAreaView>

      {collapsed ? (
        <SafeAreaView edges={['top', 'bottom', 'right']} style={styles.rail}>
          <IconButton plain size={34} label="Show tools" onPress={() => setCollapsed(false)}>
            <Ionicons name="chevron-back" size={24} color={colors.ink} />
          </IconButton>
          <IconButton size={34} label="Show tools" onPress={() => setCollapsed(false)}>
            {tool === 'eraser' ? (
              <MaterialCommunityIcons name="eraser" size={19} color={colors.ink} />
            ) : (
              <View style={[styles.railSwatch, { backgroundColor: color }]} />
            )}
          </IconButton>
          <IconButton plain size={34} label="Undo" disabled={past.length === 0} onPress={undo}>
            <Ionicons name="arrow-undo" size={20} color={colors.ink} />
          </IconButton>
          {inspoButton}
          {eyeButton}
          <View style={{ flex: 1 }} />
          <IconButton size={44} label="Done" selected onPress={done}>
            <Ionicons name="checkmark" size={26} color={colors.card} />
          </IconButton>
        </SafeAreaView>
      ) : (
        <SafeAreaView edges={['top', 'bottom', 'right']} style={styles.panel}>
          <View style={styles.panelTop}>
            <View style={styles.artistRow}>
              <Text style={styles.artist} numberOfLines={1}>
                {artist}
              </Text>
              <IconButton plain size={34} label="Hide tools" onPress={() => setCollapsed(true)}>
                <Ionicons name="chevron-forward" size={24} color={colors.ink} />
              </IconButton>
            </View>
            <View style={styles.controls}>
              <IconButton plain size={34} label="Quit" onPress={quit}>
                <Ionicons name="close" size={24} color={colors.muted} />
              </IconButton>
              {inspoButton}
              {eyeButton}
            </View>
          </View>
          <Toolbar
            vertical
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
        </SafeAreaView>
      )}

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
    </View>
  );
}

const styles = StyleSheet.create({
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
  screen: { flex: 1, flexDirection: 'row', backgroundColor: colors.desk },
  paperArea: { flex: 1 },
  paperFit: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg,
  },
  panelTop: { alignSelf: 'stretch', gap: 2 },
  artistRow: { flexDirection: 'row', alignItems: 'center' },
  artist: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.ink, paddingLeft: 4 },
  controls: { flexDirection: 'row', justifyContent: 'space-between' },
  done: { alignSelf: 'stretch', minHeight: 44 },
  rail: {
    width: RAIL_W,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.bg,
  },
  railSwatch: { width: 20, height: 20, borderRadius: 10 },
  backdrop: { flex: 1, backgroundColor: 'rgba(31,36,48,0.75)' },
  overviewContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 16, gap: 10 },
  overviewHint: { color: colors.card, opacity: 0.8 },
});

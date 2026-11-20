import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { canvasHeight, DrawingCanvas } from '@/drawing/drawing-canvas';
import { PageOverview } from '@/drawing/page-overview';
import { IconButton, PANEL_CONTENT_W, Toolbar, type Tool } from '@/drawing/toolbar';
import { STRIP_W, stripHeight } from '@/game/geometry';
import type { Game, Stroke } from '@/game/types';
import { confirm, notify } from '@/lib/confirm';
import { colors, PALETTE, SIZES } from '@/theme';

const PANEL_PAD = 10;
const PANEL_W = PANEL_CONTENT_W + PANEL_PAD * 2;
const RAIL_W = 52;
/** Breathing room between the paper and the edge of the desk. */
const MARGIN = 6;
const INSPO_MS = 2500;

type Props = {
  /** The page so far. The strip being drawn is game.sections.length; the one above it holds the sliver. */
  game: Game;
  initialStrokes: Stroke[];
  /** Every change, so a strip in progress survives leaving the screen. */
  onDraft: (strokes: Stroke[]) => void;
  /** After the artist confirms. If it throws, they stay here and see the error. */
  onDone: (strokes: Stroke[]) => void | Promise<void>;
  onQuit: () => void;
  quitLabel?: string;
  /** Shows an invite button (remote drawings with open spots). */
  onInvite?: () => void;
};

/** The drawing screen: one strip of paper (plus the sliver above it) and the tools. */
export function DrawingBoard({ game, initialStrokes, onDraft, onDone, onQuit, quitLabel = 'Quit', onInvite }: Props) {

  const turn = game.sections.length;
  // The panel grows by the right inset (Android's nav bar in landscape) instead of losing that room.
  const insets = useSafeAreaInsets();
  const isLast = turn === game.artists.length - 1;
  const unitsH = stripHeight(game);
  const { width: W, height: H } = useWindowDimensions();

  const [strokes, setStrokes] = useState<Stroke[]>(initialStrokes);
  const [past, setPast] = useState<Stroke[][]>([]);
  const [future, setFuture] = useState<Stroke[][]>([]);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState(PALETTE[0]);
  const [sizeIndex, setSizeIndex] = useState(1);
  const [overview, setOverview] = useState(false);
  const [busy, setBusy] = useState(false);
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
    onDraft(next);
  };
  const undo = () => {
    const prev = past[past.length - 1];
    if (!prev) return;
    setPast(past.slice(0, -1));
    setFuture([strokes, ...future]);
    setStrokes(prev);
    onDraft(prev);
  };
  const redo = () => {
    const [next, ...rest] = future;
    if (!next) return;
    setFuture(rest);
    setPast([...past, strokes]);
    setStrokes(next);
    onDraft(next);
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
    setBusy(true);
    try {
      await onDone(strokes);
    } catch (e) {
      notify("Couldn't fold your strip", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const pageAspect = (unitsH / STRIP_W) * game.artists.length;
  const overviewWidth = Math.min(W - 48, 420, (H - 100) / pageAspect);

  const inspoButton = game.prompt && (
    <IconButton plain size={34} label="Show inspo word" onPress={() => setShowInspo(true)}>
      <Ionicons name="bulb-outline" size={22} color={colors.brandDark} />
    </IconButton>
  );
  const inviteButton = onInvite && (
    <IconButton plain size={34} label="Invite artists" onPress={onInvite}>
      <Ionicons name="person-add-outline" size={21} color={colors.brandDark} />
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
        <SafeAreaView
          edges={['top', 'bottom', 'right']}
          style={[styles.rail, { width: RAIL_W + insets.right }]}>
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
          {inviteButton}
          {eyeButton}
          <View style={{ flex: 1 }} />
          <IconButton size={44} label="Done" selected disabled={busy} onPress={done}>
            <Ionicons name="checkmark" size={26} color={colors.card} />
          </IconButton>
        </SafeAreaView>
      ) : (
        <SafeAreaView
          edges={['top', 'bottom', 'right']}
          style={[styles.panel, { width: PANEL_W + insets.right }]}>
          <View style={styles.controls}>
            <IconButton plain size={34} label={quitLabel} onPress={onQuit}>
              <Ionicons name="close" size={24} color={colors.muted} />
            </IconButton>
            {inspoButton}
            {inviteButton}
            {eyeButton}
            <IconButton plain size={34} label="Hide tools" onPress={() => setCollapsed(true)}>
              <Ionicons name="chevron-forward" size={24} color={colors.ink} />
            </IconButton>
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
          <Button label={busy ? 'Folding...' : 'Done'} onPress={done} disabled={busy} style={styles.done} />
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
    paddingHorizontal: PANEL_PAD,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg,
  },
  controls: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'space-between' },
  done: { alignSelf: 'stretch', minHeight: 44 },
  rail: {
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

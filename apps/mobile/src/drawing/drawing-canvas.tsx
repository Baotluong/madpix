import { Canvas, DashPathEffect, Group, Line, Rect, rect } from '@shopify/react-native-skia';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';

import { SLIVER, STRIP_W } from '@/game/geometry';
import type { Stroke } from '@/game/types';
import { colors } from '@/theme';
import { StrokeShape, Strokes } from './strokes';

type Props = {
  /** Width of the strip on screen, in px. */
  width: number;
  /** Strip height in units. */
  unitsH: number;
  strokes: Stroke[];
  /** The previous artist's strokes. Their bottom edge (the sliver) shows above this strip. */
  prevStrokes?: Stroke[];
  /** Hint at the band the next artist will see. False for the last artist. */
  showNextHint: boolean;
  color: string;
  /** Pen width in units. */
  penWidth: number;
  onStroke: (stroke: Stroke) => void;
};

/** Skip points closer than this (units) to the last one, to keep strokes small. */
const MIN_STEP = 2;
const FOLD_DASH = [8, 6];
/** How far past the paper's edges a point may go, in units. */
const EDGE = 40;

/** Screen height of the drawing area for a given width, including the sliver if there is one. */
export function canvasHeight(width: number, unitsH: number, hasSliver: boolean) {
  const stripPx = (unitsH * width) / STRIP_W;
  return stripPx * (hasSliver ? 1 + SLIVER : 1);
}

/**
 * One Skia canvas holding the previous artist's sliver (read-only, on top) and
 * this artist's strip. Keeping both in one canvas means the sliver redraws with
 * every stroke.
 */
export function DrawingCanvas(p: Props) {
  const { width, unitsH, strokes, prevStrokes, showNextHint, color, penWidth, onStroke } = p;
  const scale = width / STRIP_W;
  const stripPx = unitsH * scale;
  const sliverPx = prevStrokes ? stripPx * SLIVER : 0;
  const height = sliverPx + stripPx;
  const hintTop = sliverPx + stripPx * (1 - SLIVER);

  // The stroke being drawn: state for rendering, plus a ref so gesture
  // callbacks always see the latest points without waiting for a render.
  const [live, setLive] = useState<Stroke | null>(null);
  const liveRef = useRef<Stroke | null>(null);
  const show = (s: Stroke | null) => {
    liveRef.current = s;
    setLive(s);
  };
  // Dragging off the paper keeps the stroke going, but points stay just past the
  // edges: that ink is clipped anyway, and the server rejects far-off points.
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  // A tenth of a unit is far finer than a finger, and keeps strips small to store and send.
  const toUnits = (x: number, y: number) => [
    round1(clamp(x / scale, -EDGE, STRIP_W + EDGE)),
    round1(clamp((y - sliverPx) / scale, -unitsH * SLIVER - EDGE, unitsH + EDGE)),
  ];

  const pan = usePanGesture({
    runOnJS: true,
    minDistance: 0,
    maxPointers: 1,
    // Strokes may start on the sliver (to continue a line from it), but ink is
    // clipped to this artist's strip, so the sliver itself never changes.
    onBegin: (e) => show({ color, width: penWidth, points: toUnits(e.x, e.y) }),
    onUpdate: (e) => {
      const s = liveRef.current;
      if (!s) return;
      const [x, y] = toUnits(e.x, e.y);
      const n = s.points.length;
      if (Math.hypot(x - s.points[n - 2], y - s.points[n - 1]) < MIN_STEP) return;
      show({ ...s, points: [...s.points, x, y] });
    },
    onFinalize: () => {
      const s = liveRef.current;
      show(null);
      if (s) onStroke(s);
    },
  });

  return (
    <GestureDetector gesture={pan}>
      <View style={{ width, height }}>
        <Canvas style={{ width, height }}>
          <Rect x={0} y={0} width={width} height={height} color={colors.paper} />

          {prevStrokes && (
            <Group clip={rect(0, 0, width, sliverPx)}>
              <Group transform={[{ scale }, { translateY: -unitsH * (1 - SLIVER) }]}>
                <Strokes strokes={prevStrokes} />
              </Group>
              <Rect x={0} y={0} width={width} height={sliverPx} color="rgba(91,141,230,0.10)" />
            </Group>
          )}

          {showNextHint && (
            <Rect x={0} y={hintTop} width={width} height={height - hintTop} color="rgba(91,141,230,0.05)" />
          )}

          <Group clip={rect(0, sliverPx, width, stripPx)}>
            <Group transform={[{ translateY: sliverPx }, { scale }]}>
              <Strokes strokes={strokes} />
              {live && <StrokeShape stroke={live} />}
            </Group>
          </Group>

          {prevStrokes && (
            <Line p1={{ x: 0, y: sliverPx }} p2={{ x: width, y: sliverPx }} color={colors.brand} strokeWidth={2}>
              <DashPathEffect intervals={FOLD_DASH} />
            </Line>
          )}
          {showNextHint && (
            <Line
              p1={{ x: 0, y: hintTop }}
              p2={{ x: width, y: hintTop }}
              color="rgba(91,141,230,0.35)"
              strokeWidth={1}>
              <DashPathEffect intervals={FOLD_DASH} />
            </Line>
          )}
        </Canvas>
        {showNextHint && (
          <Text pointerEvents="none" style={[styles.hint, { top: hintTop + 2 }]}>
            next artist sees this
          </Text>
        )}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  hint: { position: 'absolute', right: 6, fontSize: 10, color: colors.brand, opacity: 0.6 },
});

const round1 = (v: number) => Math.round(v * 10) / 10;

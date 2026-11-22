import { Canvas, Group, Path } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { STRIP_W } from '@/game/geometry';
import type { Stroke } from '@/game/types';
import { colors } from '@/theme';
import { inkColor, PaperGrain } from './paper';
import { strokePath } from './strokes';

/** Taps (dots) count as this much ink, so they get a moment on screen too. */
const MIN_STROKE = 40;

const strokeLength = (points: number[]) => {
  let len = 0;
  for (let i = 2; i < points.length; i += 2) {
    len += Math.hypot(points[i] - points[i - 2], points[i + 1] - points[i - 1]);
  }
  return Math.max(len, MIN_STROKE);
};

/** Where each stroke starts and ends in the replay, as fractions 0..1, by ink length. */
function spans(strokes: Stroke[]): [number, number][] {
  const lengths = strokes.map((s) => strokeLength(s.points));
  const total = lengths.reduce((a, b) => a + b, 0) || 1;
  let at = 0;
  return lengths.map((len) => {
    const span: [number, number] = [at / total, (at + len) / total];
    at += len;
    return span;
  });
}

/**
 * How long a strip takes to redraw: about a second for a simple sketch, longer for detailed ones,
 * never more than 3 seconds.
 */
export function replayMs(strokes: Stroke[]) {
  const ink = strokes.reduce((sum, s) => sum + strokeLength(s.points), 0);
  return Math.round(Math.min(3000, Math.max(700, 600 + ink * 0.06)));
}

/** One stroke, drawn up to where the replay has reached. */
function ReplayStroke({ stroke, from, to, progress }: { stroke: Stroke; from: number; to: number; progress: SharedValue<number> }) {
  const path = useMemo(() => strokePath(stroke.points), [stroke.points]);
  const end = useDerivedValue(() => {
    const p = progress.value;
    if (p <= from) return 0;
    if (p >= to) return 1;
    return (p - from) / (to - from);
  });
  return (
    <Path
      path={path}
      end={end}
      style="stroke"
      strokeWidth={stroke.width}
      strokeCap="round"
      strokeJoin="round"
      color={inkColor(stroke.color)}
    />
  );
}

/**
 * A strip that redraws its strokes in the order they were drawn, as [progress] goes 0 → 1.
 * We don't record timing, so the pen moves at a steady speed.
 */
export function ReplayCanvas({
  strokes,
  width,
  unitsH,
  progress,
}: {
  strokes: Stroke[];
  width: number;
  unitsH: number;
  progress: SharedValue<number>;
}) {
  const scale = width / STRIP_W;
  const height = unitsH * scale;
  const ranges = useMemo(() => spans(strokes), [strokes]);
  return (
    <Canvas style={{ width, height, backgroundColor: colors.paper }}>
      <Group transform={[{ scale }]}>
        {strokes.map((s, i) => (
          <ReplayStroke key={i} stroke={s} from={ranges[i][0]} to={ranges[i][1]} progress={progress} />
        ))}
      </Group>
      <PaperGrain width={width} height={height} />
    </Canvas>
  );
}

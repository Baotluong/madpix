import { Canvas, Group } from '@shopify/react-native-skia';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';

import { SECTION } from '@/game/geometry';
import type { Stroke } from '@/game/types';
import { colors } from '@/theme';
import { StrokeShape, Strokes } from './strokes';

type Props = {
  /** Size of the square canvas on screen, in px. */
  size: number;
  strokes: Stroke[];
  color: string;
  /** Pen width in section units. */
  penWidth: number;
  onStroke: (stroke: Stroke) => void;
};

/** Skip points closer than this (section units) to the last one, to keep strokes small. */
const MIN_STEP = 2;

export function DrawingCanvas({ size, strokes, color, penWidth, onStroke }: Props) {
  const scale = size / SECTION;
  // The stroke being drawn: state for rendering, plus a ref so gesture
  // callbacks always see the latest points without waiting for a render.
  const [live, setLive] = useState<Stroke | null>(null);
  const liveRef = useRef<Stroke | null>(null);
  const show = (s: Stroke | null) => {
    liveRef.current = s;
    setLive(s);
  };

  const pan = usePanGesture({
    runOnJS: true,
    minDistance: 0,
    maxPointers: 1,
    onBegin: (e) => show({ color, width: penWidth, points: [e.x / scale, e.y / scale] }),
    onUpdate: (e) => {
      const s = liveRef.current;
      if (!s) return;
      const x = e.x / scale;
      const y = e.y / scale;
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
      <View style={[styles.wrap, { width: size, height: size }]}>
        <Canvas style={{ width: size, height: size }}>
          <Group transform={[{ scale }]}>
            <Strokes strokes={strokes} />
            {live && <StrokeShape stroke={live} />}
          </Group>
        </Canvas>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.paper, overflow: 'hidden' },
});

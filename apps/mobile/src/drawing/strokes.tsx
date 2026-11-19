import { Canvas, Group, Path, Skia, type SkPath } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { SECTION } from '@/game/geometry';
import type { Stroke } from '@/game/types';
import { colors } from '@/theme';

/** Builds a smooth path through the points, using midpoints as curve anchors. */
export function strokePath(points: number[]): SkPath {
  const path = Skia.PathBuilder.Make();
  if (points.length < 2) return path.detach();
  path.moveTo(points[0], points[1]);
  if (points.length === 2) {
    // A tap: a tiny segment with round caps draws a dot.
    path.lineTo(points[0] + 0.01, points[1]);
    return path.detach();
  }
  for (let i = 2; i < points.length - 2; i += 2) {
    const midX = (points[i] + points[i + 2]) / 2;
    const midY = (points[i + 1] + points[i + 3]) / 2;
    path.quadTo(points[i], points[i + 1], midX, midY);
  }
  path.lineTo(points[points.length - 2], points[points.length - 1]);
  return path.detach();
}

export function StrokeShape({ stroke }: { stroke: Stroke }) {
  return (
    <Path
      path={strokePath(stroke.points)}
      style="stroke"
      strokeWidth={stroke.width}
      strokeCap="round"
      strokeJoin="round"
      color={stroke.color}
    />
  );
}

const MemoStroke = memo(function MemoStroke({ stroke }: { stroke: Stroke }) {
  const path = useMemo(() => strokePath(stroke.points), [stroke.points]);
  return (
    <Path
      path={path}
      style="stroke"
      strokeWidth={stroke.width}
      strokeCap="round"
      strokeJoin="round"
      color={stroke.color}
    />
  );
});

/** Finished strokes. Memoized so the canvas only redraws the stroke being drawn. */
export const Strokes = memo(function Strokes({ strokes }: { strokes: Stroke[] }) {
  return (
    <>
      {strokes.map((s, i) => (
        <MemoStroke key={i} stroke={s} />
      ))}
    </>
  );
});

type SectionCanvasProps = {
  strokes: Stroke[];
  /** Width on screen in px. The height follows from fromY/toY. */
  width: number;
  /** Which horizontal band of the section to show, in section units. */
  fromY?: number;
  toY?: number;
  style?: StyleProp<ViewStyle>;
};

/** Draws one section (or a band of it, like the sliver) at a given screen width. */
export function SectionCanvas({ strokes, width, fromY = 0, toY = SECTION, style }: SectionCanvasProps) {
  const scale = width / SECTION;
  const height = (toY - fromY) * scale;
  return (
    // Skia's web canvas needs a flat style object, not an array.
    <Canvas style={StyleSheet.flatten([{ width, height, backgroundColor: colors.paper }, style])}>
      <Group transform={[{ scale }, { translateY: -fromY }]}>
        <Strokes strokes={strokes} />
      </Group>
    </Canvas>
  );
}

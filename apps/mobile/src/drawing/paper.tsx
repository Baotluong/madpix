import { ColorMatrix, Group, Rect, Turbulence } from '@shopify/react-native-skia';

import { colors } from '@/theme';

/**
 * The eraser paints with this color, and that's how it's saved (strips from before the paper
 * turned off-white were erased with it too). It's drawn as the paper color.
 */
export const ERASER = '#FFFFFF';

/** The color to draw a stroke with: the eraser shows as paper. */
export const inkColor = (color: string) => (color.toUpperCase() === ERASER ? colors.paper : color);

/** Turns the noise gray, so it reads as paper fibers rather than colored speckles. */
const GRAY = [0.33, 0.33, 0.33, 0, 0, 0.33, 0.33, 0.33, 0, 0, 0.33, 0.33, 0.33, 0, 0, 0, 0, 0, 1, 0];

/**
 * A faint paper grain over everything in a canvas, ink included, so ink and erased spots sit
 * on the same paper. Skia makes the noise itself: no image to load.
 */
export function PaperGrain({ width, height }: { width: number; height: number }) {
  return (
    <Group blendMode="multiply" opacity={0.09}>
      <Rect x={0} y={0} width={width} height={height}>
        <Turbulence freqX={0.8} freqY={0.8} octaves={2} seed={3} />
        <ColorMatrix matrix={GRAY} />
      </Rect>
    </Group>
  );
}

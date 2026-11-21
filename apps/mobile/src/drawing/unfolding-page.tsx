import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FlipInXDown, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { STRIP_W, stripHeight } from '@/game/geometry';
import type { Game, Stroke } from '@/game/types';
import { colors } from '@/theme';
import { ReplayCanvas, replayMs } from './replay';
import { SectionCanvas } from './strokes';

const FLIP_MS = 500;

type Step = { flipAt: number; drawAt: number; drawMs: number };

/**
 * When each strip unfolds and redraws: strips go top to bottom, each one flips down, then its
 * lines redraw (about a second each, up to 3 for detailed strips). [total] is when it's all done.
 */
export function unfoldSchedule(game: Game, startDelay = 300) {
  let t = startDelay;
  const steps: Step[] = game.sections.map((s) => {
    const flipAt = t;
    const drawAt = t + FLIP_MS * 0.7;
    const drawMs = replayMs(s.strokes);
    t = drawAt + drawMs + 120;
    return { flipAt, drawAt, drawMs };
  });
  return { steps, total: t };
}

/** The finished page, unfolding strip by strip with its lines redrawing when [animate] is on. */
export function UnfoldingPage({ game, width, animate }: { game: Game; width: number; animate: boolean }) {
  const unitsH = stripHeight(game);
  const { steps } = unfoldSchedule(game);
  return (
    <View style={[styles.page, { width }]}>
      {game.sections.map((section, i) => (
        <Strip
          key={i}
          strokes={section.strokes}
          width={width}
          unitsH={unitsH}
          step={steps[i]}
          animate={animate}
          crease={i > 0}
        />
      ))}
    </View>
  );
}

function Strip(p: { strokes: Stroke[]; width: number; unitsH: number; step: Step; animate: boolean; crease: boolean }) {
  const { strokes, width, unitsH, step, animate, crease } = p;
  const progress = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (!animate) return;
    progress.value = withDelay(step.drawAt, withTiming(1, { duration: step.drawMs, easing: Easing.linear }));
    // Runs once per mount; replaying remounts the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Animated.View entering={animate ? FlipInXDown.delay(step.flipAt).duration(FLIP_MS) : undefined}>
      {animate ? (
        <ReplayCanvas strokes={strokes} width={width} unitsH={unitsH} progress={progress} />
      ) : (
        <SectionCanvas strokes={strokes} width={width} unitsH={unitsH} />
      )}
      {crease && <View pointerEvents="none" style={[styles.crease, { width }]} />}
    </Animated.View>
  );
}

/** Height on screen of one strip at [width]. */
export const stripPx = (game: Game, width: number) => (stripHeight(game) * width) / STRIP_W;

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.paper,
    borderRadius: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  // A soft fold: a faint shadow line with a lighter one just below it.
  crease: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(31,36,48,0.08)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.7)',
  },
});

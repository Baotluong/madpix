import { StyleSheet, Text, View } from 'react-native';

import { SLIVER, STRIP_W, stripHeight } from '@/game/geometry';
import type { Game, Stroke } from '@/game/types';
import { colors } from '@/theme';
import { SectionCanvas } from './strokes';

type Props = {
  game: Game;
  /** The current artist's strokes (not saved to the game yet). */
  strokes: Stroke[];
  /** Width of the page on screen in px. */
  width: number;
};

/**
 * The whole page, zoomed out, the way it looks folded: earlier strips are
 * folded over (only the last one's sliver shows), later ones are blank.
 */
export function PageOverview({ game, strokes, width }: Props) {
  const turn = game.sections.length;
  const unitsH = stripHeight(game);
  const stripPx = (unitsH * width) / STRIP_W;
  const sliverPx = stripPx * SLIVER;
  return (
    <View style={[styles.page, { width }]}>
      {game.artists.map((artist, i) => {
        if (i < turn) {
          const isPrev = i === turn - 1;
          return (
            <View key={i} style={{ width, height: stripPx }}>
              <View style={[styles.folded, { height: isPrev ? stripPx - sliverPx : stripPx }]}>
                <Text style={styles.foldedText}>Folded · {artist}</Text>
              </View>
              {isPrev && (
                <SectionCanvas
                  strokes={game.sections[i].strokes}
                  width={width}
                  unitsH={unitsH}
                  fromY={unitsH * (1 - SLIVER)}
                />
              )}
            </View>
          );
        }
        if (i === turn) {
          return (
            <View key={i} style={[styles.current, { width, height: stripPx }]}>
              <SectionCanvas strokes={strokes} width={width - 4} unitsH={unitsH} />
            </View>
          );
        }
        return (
          <View key={i} style={[styles.blank, { width, height: stripPx }]}>
            <Text style={styles.blankText}>{artist}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.paper, borderRadius: 4, overflow: 'hidden' },
  folded: { backgroundColor: colors.folded, alignItems: 'center', justifyContent: 'center' },
  foldedText: { color: colors.muted, fontWeight: '600' },
  current: { borderWidth: 2, borderColor: colors.brand },
  blank: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blankText: { color: colors.muted },
});

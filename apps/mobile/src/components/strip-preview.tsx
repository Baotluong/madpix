import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/button';
import { SectionCanvas } from '@/drawing/strokes';
import { STRIP_W } from '@/game/geometry';
import type { Stroke } from '@/game/types';
import { colors } from '@/theme';

/** "See my strip": a look at the strip I already folded, while the others are still drawing. */
export function MyStripButton({ strokes, unitsH }: { strokes: Stroke[]; unitsH: number }) {
  const [open, setOpen] = useState(false);
  const { width: W, height: H } = useWindowDimensions();
  // As big as fits: the strip is twice as wide as it is tall.
  const width = Math.floor(Math.min(W - 64, ((H - 140) * STRIP_W) / unitsH));
  return (
    <>
      <Button label="See my strip" variant="ghost" onPress={() => setOpen(true)} />
      <Modal
        visible={open}
        transparent
        animationType="fade"
        supportedOrientations={['landscape', 'portrait']}
        onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel="Close" />
          <Text style={styles.title}>Your strip</Text>
          <View style={styles.paper}>
            <SectionCanvas strokes={strokes} width={width} unitsH={unitsH} />
          </View>
          <Button label="Close" variant="secondary" onPress={() => setOpen(false)} />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(31,36,48,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.card },
  paper: { borderRadius: 4, overflow: 'hidden' },
});

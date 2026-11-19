import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, PALETTE, SIZES } from '@/theme';

export type Tool = 'pen' | 'eraser';

type Props = {
  tool: Tool;
  color: string;
  sizeIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  /** Side panel (landscape) instead of rows under the canvas. */
  vertical?: boolean;
  onTool: (t: Tool) => void;
  onColor: (c: string) => void;
  onSize: (i: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
};

/** Deliberately small: a pen in 3 sizes, an eraser, 8 colors, undo/redo, clear. */
export function Toolbar(p: Props) {
  const swatchSize = p.vertical ? 32 : 30;
  return (
    <View style={[styles.wrap, p.vertical && styles.wrapVertical]}>
      <View style={[styles.row, p.vertical && styles.grid]}>
        {PALETTE.map((c) => {
          const selected = p.tool === 'pen' && p.color === c;
          return (
            <Pressable
              key={c}
              accessibilityLabel={`Color ${c}`}
              onPress={() => {
                p.onColor(c);
                p.onTool('pen');
              }}
              style={[
                styles.swatch,
                { backgroundColor: c, width: swatchSize, height: swatchSize, borderRadius: swatchSize / 2 },
                selected && styles.swatchSelected,
              ]}
            />
          );
        })}
      </View>
      <View style={[styles.row, p.vertical && styles.grid]}>
        {SIZES.map((s, i) => (
          <IconButton
            key={s}
            label={['Small', 'Medium', 'Large'][i] + ' brush'}
            selected={p.sizeIndex === i}
            onPress={() => p.onSize(i)}>
            <View
              style={{
                width: 5 + i * 5,
                height: 5 + i * 5,
                borderRadius: 10,
                backgroundColor:
                  p.sizeIndex === i ? colors.card : p.tool === 'eraser' ? colors.muted : p.color,
              }}
            />
          </IconButton>
        ))}
      </View>
      <View style={[styles.row, p.vertical && styles.grid]}>
        <IconButton label="Eraser" selected={p.tool === 'eraser'} onPress={() => p.onTool('eraser')}>
          <MaterialCommunityIcons name="eraser" size={20} color={p.tool === 'eraser' ? colors.card : colors.ink} />
        </IconButton>
        <IconButton label="Undo" disabled={!p.canUndo} onPress={p.onUndo}>
          <Ionicons name="arrow-undo" size={18} color={colors.ink} />
        </IconButton>
        <IconButton label="Redo" disabled={!p.canRedo} onPress={p.onRedo}>
          <Ionicons name="arrow-redo" size={18} color={colors.ink} />
        </IconButton>
        <IconButton label="Clear" disabled={!p.canUndo} onPress={p.onClear}>
          <Ionicons name="trash-outline" size={18} color={colors.ink} />
        </IconButton>
      </View>
    </View>
  );
}

function IconButton(props: {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.label}
      onPress={props.onPress}
      disabled={props.disabled}
      style={[styles.iconBtn, props.selected && styles.btnSelected, props.disabled && { opacity: 0.3 }]}>
      {props.children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, paddingVertical: 8 },
  wrapVertical: { gap: 14, paddingVertical: 0 },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 8 },
  grid: { gap: 6, width: 164 },
  swatch: { borderWidth: 2, borderColor: colors.card },
  swatchSelected: { borderColor: colors.ink, transform: [{ scale: 1.15 }] },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  btnSelected: { backgroundColor: colors.brandDark },
});

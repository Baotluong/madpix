import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, PALETTE, SIZES } from '@/theme';

export type Tool = 'pen' | 'eraser';

/** Width of the toolbar's content when it sits in the side panel. */
export const PANEL_CONTENT_W = 176;

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
  const swatch = p.vertical ? 32 : 30;
  const btn = p.vertical ? 38 : 36;
  const row = [styles.row, p.vertical && styles.grid];
  return (
    <View style={[styles.wrap, p.vertical && styles.wrapVertical]}>
      <View style={row}>
        {PALETTE.map((c) => {
          const selected = p.tool === 'pen' && p.color === c;
          return (
            <Pressable
              key={c}
              accessibilityLabel={`Color ${c}`}
              hitSlop={4}
              onPress={() => {
                p.onColor(c);
                p.onTool('pen');
              }}
              style={[
                styles.swatch,
                { backgroundColor: c, width: swatch, height: swatch, borderRadius: swatch / 2 },
                selected && styles.swatchSelected,
              ]}
            />
          );
        })}
      </View>
      <View style={row}>
        {SIZES.map((s, i) => (
          <IconButton
            key={s}
            size={p.vertical ? 44 : 36}
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
      <View style={row}>
        <IconButton size={btn} label="Eraser" selected={p.tool === 'eraser'} onPress={() => p.onTool('eraser')}>
          <MaterialCommunityIcons name="eraser" size={19} color={p.tool === 'eraser' ? colors.card : colors.ink} />
        </IconButton>
        <IconButton size={btn} label="Undo" disabled={!p.canUndo} onPress={p.onUndo}>
          <Ionicons name="arrow-undo" size={17} color={colors.ink} />
        </IconButton>
        <IconButton size={btn} label="Redo" disabled={!p.canRedo} onPress={p.onRedo}>
          <Ionicons name="arrow-redo" size={17} color={colors.ink} />
        </IconButton>
        <IconButton size={btn} label="Clear" disabled={!p.canUndo} onPress={p.onClear}>
          <Ionicons name="trash-outline" size={17} color={colors.ink} />
        </IconButton>
      </View>
    </View>
  );
}

export function IconButton(props: {
  label: string;
  size?: number;
  selected?: boolean;
  disabled?: boolean;
  plain?: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  const size = props.size ?? 36;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.label}
      onPress={props.onPress}
      disabled={props.disabled}
      hitSlop={4}
      style={[
        styles.iconBtn,
        { width: size, height: size },
        props.plain && { backgroundColor: 'transparent' },
        props.selected && styles.btnSelected,
        props.disabled && { opacity: 0.3 },
      ]}>
      {props.children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, paddingVertical: 8 },
  wrapVertical: { gap: 12, paddingVertical: 0 },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 8 },
  grid: { width: PANEL_CONTENT_W, justifyContent: 'space-between', gap: 6 },
  swatch: { borderWidth: 2, borderColor: colors.card },
  swatchSelected: { borderColor: colors.ink, transform: [{ scale: 1.15 }] },
  iconBtn: { borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  btnSelected: { backgroundColor: colors.brandDark },
});

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, PALETTE, SIZES } from '@/theme';

export type Tool = 'pen' | 'eraser';

type Props = {
  tool: Tool;
  color: string;
  sizeIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  onTool: (t: Tool) => void;
  onColor: (c: string) => void;
  onSize: (i: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
};

/** Deliberately small: a pen in 3 sizes, an eraser, 8 colors, undo/redo, clear. */
export function Toolbar(p: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
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
              style={[styles.swatch, { backgroundColor: c }, selected && styles.swatchSelected]}
            />
          );
        })}
      </View>
      <View style={styles.row}>
        {SIZES.map((s, i) => (
          <Pressable
            key={s}
            accessibilityLabel={['Small', 'Medium', 'Large'][i] + ' brush'}
            onPress={() => p.onSize(i)}
            style={[styles.sizeBtn, p.sizeIndex === i && styles.btnSelected]}>
            <View
              style={{
                width: 6 + i * 6,
                height: 6 + i * 6,
                borderRadius: 20,
                backgroundColor: p.tool === 'eraser' ? colors.muted : p.color,
              }}
            />
          </Pressable>
        ))}
        <ToolButton label="Eraser" selected={p.tool === 'eraser'} onPress={() => p.onTool('eraser')} />
        <ToolButton label="Undo" disabled={!p.canUndo} onPress={p.onUndo} />
        <ToolButton label="Redo" disabled={!p.canRedo} onPress={p.onRedo} />
        <ToolButton label="Clear" disabled={!p.canUndo} onPress={p.onClear} />
      </View>
    </View>
  );
}

function ToolButton(props: { label: string; selected?: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={props.onPress}
      disabled={props.disabled}
      style={[styles.toolBtn, props.selected && styles.btnSelected, props.disabled && { opacity: 0.35 }]}>
      <Text style={[styles.toolText, props.selected && { color: colors.card }]}>{props.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, paddingVertical: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 8 },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: colors.card },
  swatchSelected: { borderColor: colors.ink, transform: [{ scale: 1.15 }] },
  sizeBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  btnSelected: { backgroundColor: colors.brandDark },
  toolBtn: { paddingHorizontal: 10, height: 36, borderRadius: 8, justifyContent: 'center', backgroundColor: colors.card },
  toolText: { fontSize: 13, fontWeight: '600', color: colors.ink },
});

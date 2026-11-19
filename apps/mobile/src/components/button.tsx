import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/theme';

type Props = {
  label: string;
  /** A smaller second line, e.g. what a mode means. */
  sublabel?: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, sublabel, onPress, variant = 'primary', disabled, style }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && { opacity: 0.8 },
        disabled && { opacity: 0.4 },
        style,
      ]}>
      <Text style={[styles.text, variant !== 'primary' && { color: colors.brandDark }]}>{label}</Text>
      {sublabel && (
        <Text style={[styles.sub, { color: variant === 'primary' ? colors.card : colors.muted }]}>{sublabel}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.brandDark },
  secondary: { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.brandDark },
  ghost: { backgroundColor: 'transparent' },
  text: { fontSize: 17, fontWeight: '700', color: colors.card },
  sub: { fontSize: 13, fontWeight: '500', marginTop: 1, opacity: 0.9, textAlign: 'center' },
});

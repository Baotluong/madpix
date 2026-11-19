import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/theme';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = 'primary', disabled, style }: Props) {
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.brandDark },
  secondary: { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.brandDark },
  ghost: { backgroundColor: 'transparent' },
  text: { fontSize: 17, fontWeight: '700', color: colors.card },
});

import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet } from 'react-native';

import { colors } from '@/theme';

/** A square die button that rolls something random (a name, an inspo word). Sits next to a 44-high input. */
export function DieButton({
  label,
  onPress,
  background = colors.card,
}: {
  label: string;
  onPress: () => void;
  background?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.die, { backgroundColor: background }, pressed && { opacity: 0.6 }]}>
      <Ionicons name="dice-outline" size={24} color={colors.brandDark} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  die: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});

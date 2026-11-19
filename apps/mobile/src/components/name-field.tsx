import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { randomArtistName } from '@/remote/names';
import { colors } from '@/theme';

/** The artist's name, with a die that rolls a silly one ("Picasso Platypus"). */
export function NameField({ value, onChange }: { value: string; onChange: (name: string) => void }) {
  return (
    <View style={styles.row}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder="Your name"
        placeholderTextColor={colors.muted}
        maxLength={20}
        selectTextOnFocus
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Random name"
        hitSlop={6}
        onPress={() => onChange(randomArtistName(value))}
        style={({ pressed }) => [styles.die, pressed && { opacity: 0.6 }]}>
        <Ionicons name="dice-outline" size={24} color={colors.brandDark} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 17,
    fontWeight: '600',
    color: colors.ink,
  },
  die: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
});

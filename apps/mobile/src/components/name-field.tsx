import { StyleSheet, TextInput, View } from 'react-native';

import { DieButton } from '@/components/die-button';
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
      <DieButton label="Random name" onPress={() => onChange(randomArtistName(value))} />
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
});

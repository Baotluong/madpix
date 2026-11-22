import { StyleSheet, TextInput, View } from 'react-native';

import { DieButton } from '@/components/die-button';
import { randomArtistName } from '@/remote/names';
import { colors } from '@/theme';

/** The artist's name, with a die that rolls a silly one ("Picasso Platypus"). */
export function NameField({
  value,
  onChange,
  placeholder = 'Your name',
  avoid,
}: {
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
  /** Names the die shouldn't roll, like the other artists'. */
  avoid?: string[];
}) {
  return (
    <View style={styles.row}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        maxLength={20}
        selectTextOnFocus
      />
      <DieButton label="Random name" onPress={() => onChange(randomArtistName([value, ...(avoid ?? [])]))} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 17,
    fontWeight: '600',
    color: colors.ink,
  },
});

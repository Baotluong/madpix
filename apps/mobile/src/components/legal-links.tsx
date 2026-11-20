import { Pressable, StyleSheet, Text, View } from 'react-native';

import { openLink, PRIVACY_URL, RULES_URL } from '@/lib/links';
import { colors } from '@/theme';

/** Small "Rules · Privacy" links, plus any extra ones (like "Delete my online data"). */
export function LegalLinks({ extra }: { extra?: { label: string; onPress: () => void }[] }) {
  const links = [
    { label: 'Rules', onPress: () => openLink(RULES_URL) },
    { label: 'Privacy', onPress: () => openLink(PRIVACY_URL) },
    ...(extra ?? []),
  ];
  return (
    <View style={styles.row}>
      {links.map((l, i) => (
        <View key={l.label} style={styles.item}>
          {i > 0 && <Text style={styles.text}>·</Text>}
          <Pressable accessibilityRole="link" hitSlop={6} onPress={l.onPress}>
            <Text style={[styles.text, styles.link]}>{l.label}</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingVertical: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { fontSize: 13, color: colors.muted },
  link: { textDecorationLine: 'underline' },
});

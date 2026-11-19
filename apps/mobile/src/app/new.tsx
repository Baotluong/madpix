import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { MAX_ARTISTS, MIN_ARTISTS } from '@/game/geometry';
import { randomPrompt } from '@/game/prompts';
import { startGame, useGameStore } from '@/game/store';
import { confirm } from '@/lib/confirm';
import { colors } from '@/theme';

const COUNTS = Array.from({ length: MAX_ARTISTS - MIN_ARTISTS + 1 }, (_, i) => MIN_ARTISTS + i);

export default function NewGame() {
  const current = useGameStore((s) => s.current);
  const [count, setCount] = useState(2);
  const [names, setNames] = useState<string[]>(Array(MAX_ARTISTS).fill(''));
  const [inspoOn, setInspoOn] = useState(true);
  const [prompt, setPrompt] = useState(() => randomPrompt());

  const start = async () => {
    if (
      current &&
      !(await confirm('Start over?', 'This ends the game in progress. It will not be saved.', 'Start new'))
    ) {
      return;
    }
    const artists = names.slice(0, count).map((n, i) => n.trim() || `Artist ${i + 1}`);
    const word = inspoOn && prompt.trim() ? prompt.trim().toLowerCase() : null;
    startGame(artists, word);
    router.replace('/play');
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>How many artists?</Text>
      <Text style={styles.hint}>The page gets folded into one strip per artist.</Text>
      <View style={styles.segment}>
        {COUNTS.map((n) => (
          <Pressable
            key={n}
            onPress={() => setCount(n)}
            style={[styles.segmentBtn, count === n && styles.segmentOn]}>
            <Text style={[styles.segmentText, count === n && styles.segmentTextOn]}>{n}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Names (optional)</Text>
      {Array.from({ length: count }, (_, i) => (
        <TextInput
          key={i}
          style={styles.input}
          placeholder={`Artist ${i + 1}`}
          placeholderTextColor={colors.muted}
          value={names[i]}
          maxLength={20}
          onChangeText={(t) => setNames((prev) => prev.map((p, j) => (j === i ? t : p)))}
        />
      ))}

      <View style={styles.inspoHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Inspo word</Text>
          <Text style={styles.hint}>
            Stuck on what to draw? Everyone gets the same word, but nobody knows which part they&apos;re drawing.
            It&apos;s just a suggestion.
          </Text>
        </View>
        <Switch
          value={inspoOn}
          onValueChange={setInspoOn}
          trackColor={{ true: colors.brand, false: colors.line }}
          thumbColor={colors.card}
        />
      </View>
      {inspoOn && (
        <View style={styles.inspoRow}>
          <TextInput
            style={[styles.input, styles.inspoInput]}
            value={prompt}
            onChangeText={setPrompt}
            maxLength={30}
            placeholder="Type your own"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
          />
          <Button label="Reroll" variant="secondary" onPress={() => setPrompt(randomPrompt(prompt))} />
        </View>
      )}

      <Button label="Start drawing" onPress={start} style={{ marginTop: 16 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 10, width: '100%', maxWidth: 520, alignSelf: 'center' },
  label: { fontSize: 18, fontWeight: '700', color: colors.ink, marginTop: 10 },
  hint: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  segment: { flexDirection: 'row', gap: 8 },
  segmentBtn: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  segmentOn: { backgroundColor: colors.brandDark },
  segmentText: { fontSize: 20, fontWeight: '700', color: colors.ink },
  segmentTextOn: { color: colors.card },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 16,
    color: colors.ink,
  },
  inspoHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inspoRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  inspoInput: { flex: 1 },
});

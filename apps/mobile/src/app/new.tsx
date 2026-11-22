import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { DieButton } from '@/components/die-button';
import { ModeIntro } from '@/components/mode-intro';
import { NameField } from '@/components/name-field';
import { MAX_ARTISTS, MIN_ARTISTS } from '@/game/geometry';
import { randomPrompt } from '@/game/prompts';
import { startGame, useGameStore } from '@/game/store';
import { confirm } from '@/lib/confirm';
import { randomArtistNames } from '@/remote/names';
import { colors } from '@/theme';

const COUNTS = Array.from({ length: MAX_ARTISTS - MIN_ARTISTS + 1 }, (_, i) => MIN_ARTISTS + i);

export default function NewDrawing() {
  const current = useGameStore((s) => s.current);
  const [count, setCount] = useState(2);
  const [names, setNames] = useState<string[]>(() => randomArtistNames(MAX_ARTISTS));
  const [inspoOn, setInspoOn] = useState(true);
  const [prompt, setPrompt] = useState(() => randomPrompt());

  const start = async () => {
    if (
      current &&
      !(await confirm('Start over?', `This throws away the drawing in progress (${current.artists[current.sections.length]}'s turn).`, 'Start new'))
    ) {
      return;
    }
    const artists = names.slice(0, count).map((n, i) => n.trim() || `Artist ${i + 1}`);
    const word = inspoOn && prompt.trim() ? prompt.trim().toLowerCase() : null;
    startGame(artists, word);
    router.replace('/play');
  };

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ModeIntro mode="pass" />
        {current && (
          <View style={styles.resume}>
            <Text style={styles.resumeText}>
              A drawing is in progress: {current.artists[current.sections.length]}&apos;s turn.
            </Text>
            <Button label="Continue" variant="secondary" onPress={() => router.replace('/play')} />
          </View>
        )}
        <View style={styles.column}>
          <Text style={styles.label}>How many artists?</Text>
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

          <Text style={styles.label}>Artists</Text>
          <View style={styles.names}>
            {Array.from({ length: count }, (_, i) => (
              <View key={i} style={styles.nameInput}>
                <NameField
                  value={names[i]}
                  placeholder={`Artist ${i + 1}`}
                  avoid={names.slice(0, count)}
                  onChange={(t) => setNames((prev) => prev.map((p, j) => (j === i ? t : p)))}
                />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.column}>
          <View style={styles.inspoHeader}>
            <Text style={[styles.label, { flex: 1 }]}>Inspo word</Text>
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
                style={[styles.input, { flex: 1, textAlign: 'center' }]}
                value={prompt}
                onChangeText={setPrompt}
                maxLength={30}
                placeholder="Type your own"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
              />
              <DieButton label="Random inspo word" onPress={() => setPrompt(randomPrompt(prompt))} />
            </View>
          )}
          <Button label="Start drawing" onPress={start} style={{ marginTop: 12 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    padding: 20,
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
  },
  column: { flexGrow: 1, flexBasis: 300, gap: 8 },
  label: { fontSize: 17, fontWeight: '700', color: colors.ink, marginTop: 4 },
  hint: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  segment: { flexDirection: 'row', gap: 8 },
  segmentBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  segmentOn: { backgroundColor: colors.brandDark },
  segmentText: { fontSize: 19, fontWeight: '700', color: colors.ink },
  segmentTextOn: { color: colors.card },
  names: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 16,
    color: colors.ink,
  },
  nameInput: { flexGrow: 1, flexBasis: 220 },
  resume: {
    flexBasis: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  resumeText: { flex: 1, fontSize: 15, color: colors.ink, fontWeight: '600' },
  inspoHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inspoRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
});

import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { DieButton } from '@/components/die-button';
import { ModeIntro } from '@/components/mode-intro';
import { NameField } from '@/components/name-field';
import { MAX_ARTISTS, MIN_ARTISTS } from '@/game/geometry';
import { randomPrompt } from '@/game/prompts';
import { useGameStore } from '@/game/store';
import { type DrawingView } from '@/remote/api';
import { api, setPlayerName, usePlayer } from '@/remote/session';
import { statusLine } from '@/remote/to-game';
import { useArtistName } from '@/remote/use-artist-name';
import { colors } from '@/theme';

const COUNTS = Array.from({ length: MAX_ARTISTS - MIN_ARTISTS + 1 }, (_, i) => MIN_ARTISTS + i);

/** Remote play: your name on top, then start a drawing (left) or join one (right), then your drawings. */
export default function Friends() {
  const { ready, session } = usePlayer();
  const seen = useGameStore((s) => s.seenRemote);
  const [name, setName] = useArtistName();
  const [count, setCount] = useState(3);
  const [inspoOn, setInspoOn] = useState(true);
  const [prompt, setPrompt] = useState(() => randomPrompt());
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'start' | 'join' | null>(null);
  const [error, setError] = useState<{ where: 'start' | 'join' | 'list'; message: string } | null>(null);
  const [drawings, setDrawings] = useState<DrawingView[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!session) {
      setDrawings([]);
      return;
    }
    setLoading(true);
    try {
      setDrawings(await api.myDrawings());
      setError((e) => (e?.where === 'list' ? null : e));
    } catch (e) {
      setError({ where: 'list', message: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const run = async (where: 'start' | 'join', action: () => Promise<void>) => {
    setBusy(where);
    setError(null);
    try {
      const trimmed = name.trim();
      if (!trimmed) throw new Error('Pick a name first (or roll the die), so friends know who drew what.');
      if (!session || session.player.name !== trimmed) await setPlayerName(trimmed);
      await action();
    } catch (e) {
      setError({ where, message: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
    }
  };

  const start = () =>
    run('start', async () => {
      const word = inspoOn && prompt.trim() ? prompt.trim() : null;
      const view = await api.create(count, word);
      router.push({ pathname: '/remote/[id]', params: { id: view.id } });
    });

  const join = () =>
    run('join', async () => {
      const c = code.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!c) throw new Error('Type the code your friend sent you, like goose14.');
      router.push({ pathname: '/join/[code]', params: { code: c } });
    });

  if (!ready) return <ActivityIndicator style={{ flex: 1 }} color={colors.brand} />;

  // Finished drawings leave this list once unfolded here; they're in the gallery after that.
  const active = (drawings ?? [])
    .filter((d) => d.status === 'DRAWING' || !seen.includes(d.id))
    .sort((a, b) => rank(a) - rank(b));

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ModeIntro mode="send" />
        <View style={styles.nameBlock}>
          <Text style={styles.nameLabel}>You&apos;re drawing as</Text>
          <NameField value={name} onChange={setName} />
        </View>

        <View style={styles.modes}>
          <View style={styles.card}>
            <Text style={styles.title}>Start a drawing</Text>
            <View style={styles.segment}>
              {COUNTS.map((n) => (
                <Pressable
                  key={n}
                  accessibilityLabel={`${n} artists`}
                  onPress={() => setCount(n)}
                  style={[styles.segmentBtn, count === n && styles.segmentOn]}>
                  <Text style={[styles.segmentText, count === n && styles.segmentTextOn]}>{n} artists</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.row}>
              <Switch
                value={inspoOn}
                onValueChange={setInspoOn}
                trackColor={{ true: colors.brand, false: colors.line }}
                thumbColor={colors.card}
              />
              <Text style={styles.inspoLabel}>Show inspo</Text>
              {inspoOn && (
                <>
                  <TextInput
                    style={[styles.input, styles.inspo]}
                    value={prompt}
                    onChangeText={setPrompt}
                    maxLength={30}
                    placeholder="Type your own"
                    placeholderTextColor={colors.muted}
                    autoCapitalize="none"
                  />
                  <DieButton
                    label="Random inspo word"
                    background={colors.bg}
                    onPress={() => setPrompt(randomPrompt(prompt))}
                  />
                </>
              )}
            </View>
            <Button label={busy === 'start' ? 'Starting...' : 'Start drawing'} onPress={start} disabled={!!busy} />
            {error?.where === 'start' && <Text style={styles.error}>{error.message}</Text>}
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Join a drawing</Text>
            <TextInput
              style={[styles.input, styles.code]}
              value={code}
              onChangeText={setCode}
              placeholder="Code, like goose14"
              placeholderTextColor={colors.line}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
              onSubmitEditing={join}
            />
            <Button
              label={busy === 'join' ? 'Joining...' : 'Join'}
              variant="secondary"
              onPress={join}
              disabled={!!busy}
            />
            {error?.where === 'join' && <Text style={styles.error}>{error.message}</Text>}
          </View>
        </View>

        {(active.length > 0 || loading || error?.where === 'list') && (
          <View style={styles.listBlock}>
            <View style={styles.row}>
              <Text style={styles.title}>Your drawings</Text>
              {loading && <ActivityIndicator color={colors.brand} />}
            </View>
            {error?.where === 'list' && <Text style={styles.error}>{error.message}</Text>}
            <View style={styles.grid}>
              {active.map((d) => (
                <DrawingCard key={d.id} view={d} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Your turn first, then ones ready to unfold, then waiting on others. */
const rank = (d: DrawingView) => (d.myTurn ? 0 : d.status === 'FINISHED' ? 1 : 2);

function DrawingCard({ view }: { view: DrawingView }) {
  const names = view.artists.filter((a) => a.joined).map((a) => (a.isMe ? 'You' : a.name));
  const open = view.artists.length - names.length;
  const finished = view.status === 'FINISHED';
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/remote/[id]', params: { id: view.id } })}
      style={({ pressed }) => [
        styles.drawing,
        (view.myTurn || finished) && styles.drawingHot,
        pressed && { opacity: 0.8 },
      ]}>
      <Text style={styles.drawingTitle} numberOfLines={1}>
        {names.join(', ')}
        {open > 0 && <Text style={styles.muted}> + {open} open</Text>}
      </Text>
      <Text style={[styles.status, (view.myTurn || finished) && styles.statusHot]}>{statusLine(view)}</Text>
      <Text style={styles.muted} numberOfLines={1}>
        {[view.prompt && `Inspo: ${view.prompt}`, view.inviteCode && `Code: ${view.inviteCode}`]
          .filter(Boolean)
          .join(' · ')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14, width: '100%', maxWidth: 900, alignSelf: 'center' },
  nameBlock: { alignSelf: 'center', width: '100%', maxWidth: 420, gap: 4 },
  nameLabel: { fontSize: 14, fontWeight: '700', color: colors.muted, textAlign: 'center' },
  modes: { flexDirection: 'row', gap: 14 },
  card: { flex: 1, backgroundColor: colors.card, borderRadius: 16, padding: 14, gap: 8 },
  title: { fontSize: 18, fontWeight: '800', color: colors.ink },
  hint: { fontSize: 14, color: colors.muted, lineHeight: 19 },
  input: {
    backgroundColor: colors.bg,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 16,
    color: colors.ink,
  },
  code: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  inspo: { flex: 1, minWidth: 0, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inspoLabel: { fontSize: 15, color: colors.ink, fontWeight: '600' },
  segment: { flexDirection: 'row', gap: 6 },
  segmentBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  segmentOn: { backgroundColor: colors.brandDark },
  segmentText: { fontSize: 14, fontWeight: '700', color: colors.ink },
  segmentTextOn: { color: colors.card },
  error: { color: colors.danger, fontSize: 14 },
  listBlock: { gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  drawing: { flexGrow: 1, flexBasis: '45%', backgroundColor: colors.card, borderRadius: 12, padding: 12, gap: 2 },
  drawingHot: { borderWidth: 2, borderColor: colors.brand },
  drawingTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  muted: { fontSize: 13, color: colors.muted, fontWeight: '400' },
  status: { fontSize: 14, color: colors.muted },
  statusHot: { color: colors.brandDark, fontWeight: '800' },
});

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { LegalLinks } from '@/components/legal-links';
import { NameField } from '@/components/name-field';
import type { InviteView } from '@/remote/api';
import { api, setPlayerName, usePlayer } from '@/remote/session';
import { useArtistName } from '@/remote/use-artist-name';
import { colors } from '@/theme';

/** Opened from an invite code (or link): who's in, then join. */
export default function Join() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { ready, session } = usePlayer();
  const [invite, setInvite] = useState<InviteView | null>(null);
  const [name, setName] = useArtistName();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    api
      .invite(code)
      .then((i) => live && setInvite(i))
      .catch((e) => live && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      live = false;
    };
  }, [code]);

  const join = async () => {
    setBusy(true);
    setError(null);
    try {
      const trimmed = name.trim();
      if (!trimmed) throw new Error('Pick a name first (or roll the die), so friends know who drew what.');
      if (!session || session.player.name !== trimmed) await setPlayerName(trimmed);
      const view = await api.join(code);
      router.replace({ pathname: '/remote/[id]', params: { id: view.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!ready || (!invite && !error)) return <ActivityIndicator style={{ flex: 1 }} color={colors.brand} />;

  const full = invite && (invite.spotsLeft === 0 || invite.finished);
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.screen}>
      <View style={styles.content}>
        {invite && (
          <>
            <Text style={styles.title}>
              {invite.artists[0]}&apos;s drawing · {invite.inviteCode}
            </Text>
            <Text style={styles.body}>
              {invite.artists.join(', ')} {invite.artists.length === 1 ? 'is' : 'are'} in.{' '}
              {full
                ? 'This drawing has no open spots.'
                : `${invite.spotsLeft} of ${invite.artistCount} spots left. You'd be artist ${invite.artists.length + 1}.`}
            </Text>
          </>
        )}
        {!full && invite && (
          <View style={{ gap: 4 }}>
            <Text style={styles.nameLabel}>You&apos;re drawing as</Text>
            <NameField value={name} onChange={setName} />
          </View>
        )}
        {error && <Text style={styles.error}>{error}</Text>}
        {invite && !full && <Button label="Join and draw" onPress={join} disabled={busy} />}
        {invite && !full && (
          <Text style={styles.rules}>
            By joining you agree to the rules: be kind, no hateful drawings or names.
          </Text>
        )}
        <LegalLinks />
        <Button label="Back" variant="ghost" onPress={() => router.back()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.ink,
    textAlign: 'center',
  },
  body: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  nameLabel: { fontSize: 14, fontWeight: '700', color: colors.muted, textAlign: 'center' },
  error: { color: colors.danger, fontSize: 14, textAlign: 'center' },
  rules: { fontSize: 13, color: colors.muted, textAlign: 'center' },
});

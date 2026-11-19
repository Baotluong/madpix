import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { useGameStore } from '@/game/store';
import { api, usePlayer } from '@/remote/session';
import { colors } from '@/theme';

/** e.g. "0.1.0 · 095eb16", so you can tell which code is running. "+" means uncommitted changes. */
const BUILD = [Constants.expoConfig?.version, Constants.expoConfig?.extra?.commit].filter(Boolean).join(' · ');

export default function Home() {
  const ready = useGameStore((s) => s.ready);
  const current = useGameStore((s) => s.current);
  const galleryCount = useGameStore((s) => s.gallery.length);
  const seen = useGameStore((s) => s.seenRemote);
  const { session } = usePlayer();
  // Friend drawings waiting on me: my turn, or finished and not unfolded yet.
  const [needsMe, setNeedsMe] = useState(0);
  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      let live = true;
      api
        .myDrawings()
        .then((ds) => {
          const n = ds.filter((d) => d.myTurn || (d.status === 'FINISHED' && !seen.includes(d.id))).length;
          if (live) setNeedsMe(n);
        })
        .catch(() => {});
      return () => {
        live = false;
      };
    }, [session, seen]),
  );

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top', 'bottom', 'left']} style={styles.hero}>
        <Text style={styles.title}>MadPix</Text>
        <Image source={require('@/assets/images/elephant.png')} style={styles.elephant} contentFit="contain" />
        <Text style={styles.tagline}>Fold the page. Draw your part. Unfold something mad.</Text>
      </SafeAreaView>

      <SafeAreaView edges={['top', 'bottom', 'right']} style={styles.actions}>
        <Button
          label={needsMe ? `Send around (${needsMe} waiting on you)` : 'Send around'}
          sublabel="Online"
          onPress={() => router.push('/friends')}
        />
        <Button
          label={ready && current ? 'Pass around (1 in progress)' : 'Pass around'}
          sublabel="Same device"
          variant="secondary"
          onPress={() => router.push('/new')}
          disabled={!ready}
        />
        <Button
          label={galleryCount ? `Gallery (${galleryCount})` : 'Gallery'}
          variant="ghost"
          onPress={() => router.push('/gallery')}
        />
        <Text style={styles.build}>{BUILD}</Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, flexDirection: 'row', backgroundColor: colors.bg },
  hero: {
    flex: 3,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.brand,
    borderTopRightRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 24,
  },
  title: { fontSize: 52, fontWeight: '900', color: colors.card, fontStyle: 'italic', letterSpacing: -1 },
  elephant: { width: 260, height: 120 },
  tagline: { fontSize: 17, color: colors.card, textAlign: 'center', lineHeight: 24 },
  actions: { flex: 2, justifyContent: 'center', padding: 24, gap: 12, maxWidth: 420 },
  build: { position: 'absolute', right: 12, bottom: 8, fontSize: 11, color: colors.muted, opacity: 0.7 },
});

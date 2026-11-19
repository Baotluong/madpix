import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { useGameStore } from '@/game/store';
import { colors } from '@/theme';

export default function Home() {
  const ready = useGameStore((s) => s.ready);
  const current = useGameStore((s) => s.current);
  const galleryCount = useGameStore((s) => s.gallery.length);

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.hero}>
        <Text style={styles.title}>MadPix</Text>
        <Image source={require('@/assets/images/elephant.png')} style={styles.elephant} contentFit="contain" />
        <Text style={styles.tagline}>Fold the page. Draw your part.{'\n'}Unfold something mad.</Text>
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} style={styles.actions}>
        {ready && current && (
          <Button
            label={`Continue game (${current.sections.length + 1} of ${current.artists.length})`}
            onPress={() => router.push('/play')}
          />
        )}
        <Button
          label="New game"
          variant={current ? 'secondary' : 'primary'}
          onPress={() => router.push('/new')}
          disabled={!ready}
        />
        <Button
          label={galleryCount ? `Gallery (${galleryCount})` : 'Gallery'}
          variant="ghost"
          onPress={() => router.push('/gallery')}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: colors.brand,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 24,
  },
  title: { fontSize: 56, fontWeight: '900', color: colors.card, fontStyle: 'italic', letterSpacing: -1 },
  elephant: { width: 280, height: 128 },
  tagline: { fontSize: 18, color: colors.card, textAlign: 'center', lineHeight: 26 },
  actions: { padding: 24, gap: 12, width: '100%', maxWidth: 480, alignSelf: 'center' },
});

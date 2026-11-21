import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { LegalLinks } from '@/components/legal-links';
import { markIntroSeen, useGameStore } from '@/game/store';
import { colors } from '@/theme';

const INTROS = {
  play: {
    title: 'Play now',
    tag: 'Online, anyone',
    points: [
      'Jump into a drawing with other MadPix players. No code, no waiting for friends.',
      'It’s your turn as soon as you join: you’ll see a sliver of the strip above yours. Sometimes you start a fresh page instead.',
      'Each turn has 12 hours. Miss yours and the spot goes to someone else.',
      'When the last artist folds, the page unfolds for everyone. Find your drawings under Send around.',
      'Be kind: no hateful, sexual or violent drawings or names. Report drawings, and block artists you don’t want to draw with again.',
    ],
  },
  send: {
    title: 'Send around',
    tag: 'Online, friends',
    points: [
      'Every artist draws on their own phone, whenever they’re free.',
      'You draw first, right away. Share the invite code while you draw. Friends join any time and take the next spot.',
      'Each artist only sees a sliver of the strip above theirs. When the last one folds, everyone gets the whole page.',
      'Turn on Public to let anyone join through Play now.',
      'Everyone in the same room? Use Pass around.',
      'Be kind: no hateful, sexual or violent drawings or names. Anyone in a drawing can report it.',
    ],
  },
  pass: {
    title: 'Pass around',
    tag: 'Same device',
    points: [
      'Everyone’s in the same room, sharing this one device.',
      'Each artist draws their strip, folds it, and passes the device on. The next artist only sees a sliver of it.',
      'The inspo word is optional. Everyone gets the same word, but nobody knows which part they’re drawing.',
      'Friends somewhere else? Use Send around.',
    ],
  },
} as const;

type Mode = keyof typeof INTROS;

/**
 * How a mode works: shown once per device the first time the screen opens, then again from the
 * (i) button in the header.
 */
export function ModeIntro({ mode }: { mode: Mode }) {
  const intro = INTROS[mode];
  const ready = useGameStore((s) => s.ready);
  const seen = useGameStore((s) => s.seenIntros.includes(mode));
  const [open, setOpen] = useState(false);
  const visible = open || (ready && !seen);

  const close = () => {
    setOpen(false);
    markIntroSeen(mode);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`How ${intro.title} works`}
              hitSlop={10}
              onPress={() => setOpen(true)}
              style={({ pressed }) => [styles.info, pressed && { opacity: 0.6 }]}>
              <Ionicons name="information-circle-outline" size={26} color={colors.brandDark} />
            </Pressable>
          ),
        }}
      />
      <IntroCard mode={mode} visible={visible} onClose={close} />
    </>
  );
}

/** The intro itself, for screens that decide when to show it (like Play now on the home screen). */
export function IntroCard({ mode, visible, onClose }: { mode: Mode; visible: boolean; onClose: () => void }) {
  const intro = INTROS[mode];
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      supportedOrientations={['landscape', 'portrait']}
      onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Taps on the card itself shouldn't close it. */}
        <Pressable style={styles.card} onPress={() => {}}>
          <ScrollView contentContainerStyle={styles.cardContent}>
            <View style={styles.header}>
              <Text style={styles.title}>{intro.title}</Text>
              <Text style={styles.tag}>{intro.tag}</Text>
            </View>
            {intro.points.map((p) => (
              <View key={p} style={styles.point}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.text}>{p}</Text>
              </View>
            ))}
            {mode !== 'pass' && <LegalLinks />}
            <Button label="Got it" onPress={onClose} style={{ marginTop: 6 }} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  info: { paddingHorizontal: 8 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(31,36,48,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: { backgroundColor: colors.card, borderRadius: 18, width: '100%', maxWidth: 560, maxHeight: '100%' },
  cardContent: { padding: 20, gap: 8 },
  header: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 2 },
  title: { fontSize: 22, fontWeight: '900', color: colors.ink },
  tag: { fontSize: 13, fontWeight: '700', color: colors.muted },
  point: { flexDirection: 'row', gap: 8 },
  bullet: { fontSize: 15, color: colors.brandDark, lineHeight: 21 },
  text: { flex: 1, fontSize: 15, color: colors.ink, lineHeight: 21 },
});

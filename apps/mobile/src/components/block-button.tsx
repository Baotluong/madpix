import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/button';
import { confirm, notify } from '@/lib/confirm';
import type { ArtistView } from '@/remote/api';
import { api } from '@/remote/session';
import { colors } from '@/theme';

/**
 * Block another artist in this drawing: you're never put in a public drawing or a rematch with
 * them again. With more than one other artist, asks which one first.
 */
export function BlockButton({ drawingId, artists }: { drawingId: string; artists: ArtistView[] }) {
  const others = artists.filter((a) => a.joined && !a.isMe && a.name !== 'Deleted artist');
  const [choosing, setChoosing] = useState(false);
  if (others.length === 0) return null;

  const block = async (a: ArtistView) => {
    setChoosing(false);
    const ok = await confirm(
      `Block ${a.name}?`,
      'You won’t be put in public drawings or rematches with them again. They aren’t told.',
      'Block',
    );
    if (!ok) return;
    try {
      await api.block(drawingId, a.position);
      notify('Blocked', `You won’t draw with ${a.name} again.`);
    } catch (e) {
      notify('Couldn’t block', e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <>
      <Button
        label="Block"
        variant="ghost"
        onPress={() => (others.length === 1 ? block(others[0]) : setChoosing(true))}
      />
      <Modal
        visible={choosing}
        transparent
        animationType="fade"
        supportedOrientations={['landscape', 'portrait']}
        onRequestClose={() => setChoosing(false)}>
        <Pressable style={styles.backdrop} onPress={() => setChoosing(false)}>
          <Pressable style={styles.card} onPress={() => {}}>
            <Text style={styles.title}>Block which artist?</Text>
            {others.map((a) => (
              <Button key={a.position} label={a.name ?? ''} variant="secondary" onPress={() => block(a)} />
            ))}
            <Button label="Cancel" variant="ghost" onPress={() => setChoosing(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(31,36,48,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: { backgroundColor: colors.bg, borderRadius: 18, width: '100%', maxWidth: 360, padding: 20, gap: 8 },
  title: { fontSize: 20, fontWeight: '900', color: colors.ink, marginBottom: 4 },
});

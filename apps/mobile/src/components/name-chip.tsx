import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { NameField } from '@/components/name-field';
import { setPlayerName, usePlayer } from '@/remote/session';
import { colors } from '@/theme';

/**
 * "Drawing as Wobbly Whale ✎": the one place to change the name online artists see. Everyone
 * starts with a random one, so nobody has to type a name before playing.
 */
export function NameChip({ light }: { light?: boolean }) {
  const { ready, name } = usePlayer();
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setEditing(null);
    setError(null);
  };

  const save = async () => {
    if (editing === null) return;
    if (editing.trim() === name) return close();
    setSaving(true);
    setError(null);
    try {
      await setPlayerName(editing);
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (!ready) return null;
  const tint = light ? colors.card : colors.brandDark;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Drawing as ${name}. Change name`}
        onPress={() => setEditing(name)}
        style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}>
        <Text style={[styles.label, { color: light ? colors.card : colors.muted }]} numberOfLines={1}>
          Drawing as <Text style={[styles.name, { color: tint }]}>{name}</Text>
        </Text>
        <Ionicons name="pencil" size={14} color={tint} />
      </Pressable>
      <Modal
        visible={editing !== null}
        transparent
        animationType="fade"
        supportedOrientations={['landscape', 'portrait']}
        onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable style={styles.card} onPress={() => {}}>
            <Text style={styles.title}>Your artist name</Text>
            <Text style={styles.hint}>Other artists see it in online drawings. Keep it kind.</Text>
            <NameField value={editing ?? ''} onChange={setEditing} />
            {error && <Text style={styles.error}>{error}</Text>}
            <View style={styles.row}>
              <Button label="Cancel" variant="ghost" onPress={close} style={{ flex: 1 }} />
              <Button label={saving ? 'Saving...' : 'Save'} onPress={save} disabled={saving} style={{ flex: 1 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 4 },
  label: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  name: { fontWeight: '800' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(31,36,48,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: { backgroundColor: colors.bg, borderRadius: 18, width: '100%', maxWidth: 420, padding: 20, gap: 10 },
  title: { fontSize: 20, fontWeight: '900', color: colors.ink },
  hint: { fontSize: 14, color: colors.muted },
  error: { color: colors.danger, fontSize: 14 },
  row: { flexDirection: 'row', gap: 8 },
});

import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/button";
import { MAX_ARTISTS, MIN_ARTISTS } from "@/game/geometry";
import { randomPrompt } from "@/game/prompts";
import { type DrawingView } from "@/remote/api";
import { api, setPlayerName, usePlayer } from "@/remote/session";
import { statusLine } from "@/remote/to-game";
import { colors } from "@/theme";

const COUNTS = Array.from(
  { length: MAX_ARTISTS - MIN_ARTISTS + 1 },
  (_, i) => MIN_ARTISTS + i,
);

/** Remote play: start a drawing, join one with a code, and see the ones you're in. */
export default function Friends() {
  const { ready, session } = usePlayer();
  const [name, setName] = useState("");
  const [count, setCount] = useState(3);
  const [inspoOn, setInspoOn] = useState(true);
  const [prompt, setPrompt] = useState(() => randomPrompt());
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawings, setDrawings] = useState<DrawingView[] | null>(null);
  const [loading, setLoading] = useState(false);

  // The name box starts with the saved name, until the artist types their own.
  const shownName = name || session?.player.name || "";

  const load = useCallback(async () => {
    if (!session) {
      setDrawings([]);
      return;
    }
    setLoading(true);
    try {
      setDrawings(await api.myDrawings());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  /** Makes sure this device has a player with the name in the box. */
  const ensurePlayer = async () => {
    const trimmed = shownName.trim();
    if (!trimmed)
      throw new Error("Pick a name first, so your friends know who drew what.");
    if (!session || session.player.name !== trimmed)
      await setPlayerName(trimmed);
  };

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await ensurePlayer();
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const start = () =>
    run(async () => {
      const word = inspoOn && prompt.trim() ? prompt.trim() : null;
      const view = await api.create(count, word);
      router.push({ pathname: "/remote/[id]", params: { id: view.id } });
    });

  const join = () =>
    run(async () => {
      const c = code.trim().toUpperCase();
      if (c.length < 4) throw new Error("Enter the code your friend sent you.");
      router.push({ pathname: "/join/[code]", params: { code: c } });
    });

  if (!ready)
    return <ActivityIndicator style={{ flex: 1 }} color={colors.brand} />;

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
      <ScrollView
        style={styles.left}
        contentContainerStyle={styles.leftContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Your name</Text>
        <TextInput
          style={styles.input}
          value={shownName}
          onChangeText={setName}
          placeholder="What should friends call you?"
          placeholderTextColor={colors.muted}
          maxLength={20}
        />

        <Text style={styles.label}>Start a drawing</Text>
        <Text style={styles.hint}>
          You draw first, right away. Invite friends while you draw.
        </Text>
        <View style={styles.segment}>
          {COUNTS.map((n) => (
            <Pressable
              key={n}
              accessibilityLabel={`${n} artists`}
              onPress={() => setCount(n)}
              style={[styles.segmentBtn, count === n && styles.segmentOn]}
            >
              <Text
                style={[
                  styles.segmentText,
                  count === n && styles.segmentTextOn,
                ]}
              >
                {n} artists
              </Text>
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
          <Text style={styles.inspoLabel}>Inspo</Text>
          {inspoOn && (
            <>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={prompt}
                onChangeText={setPrompt}
                maxLength={30}
                autoCapitalize="none"
              />
              <Button
                label="Reroll"
                variant="ghost"
                onPress={() => setPrompt(randomPrompt(prompt))}
              />
            </>
          )}
        </View>
        <Button label="Start drawing" onPress={start} disabled={busy} />

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={styles.right}>
        <Text style={[styles.label, { marginTop: 0 }]}>Join a friend</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.code]}
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            placeholder="CODE"
            placeholderTextColor={colors.muted}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            onSubmitEditing={join}
          />
          <Button
            label="Join"
            variant="secondary"
            onPress={join}
            disabled={busy}
            style={{ flex: 1 }}
          />
        </View>
        <View style={styles.listHeader}>
          <Text style={styles.label}>Your drawings</Text>
          {loading && <ActivityIndicator color={colors.brand} />}
        </View>
        <FlatList
          data={drawings ?? []}
          keyExtractor={(d) => d.id}
          onRefresh={load}
          refreshing={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
          ListEmptyComponent={
            drawings ? (
              <Text style={styles.hint}>
                Drawings you start or join show up here.
              </Text>
            ) : undefined
          }
          renderItem={({ item }) => <DrawingRow view={item} />}
        />
      </View>
    </SafeAreaView>
  );
}

function DrawingRow({ view }: { view: DrawingView }) {
  const names = view.artists
    .filter((a) => a.joined)
    .map((a) => (a.isMe ? "You" : a.name));
  const open = view.artists.length - names.length;
  const finished = view.status === "FINISHED";
  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: "/remote/[id]", params: { id: view.id } })
      }
      style={({ pressed }) => [
        styles.card,
        view.myTurn && styles.cardMyTurn,
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={styles.cardTitle} numberOfLines={1}>
        {names.join(", ")}
        {open > 0 && <Text style={styles.cardMuted}> + {open} open</Text>}
      </Text>
      <Text
        style={[
          styles.cardStatus,
          view.myTurn && styles.cardStatusMyTurn,
          finished && styles.cardStatusDone,
        ]}
      >
        {statusLine(view)}
      </Text>
      {view.prompt && (
        <Text style={styles.cardMuted}>Inspo: {view.prompt}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, flexDirection: "row" },
  left: { flex: 1 },
  leftContent: {
    padding: 16,
    gap: 8,
    maxWidth: 440,
    width: "100%",
    alignSelf: "center",
  },
  right: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderLeftWidth: 1,
    borderLeftColor: colors.line,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 8,
  },
  label: { fontSize: 17, fontWeight: "700", color: colors.ink, marginTop: 6 },
  hint: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 16,
    color: colors.ink,
  },
  code: {
    width: 130,
    letterSpacing: 3,
    fontWeight: "700",
    textAlign: "center",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  inspoLabel: { fontSize: 15, color: colors.ink, fontWeight: "600" },
  segment: { flexDirection: "row", gap: 8 },
  segmentBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
  },
  segmentOn: { backgroundColor: colors.brandDark },
  segmentText: { fontSize: 15, fontWeight: "700", color: colors.ink },
  segmentTextOn: { color: colors.card },
  error: { color: colors.danger, fontSize: 14 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 12, gap: 2 },
  cardMyTurn: { borderWidth: 2, borderColor: colors.brand },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.ink },
  cardMuted: { fontSize: 13, color: colors.muted, fontWeight: "400" },
  cardStatus: { fontSize: 14, color: colors.muted },
  cardStatusMyTurn: { color: colors.brandDark, fontWeight: "800" },
  cardStatusDone: { color: colors.ink, fontWeight: "600" },
});

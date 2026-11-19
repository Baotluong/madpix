import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/button";
import type { InviteView } from "@/remote/api";
import { api, setPlayerName, usePlayer } from "@/remote/session";
import { colors } from "@/theme";

/** Opened from an invite code (or link): who's in, then join. */
export default function Join() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { ready, session } = usePlayer();
  const [invite, setInvite] = useState<InviteView | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    api
      .invite(code)
      .then((i) => live && setInvite(i))
      .catch(
        (e) => live && setError(e instanceof Error ? e.message : String(e)),
      );
    return () => {
      live = false;
    };
  }, [code]);

  const join = async () => {
    setBusy(true);
    setError(null);
    try {
      if (!session) {
        if (!name.trim())
          throw new Error(
            "Pick a name first, so your friends know who drew what.",
          );
        await setPlayerName(name);
      }
      const view = await api.join(code);
      router.replace({ pathname: "/remote/[id]", params: { id: view.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!ready || (!invite && !error))
    return <ActivityIndicator style={{ flex: 1 }} color={colors.brand} />;

  const full = invite && (invite.spotsLeft === 0 || invite.finished);
  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
      <View style={styles.content}>
        {invite && (
          <>
            <Text style={styles.title}>
              {invite.artists[0]}&apos;s drawing · {invite.inviteCode}
            </Text>
            <Text style={styles.body}>
              {invite.artists.join(", ")}{" "}
              {invite.artists.length === 1 ? "is" : "are"} in.{" "}
              {full
                ? "This drawing has no open spots."
                : `${invite.spotsLeft} of ${invite.artistCount} spots left. You'd be artist ${invite.artists.length + 1}.`}
            </Text>
          </>
        )}
        {!session && !full && invite && (
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={colors.muted}
            maxLength={20}
            onSubmitEditing={join}
          />
        )}
        {error && <Text style={styles.error}>{error}</Text>}
        {invite && !full && (
          <Button label="Join and draw" onPress={join} disabled={busy} />
        )}
        <Button label="Back" variant="ghost" onPress={() => router.back()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    flex: 1,
    alignItems: "stretch",
    justifyContent: "center",
    gap: 12,
    padding: 24,
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.ink,
    textAlign: "center",
  },
  body: {
    fontSize: 16,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 22,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 16,
    color: colors.ink,
  },
  error: { color: colors.danger, fontSize: 14, textAlign: "center" },
});

import type { ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/theme";

type Props = {
  step?: string;
  title: string;
  body?: string;
  /** The inspo word, shown on a card. */
  prompt?: string | null;
  /** Buttons and cards; on a landscape screen they sit to the right of the text. */
  children?: ReactNode;
};

/** The blue screen before a turn, so nobody sees the paper until they're ready. */
export function CoverScreen({ step, title, body, prompt, children }: Props) {
  const { width, height } = useWindowDimensions();
  const wide = width > height;
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, wide && styles.contentWide]}
      >
        <View style={[styles.column, wide && styles.columnWide]}>
          {step && <Text style={styles.step}>{step}</Text>}
          <Text style={styles.title}>{title}</Text>
          {body && <Text style={styles.body}>{body}</Text>}
          {prompt && (
            <View style={styles.inspoCard}>
              <Text style={styles.inspoLabel}>Inspo, if you want it</Text>
              <Text style={styles.inspoWord}>{prompt}</Text>
            </View>
          )}
        </View>
        {children && (
          <View
            style={[styles.column, styles.actions, wide && styles.columnWide]}
          >
            {children}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.brand },
  content: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  contentWide: { flexDirection: "row", gap: 32 },
  column: { alignItems: "center", gap: 12 },
  columnWide: { flex: 1, maxWidth: 380 },
  actions: { alignSelf: "stretch", justifyContent: "center" },
  step: { fontSize: 15, fontWeight: "700", color: colors.card, opacity: 0.85 },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.card,
    textAlign: "center",
  },
  body: {
    fontSize: 16,
    color: colors.card,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 520,
  },
  inspoCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  inspoLabel: { fontSize: 13, color: colors.muted },
  inspoWord: { fontSize: 24, fontWeight: "800", color: colors.ink },
});

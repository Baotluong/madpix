import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { NavigationBar } from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { CoverScreen } from '@/components/cover-screen';
import { ShareImageButton } from '@/components/share-image-button';
import type { Stroke } from '@/game/types';
import type { DrawingView } from '@/remote/api';
import { clearDraft, loadDraft, saveDraft } from '@/remote/drafts';
import { INVITE_LABEL, shareInvite } from '@/remote/invite';
import { reportDrawing } from '@/remote/report';
import { saveRemoteToGallery } from '@/game/store';
import { api, usePlayer } from '@/remote/session';
import { toGame } from '@/remote/to-game';
import { colors } from '@/theme';
import { DrawingBoard } from './drawing-board';
import { RevealView } from './reveal-view';

/** How often to check for news while waiting on someone else. Push notifications come later. */
const POLL_MS = 8000;

/** One remote drawing: your turn (draw), someone else's (wait and invite), or finished (reveal). */
export default function RemoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = usePlayer();
  const [view, setView] = useState<DrawingView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [draft, setDraft] = useState<Stroke[] | null>(null);
  // Unfold strip by strip only if the page finished while this screen was open.
  const [justFinished, setJustFinished] = useState(false);

  const load = useCallback(async () => {
    try {
      const next = await api.drawing(id);
      setView((prev) => {
        if (prev && prev.status !== 'FINISHED' && next.status === 'FINISHED') setJustFinished(true);
        return next;
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const waiting = view !== null && !view.myTurn && view.status !== 'FINISHED';
  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [waiting, load]);

  // Once unfolded here, a finished drawing lives in the gallery instead of the friends list.
  const finished = view?.status === 'FINISHED';
  useEffect(() => {
    if (finished && view) saveRemoteToGallery(toGame(view));
  }, [finished, view]);

  const myTurn = view?.myTurn ?? false;
  useEffect(() => {
    if (!myTurn) return;
    let live = true;
    loadDraft(id).then((d) => live && setDraft(d));
    return () => {
      live = false;
    };
  }, [myTurn, id]);

  if (!view) {
    return (
      <View style={styles.center}>
        {error ? (
          <>
            <Text style={styles.body}>{error}</Text>
            <Button label="Try again" onPress={load} />
            <Button label="Back" variant="ghost" onPress={() => router.back()} />
          </>
        ) : (
          <ActivityIndicator color={colors.brand} />
        )}
      </View>
    );
  }

  const me = session?.player.name ?? 'You';
  const code = view.inviteCode;
  const openSpots = view.artists.filter((a) => !a.joined).length;
  const invite = code ? () => shareInvite(code, me) : undefined;

  if (view.status === 'FINISHED') {
    const game = toGame(view);
    return (
      <RevealView game={game} animate={justFinished}>
        <ShareImageButton game={game} />
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
        <Text style={styles.savedNote}>Saved to your gallery.</Text>
        <Button label="Report" variant="ghost" onPress={() => reportDrawing(id)} />
      </RevealView>
    );
  }

  if (view.myTurn && drawing && draft) {
    return (
      <>
        <StatusBar hidden />
        <NavigationBar hidden />
        <DrawingBoard
          game={toGame(view)}
          initialStrokes={draft}
          onDraft={(strokes) => saveDraft(id, strokes)}
          onDone={async (strokes) => {
            const next = await api.submitStrip(id, strokes);
            clearDraft(id);
            setDraft(null);
            setDrawing(false);
            if (next.status === 'FINISHED') setJustFinished(true);
            setView(next);
          }}
          onQuit={() => router.back()}
          quitLabel="Leave (your strip is kept)"
          onInvite={invite}
        />
      </>
    );
  }

  if (view.myTurn) {
    const first = view.turn === 0;
    const prev = view.artists[view.turn - 1]?.name;
    return (
      <CoverScreen
        step={`Artist ${view.myPosition + 1} of ${view.artistCount}`}
        title={first ? 'You start!' : `Your turn, ${me}!`}
        body={
          first
            ? 'Draw anything in the top strip. The next artist only sees its bottom edge.'
            : `${prev} folded their strip. You'll see a thin sliver of it above yours. Continue from it!`
        }
        prompt={view.prompt}>
        {code && invite && <InviteCard code={code} openSpots={openSpots} onShare={invite} light />}
        <Button
          label={draft ? "Let's draw" : 'Loading...'}
          variant="secondary"
          disabled={!draft}
          onPress={() => setDrawing(true)}
        />
        <Button label="Not now" variant="ghost" onPress={() => router.back()} style={styles.lightGhost} />
      </CoverScreen>
    );
  }

  // Someone else's turn, or waiting for someone to join.
  const next = view.artists[view.turn];
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.waitContent}>
        <Text style={styles.title}>
          {view.waitingForArtist ? 'Waiting for an artist to join' : `${next.name} is drawing`}
        </Text>
        <Text style={styles.body}>
          {view.waitingForArtist
            ? `Spot ${view.turn + 1} is open. Send the code to a friend; they start as soon as they join.`
            : "We'll pick it up here when it changes. You can leave and come back."}
        </Text>
        {/* Side by side, so the page fits a landscape phone without scrolling. */}
        <View style={styles.waitRow}>
          <View style={styles.artists}>
            {view.artists.map((a) => (
              <Text key={a.position} style={[styles.artist, a.position === view.turn && styles.artistNow]}>
                {a.done ? '✓' : a.position === view.turn ? '✎' : '·'} {a.position + 1}.{' '}
                {a.isMe ? `${a.name} (you)` : (a.name ?? 'Open spot')}
              </Text>
            ))}
          </View>
          {code && invite && <InviteCard code={code} openSpots={openSpots} onShare={invite} />}
        </View>
        <View style={styles.row}>
          <Button label="Back" variant="ghost" onPress={() => router.back()} />
          <Button label="Refresh" variant="ghost" onPress={load} />
          <Button label="Report" variant="ghost" onPress={() => reportDrawing(id)} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InviteCard(p: { code: string; openSpots: number; onShare: () => void; light?: boolean }) {
  return (
    <View style={styles.inviteCard}>
      <Text style={styles.inviteLabel}>
        {p.openSpots} open {p.openSpots === 1 ? 'spot' : 'spots'}. Invite with code
      </Text>
      {/* Full width, one line: Android measured the heavy code text short and wrapped its last digit. */}
      <Text style={styles.inviteCode} numberOfLines={1}>
        {p.code}
      </Text>
      <Button label={INVITE_LABEL} variant={p.light ? 'secondary' : 'primary'} onPress={p.onShare} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  waitContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.ink,
    textAlign: 'center',
  },
  body: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    maxWidth: 520,
    lineHeight: 22,
  },
  waitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  artists: { gap: 2 },
  artist: { fontSize: 16, color: colors.muted },
  artistNow: { color: colors.ink, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 12 },
  inviteCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 6,
  },
  inviteLabel: { fontSize: 13, color: colors.muted },
  inviteCode: {
    alignSelf: 'stretch',
    textAlign: 'center',
    fontSize: 30,
    fontWeight: '900',
    color: colors.ink,
  },
  lightGhost: { opacity: 0.9 },
  savedNote: { fontSize: 13, color: colors.muted, textAlign: 'center' },
});

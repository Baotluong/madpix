import { Redirect, router } from 'expo-router';
import { NavigationBar } from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Button } from '@/components/button';
import { CoverScreen } from '@/components/cover-screen';
import { finishTurn, quitGame, saveDraft, useGameStore } from '@/game/store';
import type { Game } from '@/game/types';
import { confirm } from '@/lib/confirm';
import { goHome } from '@/lib/go-home';
import { DrawingBoard } from './drawing-board';

/** Pass-and-play: one phone, handed from artist to artist. */
export default function PlayScreen() {
  const ready = useGameStore((s) => s.ready);
  const game = useGameStore((s) => s.current);
  if (!ready) return null;
  if (!game) return <Redirect href="/" />;
  return (
    <>
      {/* Full screen while playing: every pixel goes to the paper. Swipe from an edge to bring the bars back. */}
      <StatusBar hidden />
      <NavigationBar hidden />
      {/* A new key per turn resets all drawing state for the next artist. */}
      <Turn key={`${game.id}-${game.sections.length}`} game={game} />
    </>
  );
}

function Turn({ game }: { game: Game }) {
  const [phase, setPhase] = useState<'handoff' | 'drawing'>('handoff');
  if (phase === 'handoff') {
    return <Handoff game={game} onReady={() => setPhase('drawing')} />;
  }
  return <Drawing game={game} />;
}

/** The cover screen between turns, so the next artist can't see the last drawing. */
function Handoff({ game, onReady }: { game: Game; onReady: () => void }) {
  const turn = game.sections.length;
  const artist = game.artists[turn];
  return (
    <CoverScreen
      step={`Artist ${turn + 1} of ${game.artists.length}`}
      title={turn === 0 ? `${artist}, you start!` : `Pass the phone to ${artist}`}
      body={
        turn === 0
          ? 'Draw anything in the top strip. The next artist only sees its bottom edge.'
          : `No peeking, ${game.artists[turn - 1]}! ${artist}: you'll see a thin sliver of the strip above yours. Continue from it.`
      }
      prompt={game.prompt}>
      <Button label={`I'm ${artist}, let's draw`} variant="secondary" onPress={onReady} />
    </CoverScreen>
  );
}

function Drawing({ game }: { game: Game }) {
  return (
    <DrawingBoard
      game={game}
      initialStrokes={game.draft}
      onDraft={saveDraft}
      onDone={(strokes) => {
        const finished = finishTurn(strokes);
        if (finished) router.replace({ pathname: '/reveal/[id]', params: { id: finished.id, fresh: '1' } });
      }}
      onQuit={async () => {
        if (await confirm('Quit this drawing?', 'It will be thrown away.', 'Quit')) {
          quitGame();
          goHome();
        }
      }}
    />
  );
}

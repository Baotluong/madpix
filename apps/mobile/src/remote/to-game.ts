import type { Game } from '@/game/types';
import type { DrawingView } from './api';

/**
 * The drawing and reveal screens work on a local Game. A remote drawing maps onto
 * one: strips before mine are empty (they're folded anyway) except the one right
 * above mine, which holds the sliver the API sent.
 */
export function toGame(view: DrawingView): Game {
  const artists = view.artists.map((a) => a.name ?? `Artist ${a.position + 1}`);
  const finished = view.status === 'FINISHED';
  const sections = finished
    ? (view.strips ?? []).map((strokes, i) => ({ artist: artists[i], strokes }))
    : Array.from({ length: view.turn }, (_, i) => ({
        artist: artists[i],
        strokes: i === view.turn - 1 ? (view.sliver ?? []) : [],
      }));
  return {
    id: view.id,
    createdAt: Date.parse(view.createdAt),
    finishedAt: view.finishedAt ? Date.parse(view.finishedAt) : undefined,
    stripH: view.stripH,
    artists,
    prompt: view.prompt,
    sections,
    draft: [],
  };
}

/** One line on where a drawing stands, from my point of view. */
export function statusLine(view: DrawingView): string {
  if (view.status === 'FINISHED') return 'Finished. Unfold it!';
  if (view.myTurn) return 'Your turn!';
  if (view.waitingForArtist) return 'Waiting for someone to join';
  const next = view.artists[view.turn];
  return `${next.name}'s turn`;
}

/** When a timed turn runs out, in words: "3:40 PM", or "Sat 3:40 PM" if it's not today. */
export function untilLabel(iso: string): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (d.toDateString() === new Date().toDateString()) return time;
  return `${d.toLocaleDateString([], { weekday: 'short' })} ${time}`;
}

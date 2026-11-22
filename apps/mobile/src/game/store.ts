import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { STRIP_H } from './geometry';
import { isFinished, type Game, type Stroke } from './types';

/**
 * A tiny app-wide store for v0 (pass-and-play, everything on this device).
 * State is saved to AsyncStorage after every change.
 */

type State = {
  ready: boolean;
  /** The game being played right now, if any. */
  current: Game | null;
  /** Finished games, newest first. */
  gallery: Game[];
  /** Remote drawings already unfolded here (and copied to the gallery), so they leave the friends list. */
  seenRemote: string[];
  /** Mode intros ("send", "pass") this device has already shown once. */
  seenIntros: string[];
};

const STORAGE_KEY = 'madpix:v0';

let state: State = { ready: false, current: null, gallery: [], seenRemote: [], seenIntros: [] };
const listeners = new Set<() => void>();

function setState(next: State) {
  state = next;
  listeners.forEach((l) => l());
  const { current, gallery, seenRemote, seenIntros } = next;
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ current, gallery, seenRemote, seenIntros })).catch((e) =>
    console.warn('Could not save MadPix data', e),
  );
}

async function hydrate() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const saved = raw ? (JSON.parse(raw) as Partial<State>) : {};
    state = {
      ready: true,
      current: saved.current ?? null,
      gallery: saved.gallery ?? [],
      seenRemote: saved.seenRemote ?? [],
      seenIntros: saved.seenIntros ?? [],
    };
  } catch (e) {
    console.warn('Could not load MadPix data', e);
    state = { ...state, ready: true };
  }
  listeners.forEach((l) => l());
}
hydrate();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useGameStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state),
  );
}

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export function startGame(artists: string[], prompt: string | null): Game {
  const game: Game = {
    id: newId(),
    createdAt: Date.now(),
    stripH: STRIP_H,
    artists,
    prompt,
    sections: [],
    draft: [],
  };
  setState({ ...state, current: game });
  return game;
}

/** Saves the current artist's in-progress strokes. */
export function saveDraft(strokes: Stroke[]) {
  if (!state.current) return;
  setState({ ...state, current: { ...state.current, draft: strokes } });
}

/**
 * Folds the paper: locks in the current artist's section and moves to the
 * next artist. Returns the finished game when the last artist is done.
 */
export function finishTurn(strokes: Stroke[]): Game | null {
  const game = state.current;
  if (!game) return null;
  const artist = game.artists[game.sections.length];
  const next: Game = {
    ...game,
    sections: [...game.sections, { artist, strokes }],
    draft: [],
  };
  if (isFinished(next)) {
    const done = { ...next, finishedAt: Date.now() };
    setState({ ...state, current: null, gallery: [done, ...state.gallery] });
    return done;
  }
  setState({ ...state, current: next });
  return null;
}

export function quitGame() {
  setState({ ...state, current: null });
}

/** Called when a finished remote drawing is unfolded: keep a copy and take it off the friends list. */
export function saveRemoteToGallery(game: Game) {
  if (state.seenRemote.includes(game.id)) return;
  const gallery = [{ ...game, remote: true }, ...state.gallery].sort(
    (a, b) => (b.finishedAt ?? b.createdAt) - (a.finishedAt ?? a.createdAt),
  );
  setState({ ...state, gallery, seenRemote: [...state.seenRemote, game.id] });
}

export function markIntroSeen(key: string) {
  if (!state.seenIntros.includes(key)) setState({ ...state, seenIntros: [...state.seenIntros, key] });
}

export function deleteFromGallery(id: string) {
  setState({ ...state, gallery: state.gallery.filter((g) => g.id !== id) });
}

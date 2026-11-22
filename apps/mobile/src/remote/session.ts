import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { ApiError, request, type DrawingView, type InviteView, type Method, type PlayerView } from './api';
import { randomArtistName } from './names';
import type { Stroke } from '@/game/types';

/**
 * Who this device plays as. No accounts: the API hands out a token once and the
 * device keeps it. Losing it (uninstalling) means starting over as a new player.
 *
 * The artist name is set once (a random one to start) and changed from the name chip. The
 * player is only created on the server the first time it's needed online.
 */

type Session = { player: PlayerView; token: string };
type State = { ready: boolean; session: Session | null; name: string };

const KEY = 'madpix:player';
const NAME_KEY = 'madpix:name';
let state: State = { ready: false, session: null, name: '' };
const listeners = new Set<() => void>();

function set(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

async function hydrate() {
  let session: Session | null = null;
  let name: string | null = null;
  try {
    const [raw, savedName] = await Promise.all([AsyncStorage.getItem(KEY), AsyncStorage.getItem(NAME_KEY)]);
    session = raw ? (JSON.parse(raw) as Session) : null;
    name = savedName;
  } catch {
    // Unreadable storage: start fresh.
  }
  name = session?.player.name ?? name ?? randomArtistName();
  AsyncStorage.setItem(NAME_KEY, name).catch(() => {});
  set({ ready: true, session, name });
}
const hydrated = hydrate();

async function save(session: Session | null) {
  set({ ...state, session, name: session?.player.name ?? state.name });
  if (session) await AsyncStorage.setItem(KEY, JSON.stringify(session));
  else await AsyncStorage.removeItem(KEY);
}

export function usePlayer() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

/** Changes the artist name (creating this device's player if it hasn't played online yet). */
export async function setPlayerName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Pick a name first (or roll the die).');
  if (state.session) {
    const player = await authed<PlayerView>('PATCH', '/players/me', { name: trimmed });
    await save({ ...state.session, player });
  } else {
    await save(await request<Session>('POST', '/players', { body: { name: trimmed } }));
  }
  await AsyncStorage.setItem(NAME_KEY, trimmed);
}

/** Makes sure this device has an online player, under the artist name. */
export async function ensurePlayer() {
  await hydrated;
  if (!state.session) await save(await request<Session>('POST', '/players', { body: { name: state.name } }));
}

/** A request as this device's player. A rejected token means the API forgot us: start fresh. */
async function authed<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const token = state.session?.token;
  if (!token) throw new ApiError(401, 'Pick a name first');
  try {
    return await request<T>(method, path, { token, body });
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) await save(null);
    throw e;
  }
}

/** A skip still on its way to the server. The drawing list waits for it, so it isn't stale. */
let skipping: Promise<unknown> = Promise.resolve();

export const api = {
  myDrawings: async () => {
    await skipping;
    return authed<DrawingView[]>('GET', '/drawings');
  },
  drawing: (id: string) => authed<DrawingView>('GET', `/drawings/${id}`),
  create: (artistCount: number, prompt: string | null, isPublic: boolean) =>
    authed<DrawingView>('POST', '/drawings', { artistCount, prompt, public: isPublic }),
  /** A public drawing where it's my turn now, or a new one. [prompt] is used if a new one gets inspo. */
  playNow: (prompt: string) => authed<DrawingView>('POST', '/drawings/play-now', { prompt }),
  /** "Draw again": the one rematch of a finished drawing, with the same artists. */
  rematch: (id: string, prompt: string) => authed<DrawingView>('POST', `/drawings/${id}/rematch`, { prompt }),
  /** Gives up my spot in a public drawing I haven't drawn in (deletes it if nobody else is in). */
  skip: (id: string) => {
    const done = authed<null>('POST', `/drawings/${id}/skip`);
    skipping = done.catch(() => {});
    return done;
  },
  block: (id: string, position: number) => authed<null>('POST', `/drawings/${id}/block`, { position }),
  join: (code: string) => authed<DrawingView>('POST', '/drawings/join', { code }),
  submitStrip: (id: string, strokes: Stroke[]) =>
    authed<DrawingView>('POST', `/drawings/${id}/strip`, { strokes }),
  invite: (code: string) => request<InviteView>('GET', `/invites/${encodeURIComponent(code.trim())}`),
  report: (id: string, reason?: string) => authed<null>('POST', `/drawings/${id}/report`, { reason }),
};

/**
 * "Delete my online data": the server drops this player's name and open spots, then this device
 * forgets the login. Drawings saved in the gallery stay on the device.
 */
export async function deleteMyData() {
  await authed<null>('DELETE', '/players/me');
  await save(null);
}

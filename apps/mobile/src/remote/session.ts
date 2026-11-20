import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { ApiError, request, type DrawingView, type InviteView, type Method, type PlayerView } from './api';
import type { Stroke } from '@/game/types';

/**
 * Who this device plays as. No accounts: the API hands out a token once and the
 * device keeps it. Losing it (uninstalling) means starting over as a new player.
 */

type Session = { player: PlayerView; token: string };
type State = { ready: boolean; session: Session | null };

const KEY = 'madpix:player';
let state: State = { ready: false, session: null };
const listeners = new Set<() => void>();

function set(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

async function hydrate() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    set({ ready: true, session: raw ? (JSON.parse(raw) as Session) : null });
  } catch {
    set({ ready: true, session: null });
  }
}
hydrate();

async function save(session: Session | null) {
  set({ ...state, session });
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

/** Creates this device's player the first time, or renames it. */
export async function setPlayerName(name: string): Promise<PlayerView> {
  const trimmed = name.trim();
  if (state.session) {
    const player = await authed<PlayerView>('PATCH', '/players/me', {
      name: trimmed,
    });
    await save({ ...state.session, player });
    return player;
  }
  const created = await request<{ player: PlayerView; token: string }>('POST', '/players', {
    body: { name: trimmed },
  });
  await save(created);
  return created.player;
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

export const api = {
  myDrawings: () => authed<DrawingView[]>('GET', '/drawings'),
  drawing: (id: string) => authed<DrawingView>('GET', `/drawings/${id}`),
  create: (artistCount: number, prompt: string | null) =>
    authed<DrawingView>('POST', '/drawings', { artistCount, prompt }),
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

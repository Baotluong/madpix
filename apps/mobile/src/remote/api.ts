import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { Stroke } from '@/game/types';

/**
 * Where the MadPix API lives: EXPO_PUBLIC_API_URL, set in .env to the deployed API on Fly.
 * "local" (or unset) means port 8080 on the computer serving the app, so a phone in Expo Go
 * reaches an API running on your Mac.
 */
const CONFIGURED = process.env.EXPO_PUBLIC_API_URL;
export const API_URL = CONFIGURED && CONFIGURED !== 'local' ? CONFIGURED : devApiUrl();

function devApiUrl() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `http://${window.location.hostname}:8080`;
  }
  // e.g. "192.168.4.69:8081" — the Mac running Metro.
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host ?? 'localhost'}:8080`;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// --- Shapes returned by the API (see apps/api/.../DrawingViews.kt) ---

export type PlayerView = { id: string; name: string };

export type ArtistView = {
  position: number;
  name: string | null;
  joined: boolean;
  done: boolean;
  isMe: boolean;
};

export type DrawingView = {
  id: string;
  /** Like "goose14". Null once every spot is taken. */
  inviteCode: string | null;
  artistCount: number;
  stripH: number;
  prompt: string | null;
  status: 'DRAWING' | 'FINISHED';
  turn: number;
  artists: ArtistView[];
  myPosition: number;
  myTurn: boolean;
  waitingForArtist: boolean;
  /** Only on my turn: the bottom edge of the strip above mine. */
  sliver: Stroke[] | null;
  /** Only once finished. */
  strips: Stroke[][] | null;
  createdAt: string;
  finishedAt: string | null;
};

export type InviteView = {
  inviteCode: string;
  artistCount: number;
  artists: string[];
  spotsLeft: number;
  finished: boolean;
};

// --- Requests ---

export type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export async function request<T>(
  method: Method,
  path: string,
  opts: { token?: string | null; body?: unknown } = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method,
      headers: {
        ...(opts.body !== undefined && { 'Content-Type': 'application/json' }),
        ...(opts.token && { Authorization: `Bearer ${opts.token}` }),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Can't reach MadPix. Check your connection and try again.");
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    // Errors are problem details: { status, detail }.
    throw new ApiError(res.status, data?.detail ?? `Something went wrong (${res.status})`);
  }
  return data as T;
}

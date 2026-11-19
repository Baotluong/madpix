import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Stroke } from "@/game/types";

/** A remote strip in progress stays on this device until it's folded. */
const key = (drawingId: string) => `madpix:draft:${drawingId}`;

export async function loadDraft(drawingId: string): Promise<Stroke[]> {
  try {
    const raw = await AsyncStorage.getItem(key(drawingId));
    return raw ? (JSON.parse(raw) as Stroke[]) : [];
  } catch {
    return [];
  }
}

export function saveDraft(drawingId: string, strokes: Stroke[]) {
  AsyncStorage.setItem(key(drawingId), JSON.stringify(strokes)).catch(() => {});
}

export function clearDraft(drawingId: string) {
  AsyncStorage.removeItem(key(drawingId)).catch(() => {});
}

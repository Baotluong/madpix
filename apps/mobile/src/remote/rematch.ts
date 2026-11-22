import { router } from 'expo-router';

import { randomPrompt } from '@/game/prompts';
import { notify } from '@/lib/confirm';
import { api } from './session';

/**
 * "Draw again": opens the rematch of a finished drawing, with the same artists. Whoever taps it
 * first starts it and draws first; everyone else who taps it lands in the same one.
 */
export async function drawAgain(id: string) {
  try {
    const view = await api.rematch(id, randomPrompt());
    router.replace({ pathname: '/remote/[id]', params: { id: view.id } });
  } catch (e) {
    notify('Couldn’t start a new drawing', e instanceof Error ? e.message : String(e));
  }
}

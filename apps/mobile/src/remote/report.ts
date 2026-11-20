import { confirm, notify } from '@/lib/confirm';

import { api } from './session';

/** Asks first, then flags the drawing for us to look at. */
export async function reportDrawing(id: string) {
  const ok = await confirm(
    'Report this drawing?',
    'Tell us if a drawing or a name in it is offensive. We’ll take a look.',
    'Report',
  );
  if (!ok) return;
  try {
    await api.report(id, 'reported from the app');
    notify('Thanks for telling us', 'We’ll take a look.');
  } catch (e) {
    notify('Couldn’t send the report', e instanceof Error ? e.message : String(e));
  }
}

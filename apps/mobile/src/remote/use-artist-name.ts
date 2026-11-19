import { useState } from 'react';

import { randomArtistName } from './names';
import { usePlayer } from './session';

/**
 * The name box on the friends screens: the saved name if this device has played before,
 * otherwise a random one, until the artist types their own.
 */
export function useArtistName() {
  const { session } = usePlayer();
  const [typed, setTyped] = useState<string | null>(null);
  const [fallback] = useState(() => randomArtistName());
  const name = typed ?? session?.player.name ?? fallback;
  return [name, setTyped] as const;
}

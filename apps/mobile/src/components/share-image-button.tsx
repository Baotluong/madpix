import { useState } from 'react';

import { Button } from '@/components/button';
import { sharePage } from '@/drawing/export-image';
import type { Game } from '@/game/types';

export function ShareImageButton({ game }: { game: Game }) {
  const [sharing, setSharing] = useState(false);
  const share = async () => {
    setSharing(true);
    try {
      await sharePage(game);
    } catch (e) {
      console.warn('Share failed', e);
    } finally {
      setSharing(false);
    }
  };
  return <Button label={sharing ? 'Preparing image...' : 'Save / share image'} onPress={share} disabled={sharing} />;
}

import { Platform, Share } from 'react-native';

import { notify } from '@/lib/confirm';

/** Shares the invite code through the phone's share sheet (or the clipboard on desktop web). */
export async function shareInvite(code: string, from: string) {
  const link =
    Platform.OS === 'web' && typeof window !== 'undefined' ? `\n${window.location.origin}/join/${code}` : '';
  const message =
    `${from} wants you to draw on a MadPix page! ` +
    `Open MadPix, tap "Draw with friends" and join with code ${code}.${link}`;
  if (Platform.OS === 'web') {
    const nav = typeof navigator !== 'undefined' ? navigator : undefined;
    if (nav?.share) {
      await nav.share({ text: message }).catch(() => {});
      return;
    }
    await nav?.clipboard?.writeText(message).catch(() => {});
    notify('Invite copied', `Paste it to a friend. The code is ${code}.`);
    return;
  }
  await Share.share({ message }).catch(() => {});
}

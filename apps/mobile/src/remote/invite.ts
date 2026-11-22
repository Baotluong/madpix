import { Platform, Share } from 'react-native';

import { notify } from '@/lib/confirm';
import { WEB_APP } from '@/lib/links';

/** What the invite button says: browsers copy a link, phones open the share sheet. */
export const INVITE_LABEL = Platform.OS === 'web' ? 'Copy invite link' : 'Share invite';

/**
 * Invites a friend. On a phone this opens the share sheet with a message. In a browser it just copies the
 * join link (the browser share menus are clunky on desktop), and says what the code is. The phone message
 * links to the web version too, so friends without the app (or on iPhone) can join in a browser.
 */
export async function shareInvite(code: string, from: string) {
  if (Platform.OS === 'web') {
    const link = `${window.location.origin}/join/${code}`;
    try {
      await navigator.clipboard.writeText(link);
      notify('Invite link copied', `Paste it to a friend. Or tell them the code: ${code}`);
    } catch {
      notify('Invite a friend', `Send them this link: ${link}\n\nOr tell them the code: ${code}`);
    }
    return;
  }
  const message =
    `${from} wants you to draw on a MadPix page! Join here: ${WEB_APP}/join/${code}\n\n` +
    `Or open the MadPix app, tap "Send around" and join with code ${code}.`;
  await Share.share({ message }).catch(() => {});
}

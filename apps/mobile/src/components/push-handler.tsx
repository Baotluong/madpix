import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';

import { enablePush, pushSupported } from '@/remote/push';
import { usePlayer } from '@/remote/session';

/**
 * Lives in the root layout. Keeps this phone's push token current, and opens the drawing a
 * notification is about when it's tapped (whether the app was open, in the background or closed).
 */
export function PushHandler() {
  return pushSupported ? <Handler /> : null;
}

function Handler() {
  const { session } = usePlayer();
  const playerId = session?.player.id;
  const response = Notifications.useLastNotificationResponse();

  // Refresh the token if notifications were turned on before; never prompts here.
  useEffect(() => {
    if (playerId) enablePush({ ask: false });
  }, [playerId]);

  useEffect(() => {
    if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const id = response.notification.request.content.data?.drawingId;
    if (typeof id !== 'string') return;
    // Handled once: don't reopen it every time the app starts.
    Notifications.clearLastNotificationResponse();
    router.push({ pathname: '/remote/[id]', params: { id } });
  }, [response]);

  return null;
}

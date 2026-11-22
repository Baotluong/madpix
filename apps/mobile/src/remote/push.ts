import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { setPushToken, usePlayer } from './session';

/**
 * "It's your turn" and "The drawing is done" notifications. The API sends them through Expo's
 * push service (see apps/api/.../ExpoPushSender.kt) to the token this file registers.
 *
 * Only in real Android and iOS builds: Expo Go dropped remote notifications, the web has none,
 * and emulators can't get a token.
 */
export const pushSupported =
  Platform.OS !== 'web' && Device.isDevice && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

/** The API sends to this Android channel. */
const CHANNEL = 'turns';
/** "playerId:token" last sent to the API, so we only send it again when either changes. */
const SENT_KEY = 'madpix:push-sent';

if (pushSupported) {
  // Show notifications that arrive while the app is open, too.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Registers this phone for notifications. With [ask], shows the system prompt if we haven't
 * asked before; without it, only refreshes the token when permission was already given.
 * Failures are quiet: the app still works, and Needs you shows what's waiting.
 */
export async function enablePush({ ask }: { ask: boolean }) {
  if (!pushSupported) return;
  const session = usePlayer.current();
  if (!session) return;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: 'Your turn and finished drawings',
        importance: AndroidImportance.HIGH,
      });
    }
    let { status, canAskAgain } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      if (!ask || !canAskAgain) return;
      ({ status } = await Notifications.requestPermissionsAsync());
      if (status !== 'granted') return;
    }
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const sent = `${session.player.id}:${token}`;
    if ((await AsyncStorage.getItem(SENT_KEY)) === sent) return;
    await setPushToken(token);
    await AsyncStorage.setItem(SENT_KEY, sent);
  } catch (e) {
    console.warn('Could not set up notifications', e);
  }
}

import { Stack } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { colors } from '@/theme';

export default function RootLayout() {
  // The whole app is landscape: strips are wide, so the phone stays sideways
  // from setup to reveal. (app.json sets this too; the lock makes Expo Go follow it.)
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: colors.brandDark,
          headerTitleStyle: { fontWeight: '700', color: colors.ink },
          contentStyle: { backgroundColor: colors.bg },
        }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="new" options={{ title: 'New drawing' }} />
        <Stack.Screen name="play" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="reveal/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="gallery" options={{ title: 'Gallery' }} />
        <Stack.Screen name="friends" options={{ title: 'Draw with friends' }} />
        <Stack.Screen name="join/[code]" options={{ title: 'Join a drawing' }} />
        <Stack.Screen name="remote/[id]" options={{ headerShown: false, gestureEnabled: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

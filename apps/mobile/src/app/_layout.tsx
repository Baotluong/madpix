import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { colors } from '@/theme';

export default function RootLayout() {
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
        <Stack.Screen name="new" options={{ title: 'New game' }} />
        <Stack.Screen name="play" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="reveal/[id]" options={{ title: 'The reveal' }} />
        <Stack.Screen name="gallery" options={{ title: 'Gallery' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

import { lazy, Suspense, type ComponentType } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors } from '@/theme';
import { loadSkia } from './load-skia';

/**
 * Wraps a screen that draws with Skia. On web, Skia must finish loading its
 * WebAssembly before any module that imports it runs, so the screen module is
 * imported lazily after loadSkia(). Web only: the .web.tsx routes use it, while the plain routes
 * import their screens directly (on phones, a lazy import in development downloads a separate
 * bundle from Metro, which failed over Wi-Fi with "Could not load bundle").
 */
export function lazySkia<P extends object>(load: () => Promise<{ default: ComponentType<P> }>) {
  const Screen = lazy(async () => {
    await loadSkia();
    return load();
  });
  return function SkiaScreen(props: P) {
    return (
      <Suspense
        fallback={
          <View style={styles.loading}>
            <ActivityIndicator color={colors.brand} />
          </View>
        }>
        <Screen {...props} />
      </Suspense>
    );
  };
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
});

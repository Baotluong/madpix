import { lazy, Suspense, type ComponentType } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors } from '@/theme';
import { loadSkia } from './load-skia';

/**
 * Wraps a screen that draws with Skia. On web, Skia must finish loading its
 * WebAssembly before any module that imports it runs, so the screen module is
 * imported lazily after loadSkia(). On Android and iOS this is instant.
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

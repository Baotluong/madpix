const { withGradleProperties } = require('expo/config-plugins');

/**
 * Gradle settings for release builds, so they fit Expo's free build machines (the Gradle daemon
 * was getting killed for memory while R8 ran beside the native compiles):
 * - native code only for ARM phones (x86 is for emulators);
 * - no R8 shrinking (the app is a few MB bigger);
 * - at most 2 Gradle workers at a time;
 * - Kotlin compiles inside Gradle's process instead of starting its own (a second JVM as big as
 *   Gradle's 4 GB, next to 4 parallel C++ compiles, was too much for the 16 GB machine).
 */
const SETTINGS = {
  reactNativeArchitectures: 'armeabi-v7a,arm64-v8a',
  'android.enableMinifyInReleaseBuilds': 'false',
  'org.gradle.workers.max': '2',
  'kotlin.compiler.execution.strategy': 'in-process',
};

module.exports = function withAndroidBuildSettings(config) {
  return withGradleProperties(config, (cfg) => {
    for (const [key, value] of Object.entries(SETTINGS)) {
      cfg.modResults = cfg.modResults.filter((p) => !(p.type === 'property' && p.key === key));
      cfg.modResults.push({ type: 'property', key, value });
    }
    return cfg;
  });
};

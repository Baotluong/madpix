const { withGradleProperties } = require('expo/config-plugins');

/**
 * Gradle settings for release builds, so they fit Expo's free build machines (the Gradle daemon
 * was getting killed for memory while R8 ran beside the native compiles):
 * - native code only for ARM phones (x86 is for emulators);
 * - no R8 shrinking (the app is a few MB bigger);
 * - at most 2 Gradle workers at a time.
 */
const SETTINGS = {
  reactNativeArchitectures: 'armeabi-v7a,arm64-v8a',
  'android.enableMinifyInReleaseBuilds': 'false',
  'org.gradle.workers.max': '2',
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

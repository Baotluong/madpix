const { withGradleProperties, withProjectBuildGradle } = require('expo/config-plugins');

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

/**
 * Each native library's C++ build runs ninja with as many jobs as there are cores (plus two), and
 * Skia's sources need about 1 GB per compiler. Ninja job pools cap every library at 2 compiles and
 * 1 link at a time.
 */
const MARK = '// madpix: cap parallel C++ jobs';
const CAP_NATIVE_JOBS = `
${MARK}, so release builds fit Expo's free build machines.
subprojects { p ->
  ['com.android.library', 'com.android.application'].each { id ->
    p.plugins.withId(id) {
      p.android.defaultConfig.externalNativeBuild.cmake.arguments(
        '-DCMAKE_JOB_POOLS=compile=2;link=1',
        '-DCMAKE_JOB_POOL_COMPILE=compile',
        '-DCMAKE_JOB_POOL_LINK=link'
      )
    }
  }
}
`;

module.exports = function withAndroidBuildSettings(config) {
  config = withProjectBuildGradle(config, (cfg) => {
    if (!cfg.modResults.contents.includes(MARK)) cfg.modResults.contents += CAP_NATIVE_JOBS;
    return cfg;
  });
  return withGradleProperties(config, (cfg) => {
    for (const [key, value] of Object.entries(SETTINGS)) {
      cfg.modResults = cfg.modResults.filter((p) => !(p.type === 'property' && p.key === key));
      cfg.modResults.push({ type: 'property', key, value });
    }
    return cfg;
  });
};

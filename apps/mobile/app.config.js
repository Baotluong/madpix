const { execSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const path = require('node:path');

/** Short commit hash, plus "+" if there are uncommitted changes. Empty outside a git checkout. */
function gitCommit() {
  try {
    const hash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    const dirty = execSync('git status --porcelain', { encoding: 'utf8' }).trim() !== '';
    return dirty ? `${hash}+` : hash;
  } catch {
    return '';
  }
}

/**
 * Firebase's Android config, needed for push notifications on Android. Download it from the
 * Firebase console (project settings, Android app com.madpixdev.madpix) into this folder. Builds
 * without it still work, just without notifications.
 */
const GOOGLE_SERVICES = './google-services.json';
const hasGoogleServices = existsSync(path.join(__dirname, GOOGLE_SERVICES));

// Everything else lives in app.json; this adds the build stamp shown on the home screen and the
// Firebase config when it's there.
/** @param {import('expo/config').ConfigContext} ctx @returns {import('expo/config').ExpoConfig} */
module.exports = ({ config }) => ({
  ...config,
  name: config.name ?? 'MadPix',
  slug: config.slug ?? 'madpix',
  android: { ...config.android, ...(hasGoogleServices && { googleServicesFile: GOOGLE_SERVICES }) },
  extra: { ...config.extra, commit: gitCommit() },
});

const { execSync } = require('node:child_process');

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

// Everything else lives in app.json; this only adds the build stamp shown on the home screen.
/** @param {import('expo/config').ConfigContext} ctx @returns {import('expo/config').ExpoConfig} */
module.exports = ({ config }) => ({
  ...config,
  name: config.name ?? 'MadPix',
  slug: config.slug ?? 'madpix',
  extra: { ...config.extra, commit: gitCommit() },
});

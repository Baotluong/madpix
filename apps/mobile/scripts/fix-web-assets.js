/**
 * Runs after `expo export -p web`. Expo puts library assets (the icon fonts, expo-router's images)
 * under dist/assets/node_modules/, but Cloudflare's uploader skips every folder named
 * node_modules, so the icons were missing on the live site. This moves them to
 * dist/assets/vendor/ and points the bundles at the new folder.
 */
const fs = require('node:fs');
const path = require('node:path');

const dist = path.join(__dirname, '..', 'dist');
const from = path.join(dist, 'assets', 'node_modules');
const to = path.join(dist, 'assets', 'vendor');

if (!fs.existsSync(from)) {
  console.log('fix-web-assets: no dist/assets/node_modules, nothing to do');
  process.exit(0);
}
fs.rmSync(to, { recursive: true, force: true });
fs.renameSync(from, to);

let changed = 0;
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(js|html|json)$/.test(entry.name)) {
      const text = fs.readFileSync(file, 'utf8');
      const next = text.split('/assets/node_modules/').join('/assets/vendor/');
      if (next !== text) {
        fs.writeFileSync(file, next);
        changed++;
      }
    }
  }
};
walk(dist);
console.log(`fix-web-assets: moved library assets to assets/vendor, updated ${changed} files`);

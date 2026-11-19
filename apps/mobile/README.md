# MadPix mobile app

Expo (React Native + TypeScript) app for Android, iOS and web. v0 is pass-and-play: one device, passed between artists.

## Run it

```bash
npm install        # also copies Skia's web file into public/
npx expo start     # press w for web, or scan the QR code with Expo Go on Android
```

Checks: `npm run typecheck` and `npx eslint src`.

**Which code is on my phone?** The home screen shows a build stamp in the bottom corner, like
`0.1.0 · 095eb16`. It's the commit the dev server started from (`+` means uncommitted changes),
set in `app.config.js`. Restart with `npx expo start --clear` after committing to update it.

## How it's built

| Path | What |
|---|---|
| `src/app/` | Screens (Expo Router): home, new drawing, play, reveal, gallery |
| `src/screens/` | Screens that draw with Skia, loaded lazily so web can load Skia's WebAssembly first |
| `src/drawing/` | Skia drawing canvas, toolbar, whole-page view, PNG export |
| `src/game/` | Game data types, local store (AsyncStorage), inspo word list |

Drawings are saved as vector strokes in 1000×500 strip units, not pixels, so they
scale to any screen and can be replayed later. (Drawings from before strips went 2:1 use 1000×1000.)

# MadPix mobile app

Expo (React Native + TypeScript) app for Android, iOS and web. v0 is pass-and-play: one device, passed between artists.

## Run it

```bash
npm install        # also copies Skia's web file into public/
npx expo start     # press w for web, or scan the QR code with Expo Go on Android
```

Checks: `npm run typecheck` and `npx eslint src`.

## How it's built

| Path | What |
|---|---|
| `src/app/` | Screens (Expo Router): home, new game, play, reveal, gallery |
| `src/screens/` | Screens that draw with Skia, loaded lazily so web can load Skia's WebAssembly first |
| `src/drawing/` | Skia drawing canvas, toolbar, whole-page view, PNG export |
| `src/game/` | Game data types, local store (AsyncStorage), inspo word list |

Drawings are saved as vector strokes in 1000×1000 "section units", not pixels, so they
scale to any screen and can be replayed later.

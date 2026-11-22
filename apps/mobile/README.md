# MadPix mobile app

Expo (React Native + TypeScript) app for Android, iOS and web. Two modes: **Send around** (online, each artist on their own phone) and **Pass around** (one device, passed between artists).

## Run it

```bash
npm install        # also copies Skia's web file into public/
npx expo start     # press w for web, or scan the QR code with Expo Go on Android
```

Checks: `npm run typecheck` and `npx eslint src`.

**Which code is on my phone?** The home screen shows a build stamp in the bottom corner, like
`0.2.0 · 5d73294`. It's the commit the dev server started from (`+` means uncommitted changes),
set in `app.config.js`. Restart with `npx expo start --clear` after committing to update it.

## Remote play (v1)

"Send around" talks to the API in `apps/api`. By default the app uses the deployed one at
https://madpix-api.fly.dev (set in `.env`).

To work on the API locally, point the app at your Mac instead:

```bash
echo "EXPO_PUBLIC_API_URL=local" > .env.local   # git ignores it
(cd ../api && ./gradlew bootRun)               # API on :8080
npx expo start --clear                         # phone and Mac on the same Wi-Fi
```

## Fixes without a new build (EAS Update)

Builds include `expo-updates`, so JavaScript-only changes (screens, text, game logic) can reach
installed apps without a new build or a Play review. Phones pick the update up the next time
the app opens.

```bash
npx eas-cli@latest update --channel production --message "What changed"
```

Updates only reach builds with the same `runtimeVersion` (in `app.json`). Bump it, and make a
new build, whenever native code changes: a new library with native code, a new permission, or
a change to the config plugins or `app.json` plugins. Build profiles map to channels of the same
name in `eas.json` (development, preview, production).

## Web version

The web build is live at https://madpix.pages.dev, hosted free on Cloudflare Pages. To update it:

```bash
npx wrangler login     # once per computer
npm run deploy:web     # builds dist/ against the Fly API, then uploads it
```

The deploy always points at the Fly API, even if `.env.local` says `local`. Cloudflare serves
`index.html` for any path it doesn't have a file for, so links like `/join/goose14` open the app.

## How it's built

| Path | What |
|---|---|
| `src/app/` | Screens (Expo Router): home, Pass around setup (`new`), play, reveal, gallery, Send around (`friends`), join |
| `src/screens/` | Screens that draw with Skia, loaded lazily so web can load Skia's WebAssembly first |
| `src/drawing/` | Skia drawing canvas, toolbar, whole-page view, PNG export |
| `src/game/` | Game data types, local store (AsyncStorage), inspo word list |
| `src/remote/` | Remote play: API client, this device's player, drafts, invite sharing |

Drawings are saved as vector strokes in 1000×500 strip units, not pixels, so they
scale to any screen and can be replayed later. (Drawings from before strips went 2:1 use 1000×1000.)

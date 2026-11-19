# MadPix

A digital take on the surrealist drawing game *exquisite corpse* (cadavre exquis).
Each artist draws one fold of the page, seeing only a sliver of the fold before theirs.
At the end, the page unfolds and everyone sees the whole picture.

## Repo layout

| Path | What |
|---|---|
| `apps/mobile` | Expo (React Native + TypeScript) app for Android, iOS and web |
| `apps/api` | Kotlin + Spring Boot API for remote play (coming in v1) |

## Run the app

```bash
cd apps/mobile
npm install
npx expo start
```

Press `w` for web, or scan the QR code with Expo Go on Android.

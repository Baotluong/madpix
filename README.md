# MadPix

A digital take on the surrealist drawing game *exquisite corpse* (cadavre exquis).
Each artist draws one fold of the page, seeing only a sliver of the fold before theirs.
At the end, the page unfolds and everyone sees the whole picture.

## Repo layout

| Path | What |
|---|---|
| `apps/mobile` | Expo (React Native + TypeScript) app for Android, iOS and web |
| `docs` | Rules and privacy policy, published with GitHub Pages; the contact email is in `docs/_config.yml` |
| `apps/api` | Kotlin + Spring Boot API for remote play (v1, in progress). See [its README](apps/api/README.md). |

## Run the app

```bash
cd apps/mobile
npm install
npx expo start
```

Press `w` for web, or scan the QR code with Expo Go on Android.

## Run the API

Needs JDK 21.

```bash
cd apps/api
./gradlew test
./gradlew bootRun    # http://localhost:8080
```

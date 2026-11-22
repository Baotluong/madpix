# MadPix API

Kotlin + Spring Boot API for remote play: anonymous players, private drawings with invite
codes, turn order, the sliver cut on the server, and push notifications through Expo.

## Run it

Needs JDK 21. Gradle comes with the project.

```bash
./gradlew test       # unit + end-to-end API tests on a throwaway SQLite file
./gradlew bootRun    # http://localhost:8080, data in ./madpix.db
```

## How a drawing works

1. The app creates a player once (`POST /players`) and keeps the returned token. Every
   other call sends it as `Authorization: Bearer <token>`. The database stores only its hash.
2. Artist 1 creates a drawing (`POST /drawings`) and can draw at once. The drawing has a
   6-letter invite code to share.
3. Others join with the code (`POST /drawings/join`) whenever they like, taking the next
   open spot. `GET /invites/{code}` shows who's in before joining.
4. Each artist folds their strip (`POST /drawings/{id}/strip`) on their turn. The next artist
   gets a push. If their spot isn't taken yet, the drawing waits until someone joins.
5. After the last strip, everyone gets a push and `GET /drawings/{id}` returns all strips.

The next artist only ever receives the **sliver**: the bottom 10% of the strip above,
with strokes cut at the band's edge on the server (`drawing/Sliver.kt`). The full strip
never reaches their phone.

| Method | Path | What |
|---|---|---|
| `POST` | `/players` | New anonymous player → `{ player, token }` |
| `GET` / `PATCH` | `/players/me` | Read, or change name / Expo push token |
| `DELETE` | `/players/me` | "Delete my data": leave unfinished drawings, wipe name, push token and login |
| `POST` | `/drawings` | Start a drawing (`artistCount` 2–4, optional `prompt`, `public`) |
| `POST` | `/drawings/play-now` | A spot in a public drawing where it's my turn now, or a new public drawing |
| `GET` | `/drawings` | My drawings, most recent first |
| `GET` | `/drawings/{id}` | One drawing, as I'm allowed to see it |
| `POST` | `/drawings/join` | Join with `{ code }` |
| `POST` | `/drawings/{id}/strip` | Fold my strip: `{ strokes }` |
| `POST` | `/drawings/{id}/report` | Flag a drawing I'm in (`{ reason }` optional); logged as a warning |
| `POST` | `/drawings/{id}/block` | Never share a public drawing or rematch with the artist at `{ position }` again |
| `POST` | `/drawings/{id}/rematch` | "Draw again": one new private drawing with the same artists, asker first |
| `GET` | `/invites/{code}` | Peek at a drawing before joining |
| `GET` | `/healthz` | Health check |

### Abuse limits

- Requests per client address (`Fly-Client-IP`): 20 new players an hour, 30 invite lookups or
  joins a minute, 60 other writes a minute, 300 reads a minute. Over that: `429` with `Retry-After`.
- Bodies over 5 MB get `413`; chunked bodies (no length) get `411`.
- A player can be in at most 20 unfinished drawings.
- Reports show up in `fly logs` as `Drawing reported: ...`.

### Moderation

`/admin/...` routes list reports, draw a reported drawing as an SVG, delete a drawing, or remove a
player (their strips are blanked, name and login wiped). They need the `ADMIN_TOKEN` secret and
answer 404 to everyone else. One-time setup (keeps the token in your Keychain, never in a file):

```bash
ADMIN_TOKEN=$(openssl rand -hex 32)
security add-generic-password -a madpix -s madpix-admin -w "$ADMIN_TOKEN"
fly secrets set ADMIN_TOKEN="$ADMIN_TOKEN" -a madpix-api
```

Then `./admin.sh reports`, `./admin.sh show <drawing-id>`, `./admin.sh delete <drawing-id>`,
`./admin.sh remove <player-id>`.

Errors are RFC 9457 problem details, e.g. `{"status": 409, "detail": "It's not your turn"}`.

## Layout

| Path | What |
|---|---|
| `admin/` | Moderation routes (`ADMIN_TOKEN`), used by `admin.sh` |
| `common/` | Errors, CORS, `AbuseFilter` (rate limits, body size), `WordFilter` (names, inspo) |
| `player/` | Anonymous players, token auth (`@CurrentPlayer`) |
| `drawing/` | Rules (`DrawingService`), SQL (`DrawingRepository`), sliver cutting, validation, turn time limits |
| `push/` | Expo push sender; notifications go out after the transaction commits |
| `resources/db/migration/` | Flyway migrations (SQLite) |

## Deploy (Fly.io)

Live at https://madpix-api.fly.dev (health check: `/healthz`). The first deploy:

```bash
fly apps create madpix-api
fly volumes create madpix_data --size 1 --region iad
fly deploy --ha=false
```

After that, `fly deploy` from this folder. The machine suspends when idle and resumes from a
memory snapshot in about a second. Right after a deploy, or if Fly moves the machine, it boots
from scratch instead, and that first request waits about 15 seconds.

SQLite allows one writer, so the app runs on a single machine with one database
connection. That also makes joining and folding strictly one-at-a-time.

## Public drawings

"Play now" (`POST /drawings/play-now`) hands out the oldest public drawing where every artist so far
has folded, so the new artist can draw at once. Drawings that were reported, or that hold someone
the player blocked (or was blocked by), are skipped. If there's nothing to join, or 20% of the time
anyway (`madpix.play-now.create-chance`), it starts a new public drawing: 2 artists half the time,
3 about a third, 4 the rest, with an inspo word 85% of the time.

In public drawings and rematches, each turn has 12 hours (`madpix.turn-timeout`). After that the
artist loses their spot, later artists move up, and the spot opens for "Play now" or the invite
code. Private drawings with friends have no limit.

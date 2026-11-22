# Changelog

## 0.3.0 (November 2026)

Second Google Play build. It also brings 0.2.0 (Play now, public drawings, Draw again, blocking,
the unfold replay) to Play testers for the first time.

- **Your move:** drawings waiting on you show on the home screen under the elephant, your turns
  first (soonest deadline first), then finished pages waiting to be unfolded. A finished drawing
  unfolds the first time you open it, even if it finished while you were away.
- **Notifications:** "It's your turn" and "Your drawing is finished". The app asks after your first
  online fold; tapping one opens the drawing.
- **See my strip** again while the others draw.
- **Bigger sliver:** the next artist sees 15% of the strip above, up from 10%.
- **Inspo words:** 82 tall subjects that split well top to bottom.
- **Fixes without a new build:** expo-updates, so JavaScript changes reach phones on next launch.
- Finished page no longer overlaps the buttons on nearly square screens (Fold cover screens);
  wrapped button labels are centered; timestamps from the API parse correctly on Android.

## 0.2.0 (November 2026)

Live on the API and the web (madpix.pages.dev). Not built for Google Play: testers there are on
0.1.0 until 0.3.0.

- **Play now:** one tap into a public drawing where it's your turn right away, or a new one with
  random settings. Backing out before drawing gives the spot up; Play now goes back to a turn
  you left untouched first.
- **Public drawings:** a Public switch when starting a drawing in Send around. Each turn in public
  drawings and rematches has 12 hours, then the spot opens for someone else.
- **Draw again:** a rematch with the same artists, whoever asks first draws first.
- **Safety:** block an artist from any online drawing; reported public drawings stop being handed
  out; a word filter for names and inspo words.
- **One artist name,** random to start, changed from the home screen.
- **Finished drawings:** tap to see them full screen; strips unfold and their lines redraw. A
  faint crease marks each fold.
- **Paper:** warm off-white with a faint grain.
- Web icons fixed on Cloudflare; Send around defaults to 2 artists; intro popups scroll.
- API: suspends when idle and wakes in about a second.

## 0.1.0 (November 2026)

First Google Play build (internal and closed testing, version code 7).

- **Pass around:** one device, passed between 2 to 4 artists.
- **Send around:** each artist on their own phone, joining with an invite code. Kotlin and Spring
  Boot API on Fly.io with SQLite.
- Anonymous players, reports, "Delete my online data", rate limits, and admin moderation tools.
- Privacy policy and rules on GitHub Pages.

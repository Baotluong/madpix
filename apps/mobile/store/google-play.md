# Google Play: store listing and App content answers

Drafts to paste into Play Console. They match the app as of version code 7 (Nov 2026) and the
privacy policy at https://baotluong.github.io/madpix/privacy/. If the app starts collecting
something new (push notifications, accounts, analytics), update the privacy policy and the Data
safety answers together.

## Store listing

Play Console → Grow users → Store presence → Main store listing.

**App name** (30 max)

```
MadPix: Fold & Draw
```

**Short description** (80 max)

```
Draw one strip, see only a sliver, then unfold a mad mashup made with friends.
```

**Full description** (4000 max)

```
MadPix is a drawing game for friends, based on the old fold-the-paper game exquisite corpse.

Each artist draws one strip of the picture. You only see a thin sliver of the strip before yours, so you have to guess what's going on and keep it going. When the last artist finishes, the page unfolds and everyone sees the mashup you made together.

TWO WAYS TO PLAY
• Send around: everyone draws on their own phone, whenever they're free. Start a drawing, share the invite code and take turns. Friends without the app can join from a web browser.
• Pass around: one phone, passed around the room. Good for parties, road trips and waiting rooms.

FEATURES
• 2 to 4 artists per drawing
• An optional "inspo" word, the same for everyone, if you want a theme
• Simple brushes, colors, eraser, undo and redo
• Save or share finished drawings as an image
• No account, no sign-in, no ads

PRIVACY
MadPix doesn't ask for your name, email or phone number. Pass around drawings never leave your phone. Send around keeps only what it needs to pass drawings between friends, and you can delete it from the app anytime.

Be kind: hateful, sexual or violent drawings and names aren't allowed, and anyone in a drawing can report it.
```

**Graphics**

| Asset | Size | Notes |
|---|---|---|
| App icon | 512×512 PNG | Done: [graphics/icon-512.png](graphics/icon-512.png), scaled from `assets/images/icon.png`. |
| Feature graphic | 1024×500 PNG | Done: [graphics/feature-graphic.png](graphics/feature-graphic.png). Edit the HTML next to it and re-render with the command at its top. |
| Phone screenshots | 2–8, 16:9 landscape works | Take them on a phone during testing: the home screen, drawing a strip, the sliver hint, and a finished unfolded page. |

**Category:** Game → Casual. **Tags:** drawing, party, multiplayer (pick what Play offers).

**Contact details:** email madpixdev@gmail.com, website https://madpix.pages.dev.

## App content

Play Console → Policy and programs → App content. Answer in this order.

### Privacy policy

```
https://baotluong.github.io/madpix/privacy/
```

### App access

**All functionality in my app is available without any access restrictions.** There's no
sign-in, so reviewers don't need a test account.

### Ads

**No, my app does not contain ads.**

### Content rating

Start the IARC questionnaire. Email: madpixdev@gmail.com. Category: **Game** (or "All other app
types" if Game doesn't fit the options shown).

| Question | Answer |
|---|---|
| Violence, blood, fear, sexuality, crude humor, language | No |
| Controlled substances (drugs, alcohol, tobacco) | No |
| Gambling or simulated gambling | No |
| Can users interact or exchange content with each other? | **Yes.** Players in a drawing see each other's chosen names and drawings. |
| Can users block users or user-generated content? | **Yes** (since public games: Block on any online drawing) |
| Can users report users or user-generated content? | **Yes** (Report on any online drawing) |
| Chat moderation? | **No.** There's no chat. |
| Can interactions be limited to invited friends only? | **No** (since public games: Play now puts strangers together) |
| Does the app share the user's current location with other users? | No |
| Can users buy digital goods? | No |
| Is the app a web browser or search engine? | No |

Expected result: Everyone / PEGI 3, with the note "Users Interact".

### Target audience and content

- **Target age groups:** 13–15, 16–17 and 18+. Leave every under-13 group unticked, to match the
  privacy policy. Ticking one puts the app under the Families policy and its extra rules.
- **Could the store listing unintentionally appeal to children?** No. If Play asks for a reason,
  say the game is a social drawing game meant for teens and adults, and the policy says 13+.

### News apps

**No.**

### Health apps, financial features, government apps

None. Answer **No** to each if asked.

### Data safety

**Overview**

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** (HTTPS only) |
| Do you provide a way for users to request that their data is deleted? | **Yes** (in the app, or by email) |
| Account creation | **My app does not allow users to create an account** |

Data handled by Fly.io (hosting) and Expo (push delivery) on our behalf counts as "service
provider" use, not sharing. So nothing is **shared**.

**Data types to tick** (everything else stays unticked)

| Data type | Collected | Shared | Processed ephemerally? | Required or optional | Purposes |
|---|---|---|---|---|---|
| Personal info → **Name** | Yes | No | No | Optional | App functionality |
| App activity → **Other user-generated content** | Yes | No | No | Optional | App functionality |
| Device or other IDs | Yes | No | No | Optional | App functionality |

Why each one:

- **Name:** the name you draw as in Send around. It's usually a random one like "Picasso
  Platypus", but Google counts nicknames as names.
- **Other user-generated content:** the drawings made in Send around, plus any report reasons.
- **Device or other IDs:** the random login key the app makes for each install, so the server
  knows which artist is which. If push notifications ship, the push token falls under this type
  too.
- **Optional:** all three only apply to Send around. Pass around works without sending
  anything.

Not collected, so leave unticked:

- **Location:** IP addresses are only held in memory for rate limiting, never stored, and never
  used for location.
- **Photos and videos:** saving or sharing a finished picture goes through the phone's share
  sheet. Nothing is uploaded to us.
- **App info and performance, crash logs, analytics:** none.

### Advertising ID

**No.** The app doesn't use the advertising ID, and none of its libraries add the `AD_ID`
permission.

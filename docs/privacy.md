---
layout: default
title: MadPix privacy policy
permalink: /privacy/
---

# Privacy policy

*Last updated: November 20, 2026*

MadPix has no accounts. You don't give us an email address, phone number or password, and we
don't use ads, analytics or tracking. This page explains the little we do keep.

## Pass around (one device)

Drawings made in **Pass around** never leave your device. They're saved on the device in the
app's gallery, and deleting the app deletes them. On the web version, they're saved in your
browser, and clearing the site's data deletes them.

## Send around (online)

To let friends draw on their own phones, our server keeps:

- **The name you draw as.** You pick it, or the app picks a random one like "Picasso Platypus".
  It doesn't need to be your real name. Other artists in your drawings see it.
- **Your drawings.** The strips you draw in Send around drawings, and who drew which strip.
  Only the artists in a drawing can see it.
- **A random login key** the app makes for this device, so the server knows it's you. We only
  keep a scrambled (hashed) copy.
- **A push notification token,** if you allow notifications, so we can tell you when it's your
  turn.
- **Reports** you send about a drawing.

Our server also sees your device's IP address with each request. We use it only to stop
too many requests from one place. It stays in memory for about an hour and is never written to
disk.

## Who else gets data

We don't sell or share your data. Three services help run MadPix:

- **Fly.io** hosts our server and its database, in the United States.
- **Expo** delivers push notifications to your device.
- **Cloudflare** hosts the web version at madpix.pages.dev. It sees your IP address when it
  sends you the pages.

## How long we keep it

Online drawings and names stay until you delete them. Server backups are kept for 5 days, so
deleted data is gone from backups within 5 days.

## Deleting your data

In the app, open **Send around** and tap **Delete my online data**. This:

- removes your name, login key and push token from our server;
- takes you out of drawings you haven't drawn in yet (drawings with only you in them are deleted);
- keeps strips you already drew in friends' drawings, but shown as "Deleted artist".

Can't use the app? Email {{ site.contact_email }} with the name you drew as and an invite code
from one of your drawings, and we'll delete it for you.

## Children

MadPix isn't meant for children under 13, and we don't knowingly collect data from them.

## Security

All traffic to our server is encrypted (HTTPS). Login keys are stored hashed.

## Changes

If this policy changes, we'll update this page and the date at the top.

## Contact

{{ site.contact_email }}

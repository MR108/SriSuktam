# Sri Suktam Sadhana — with daily reminder notifications

A 960-day Sri Suktam practice tracker that installs on your phone like an app and sends
reminders at **7:00 AM**, **6:00 PM** and **10:00 PM** (you can change the times in the app).

## What's in this folder

| Path | What it is |
|---|---|
| `public/index.html` | The app (counter, read-along verses, journey grid, reminders) |
| `public/sw.js` | Background script: receives notifications, works offline |
| `public/manifest.webmanifest`, `public/*.png` | Makes it installable with its own icon |
| `netlify/functions/push.mjs` | `/api/push` — turns reminders on/off, sends a test |
| `netlify/functions/reminders.mjs` | Runs every 5 minutes and sends any reminder that is due |
| `netlify/lib/push-core.mjs` | Shared logic (times, messages, sending) |
| `netlify.toml`, `package.json` | Netlify settings and the two libraries it installs |

No keys or settings to configure: the security keys for notifications are created
automatically the first time the site runs and stored in Netlify's built-in storage.

## Deploy (about 10 minutes, on a computer)

Netlify's drag-and-drop page can't run the reminder functions, so deploy through GitHub:

1. **GitHub** → sign in → **New repository** → name it `sri-suktam` → **Create**.
2. On the new repo page click **uploading an existing file**. Drag in everything from this
   folder (`public`, `netlify`, `netlify.toml`, `package.json`, `README.md`) → **Commit changes**.
   Check the repo shows the `public` and `netlify` folders, not just loose files.
3. **Netlify** → **Add new project → Import an existing project → GitHub** → pick `sri-suktam`.
   Leave the build settings as they are (they come from `netlify.toml`) → **Deploy**.
4. When it says *Published*, open the site link (e.g. `https://sri-suktam.netlify.app`).
   You can rename it under **Project configuration → Change project name**.

Alternative with the command line: `npm i -g netlify-cli`, then in this folder
`netlify deploy --prod`.

## Turn on reminders on your phone

**Android (Chrome)**
1. Open your site link in Chrome.
2. Menu ⋮ → **Add to Home screen** / **Install app** (optional, but nicer).
3. In the app: **🔔 Turn on reminders** → **Allow** → **Send test**.

**iPhone (iOS 16.4 or later)**
1. Open your site link in **Safari**.
2. Share button → **Add to Home Screen** → **Add**.
3. Open **Sri Suktam** from the home screen (not from Safari).
4. **🔔 Turn on reminders** → **Allow** → **Send test**.

## Good to know

- Reminders are skipped when they're not needed: no morning nudge if the morning is already
  done, and no 10 PM nudge once the day is complete. (The app tells the server only these
  done/not-done flags, the date, and your start date.)
- Reminders arrive within about 5 minutes of the set time. Battery saver or Do Not Disturb
  can delay or silence them.
- Changing a reminder time in the app updates the server immediately.
- Your practice log stays on your phone. Use **Settings → Download backup** every week or two.
- To check the reminders are running: Netlify → your project → **Logs → Functions →
  reminders**. Each run prints `checked N, sent M`.
- The free Netlify plan is plenty: the reminder check runs 288 times a day and takes well
  under a second each time.

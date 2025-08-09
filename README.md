# Evelyn's Root Trainer (PWA)
A small Progressive Web App that drills perfect square and cube roots for 1–100.

## Quick Start (local)
1) Install Node.js (v18+ recommended): https://nodejs.org
2) In this folder run:
   ```bash
   npm install
   npm run dev
   ```
3) Open the printed local URL.

## Deploy Free (Netlify)
1) Create a free GitHub account: https://github.com
2) Create a new repository named `evelyn-root-trainer` (public or private, both are free).
3) Upload the files from this folder to that repository.
4) Go to https://app.netlify.com and sign up (free).
5) Click **Add new site → Import an existing project → GitHub**, select your repo.
6) Build settings (Netlify will detect Vite automatically). If asked:
   - Build command: `npm run build`
   - Publish directory: `dist`
7) Deploy. Netlify gives you a live URL like `https://something.netlify.app`

## Install on iPhone (as an app icon)
1) Open the Netlify URL in **Safari** on the iPhone.
2) Tap the **Share** icon.
3) Tap **Add to Home Screen**.
4) Launch from the home screen icon. It opens full-screen like an app.
5) The app works offline after the first load.

## Notes
- All settings are saved locally in the browser.
- To update the app, push new code to GitHub; Netlify redeploys automatically.

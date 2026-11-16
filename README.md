# Aura TV

Aura TV is an ultra-premium live TV streaming platform with a high-fidelity glassmorphism interface, built with React, Vite, Tailwind CSS, and HLS.js.

Live demo: https://aura-tv-seven.vercel.app

## Features

- HLS (m3u8) live TV player
- Dynamic channel categories
- Search across channels
- Favorites system
- Continue Watching tracking
- Responsive, mobile-first design

## Run Locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy [`.env.example`](.env.example) to `.env.local` and set your `GEMINI_API_KEY`:

   ```bash
   cp .env.example .env.local
   ```

3. Start the dev server:

   ```bash
   npm run dev
   ```

   The app runs at http://localhost:3000.

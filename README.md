# SmartFall – Real-Time Fall Detection & Alert Stack

SmartFall is a hackathon-friendly prototype that turns any smartphone into a fall detector, pushes alerts to a backend API, and surfaces them on a lightweight dashboard.

## Project structure

```
backend/   → Node/Express API + SQLite + email alerts
mobile/    → Expo (React Native) app reading sensors & posting events
dashboard/ → Vite + React dashboard showing recent events
```

## Backend API

### Setup

```bash
cd backend
npm install
cp env.sample .env   # edit with SMTP + origin info
npm run dev
```

Environment variables (`env.sample`):

- `PORT` – API port (default 4000)
- `DASHBOARD_ORIGIN` – allowed origin for dashboard (e.g. http://localhost:5173)
- `SMTP_HOST|PORT|USER|PASS|EMAIL_FROM` – optional SMTP settings. If omitted the server logs the email body instead of sending.

### Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET /health` | Health check |
| `POST /api/events` | Accept fall event `{ userId, userName, contactEmail, location:{lat,lng}, severity, score }` |
| `GET /api/events` | Returns latest 100 events (time, status, location) |

Events are stored in `backend/data/smartfall.db` (SQLite).

## Mobile app (Expo)

### Setup

```bash
cd mobile
npm install
```

Create `mobile/.env` (or set in app config) with:

```
EXPO_PUBLIC_API_URL=http://<your-machine-ip>:4000
```

Then run Expo:

```bash
npm start
```

### Features

- Streams accelerometer + gyroscope data (100ms)
- Hybrid fall score (high-G threshold + jerk + rotation energy)
- 10s confirmation countdown with cancel trigger
- On confirm: requests GPS, POSTs to backend, displays latest alert summary

## Dashboard (Vite + React)

### Setup

```bash
cd dashboard
npm install
VITE_API_URL=http://localhost:4000 npm run dev
```

### Features

- Polls backend every 10s for recent events
- Table view with time, user, severity, status, Google Maps link
- Soft UI ready for quick demos

## Suggested hackathon flow

1. Start backend (`npm run dev`).
2. Run dashboard (`VITE_API_URL=http://localhost:4000 npm run dev`).
3. Launch Expo app (set `EXPO_PUBLIC_API_URL` to your LAN IP).
4. Trigger test falls by shaking the phone; watch dashboard update and email logs fire.

Happy hacking! 🚑

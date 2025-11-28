# SmartFall – Real-Time Fall Detection & Alert Stack

SmartFall is a hackathon-friendly prototype that turns any smartphone into a fall detector, pushes alerts to a backend API, and surfaces them on a lightweight dashboard.

## Project structure

```
smartfall-app/
  App.js
  hooks/useFallDetector.js
  services/api.js
  services/sensors.js

smartfall-backend/
  index.js
  env.js
  firebase.js
  email.js
  routes/events.js

smartfall-dashboard/
  src/App.jsx
  src/api.js
  src/components/EventsTable.jsx
```

## Backend API

### Setup

```bash
cd smartfall-backend
npm install
cp env.sample .env   # edit with SMTP + origin info
npm run dev
```

Environment variables (`env.sample`):

- `PORT` – API port (default 4000)
- `DASHBOARD_ORIGIN` – allowed origin for dashboard (e.g. http://localhost:5173)
- `SMTP_HOST|PORT|USER|PASS|EMAIL_FROM` – optional SMTP settings. If omitted the server logs the email body instead of sending.
- `EMERGENCY_CONTACT` – fallback recipient for alert emails (defaults to `emergency-contact@example.com`)
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_DATABASE_URL` – service account credentials for Firebase Admin SDK. Remember to escape literal `\n` in the private key.

### Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET /` | Plain-text ping (“SmartFall backend running”) |
| `GET /health` | JSON health check |
| `POST /api/events` | Accepts `{ userId, type, location?, timestamp? }`, stores doc, emails alert |
| `GET /api/events` | Returns `{ success, events:[...] }` for the latest 50 events |

Events are stored in the Firestore collection `events` with shape:

```json
{
  "userId": "demo-user-1",
  "type": "FALL",
  "timestamp": "2025-11-28T06:53:00.000Z",
  "location": { "lat": 19.07, "lng": 72.87 },
  "status": "OPEN"
}
```

## Mobile app (Expo)

### Setup

```bash
cd smartfall-app
npm install
```

Create `smartfall-app/.env` (or set in app config) with:

```
EXPO_PUBLIC_API_URL=http://<your-machine-ip>:4000
```

Then run Expo:

```bash
npm start
```

### Features

- Streams accelerometer + gyroscope data (20 Hz via `services/sensors.js`)
- Hybrid fall score (impact threshold + jerk + rotation energy) in `hooks/useFallDetector`
- 10s confirmation countdown with cancel trigger
- On confirm: requests GPS (best effort), POSTs `{ userId, type, location?, timestamp }` to backend via axios, displays latest alert summary

## Dashboard (Vite + React)

### Setup

```bash
cd smartfall-dashboard
npm install
VITE_API_URL=http://localhost:4000 npm run dev
```

### Features

- Polls backend every 5s via `src/api.js` (`GET /api/events` → `{ success, events }`)
- `EventsTable` renders time, user, type, status, Google Maps link
- Soft UI ready for quick demos

## Suggested hackathon flow

1. Start backend (`cd smartfall-backend && npm run dev`).
2. Run dashboard (`cd smartfall-dashboard && VITE_API_URL=http://localhost:4000 npm run dev`).
3. Launch Expo app (`cd smartfall-app`, set `EXPO_PUBLIC_API_URL` to your LAN IP, then `npm start`).
4. Trigger test falls by shaking the phone; watch dashboard update and email logs fire.

Happy hacking! 🚑

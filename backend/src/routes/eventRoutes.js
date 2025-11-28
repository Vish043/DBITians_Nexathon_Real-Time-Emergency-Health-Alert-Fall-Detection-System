import { Router } from 'express';
import { nanoid } from 'nanoid';
import { getDb } from '../config/db.js';
import { sendAlertEmail } from '../services/emailService.js';

const router = Router();

router.get('/', async (_req, res) => {
  const db = await getDb();
  const events = await db.all(
    `SELECT * FROM events ORDER BY datetime(fall_detected_at) DESC LIMIT 100`
  );
  res.json(events);
});

router.post('/', async (req, res) => {
  try {
    const { userId, userName, contactEmail, location, severity, score, notes } = req.body ?? {};

    if (!userId || !userName) {
      return res.status(400).json({ message: 'userId and userName are required' });
    }

    const lat = location?.lat ?? null;
    const lng = location?.lng ?? null;
    const timestamp = new Date().toISOString();
    const id = nanoid();

    const db = await getDb();
    await db.run(
      `
      INSERT INTO events (
        id, user_id, user_name, contact_email, status,
        fall_detected_at, location_lat, location_lng, severity, score, notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      id,
      userId,
      userName,
      contactEmail ?? null,
      'alerted',
      timestamp,
      lat,
      lng,
      severity ?? 'unknown',
      score ?? null,
      notes ?? null
    );

    // fire and forget (log errors)
    sendAlertEmail({ contactEmail, userName, userId, timestamp, lat, lng }).catch((err) =>
      console.error('Failed to send email', err.message)
    );

    res.status(201).json({
      id,
      userId,
      userName,
      contactEmail,
      status: 'alerted',
      fallDetectedAt: timestamp,
      location: { lat, lng },
      severity: severity ?? 'unknown',
      score: score ?? null,
      notes: notes ?? null
    });
  } catch (err) {
    console.error('POST /api/events error', err);
    res.status(500).json({ message: 'Failed to store event' });
  }
});

export default router;


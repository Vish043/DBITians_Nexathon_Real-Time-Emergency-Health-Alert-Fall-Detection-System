import { Router } from 'express';
import { nanoid } from 'nanoid';
import { firestore } from '../firebase.js';
import { sendAlertEmail } from '../email.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const snapshot = await firestore
      .collection('events')
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();

    const events = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ success: true, events });
  } catch (err) {
    console.error('GET /api/events error', err);
    res.status(500).json({ success: false, message: 'Failed to fetch events' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { userId, type = 'FALL', location, timestamp } = req.body ?? {};

    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }

    const eventTimestamp = timestamp ?? new Date().toISOString();
    const coords =
      location?.lat != null && location?.lng != null
        ? { lat: Number(location.lat), lng: Number(location.lng) }
        : null;

    const id = nanoid();
    const payload = {
      userId,
      type,
      timestamp: eventTimestamp,
      location: coords,
      status: 'OPEN'
    };

    await firestore.collection('events').doc(id).set(payload);

    sendAlertEmail({ userId, timestamp: eventTimestamp, location: coords }).catch((err) =>
      console.error('Failed to send email', err.message)
    );

    res.status(201).json({ success: true, eventId: id });
  } catch (err) {
    console.error('POST /api/events error', err);
    res.status(500).json({ success: false, message: 'Failed to store event' });
  }
});

export default router;


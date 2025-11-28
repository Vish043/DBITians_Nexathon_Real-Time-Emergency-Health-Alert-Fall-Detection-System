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
    console.log('[Backend] Full request body:', JSON.stringify(req.body, null, 2));
    
    const { 
      userId, 
      userName, 
      emergencyEmail, 
      type = 'FALL', 
      location, 
      timestamp,
      severity,
      severityScore,
      severityMetrics
    } = req.body ?? {};

    console.log('[Backend] Extracted values:', { 
      userId, 
      userName, 
      emergencyEmail, 
      type, 
      hasLocation: !!location,
      severity,
      severityScore
    });

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
      userName: userName || null,
      emergencyEmail: emergencyEmail || null,
      type,
      timestamp: eventTimestamp,
      location: coords,
      status: 'OPEN',
      severity: severity || 'UNKNOWN',
      severityScore: severityScore || null,
      severityMetrics: severityMetrics || null
    };

    console.log('[Backend] Storing event with payload:', payload);

    await firestore.collection('events').doc(id).set(payload);

    // Send response immediately, then send email asynchronously
    res.status(201).json({ success: true, eventId: id });

    // Send email in background (non-blocking)
    console.log('[Backend] Sending email with:', { 
      userId, 
      userName: userName || userId, 
      emergencyEmail: emergencyEmail || 'using default',
      timestamp: eventTimestamp 
    });
    
    sendAlertEmail({ 
      userId, 
      userName: userName || userId,
      emergencyEmail,
      timestamp: eventTimestamp, 
      location: coords,
      severity: severity || null,
      severityMetrics: severityMetrics || null
    }).catch((err) =>
      console.error('[Backend] Failed to send email:', err.message)
    );
  } catch (err) {
    console.error('POST /api/events error', err);
    res.status(500).json({ success: false, message: 'Failed to store event' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Event ID is required' });
    }

    if (!status || !['OPEN', 'RESOLVED', 'INVESTIGATING'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid status is required (OPEN, RESOLVED, INVESTIGATING)' 
      });
    }

    await firestore.collection('events').doc(id).update({ status });

    res.json({ success: true, message: 'Event status updated successfully' });
  } catch (err) {
    console.error('PATCH /api/events/:id error', err);
    res.status(500).json({ success: false, message: 'Failed to update event status' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Event ID is required' });
    }

    await firestore.collection('events').doc(id).delete();

    res.json({ success: true, message: 'Event deleted successfully' });
  } catch (err) {
    console.error('DELETE /api/events/:id error', err);
    res.status(500).json({ success: false, message: 'Failed to delete event' });
  }
});

export default router;


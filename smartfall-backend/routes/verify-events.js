import { Router } from 'express';
import { firestore } from '../firebase.js';

const router = Router();

/**
 * GET /api/verify-events
 * Public endpoint to verify events are being stored
 * Shows all events in Firestore (for debugging)
 */
router.get('/', async (req, res) => {
  try {
    console.log('[VerifyEvents] Checking all events in Firestore...');
    
    const snapshot = await firestore
      .collection('events')
      .limit(20)
      .get();
    
    const events = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        userName: data.userName,
        emergencyEmail: data.emergencyEmail, // Include emergencyEmail in response
        type: data.type,
        timestamp: data.timestamp,
        status: data.status,
        severity: data.severity?.level || 'UNKNOWN'
      };
    });
    
    // Also check links
    const linksSnapshot = await firestore
      .collection('emergencyLinks')
      .where('status', '==', 'ACTIVE')
      .get();
    
    const links = linksSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        emergencyContactEmail: data.emergencyContactEmail,
        status: data.status
      };
    });
    
    res.json({
      success: true,
      summary: {
        totalEvents: snapshot.docs.length,
        totalActiveLinks: linksSnapshot.docs.length
      },
      events,
      links,
      message: 'Check if userId in events matches userId in links'
    });
  } catch (error) {
    console.error('[VerifyEvents] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;


import { Router } from 'express';
import { firestore, admin } from '../firebase.js';
import { verifyToken, getAccessibleUserIds } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/diagnostics
 * Diagnostic endpoint to check why events aren't showing
 * Requires authentication
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const emergencyContactEmail = req.user.email;
    const normalizedEmail = emergencyContactEmail?.toLowerCase().trim();
    
    console.log('[Diagnostics] Running diagnostics for:', normalizedEmail);
    
    const diagnostics = {
      emergencyContactEmail: normalizedEmail,
      timestamp: new Date().toISOString(),
      checks: {}
    };
    
    // Check 1: User exists in Firebase Auth
    try {
      const userRecord = await admin.auth().getUserByEmail(emergencyContactEmail);
      diagnostics.checks.firebaseAuth = {
        exists: true,
        uid: userRecord.uid,
        email: userRecord.email
      };
    } catch (error) {
      diagnostics.checks.firebaseAuth = {
        exists: false,
        error: error.message
      };
    }
    
    // Check 2: Emergency links
    const linksSnapshot = await firestore
      .collection('emergencyLinks')
      .where('emergencyContactEmail', '==', normalizedEmail)
      .where('status', '==', 'ACTIVE')
      .get();
    
    const links = linksSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    diagnostics.checks.emergencyLinks = {
      count: links.length,
      links: links
    };
    
    // Check 3: Accessible user IDs
    const accessibleUserIds = await getAccessibleUserIds(emergencyContactEmail);
    diagnostics.checks.accessibleUserIds = {
      count: accessibleUserIds.length,
      userIds: accessibleUserIds
    };
    
    // Check 4: Events in Firestore
    const allEventsSnapshot = await firestore
      .collection('events')
      .limit(10)
      .get();
    
    const allEvents = allEventsSnapshot.docs.map(doc => ({
      id: doc.id,
      userId: doc.data().userId,
      timestamp: doc.data().timestamp,
      type: doc.data().type
    }));
    
    diagnostics.checks.allEvents = {
      totalInFirestore: allEventsSnapshot.docs.length,
      sampleEvents: allEvents
    };
    
    // Check 5: Events matching accessible user IDs
    if (accessibleUserIds.length > 0) {
      const matchingEventsSnapshot = await firestore
        .collection('events')
        .where('userId', 'in', accessibleUserIds.slice(0, 10))
        .limit(10)
        .get();
      
      const matchingEvents = matchingEventsSnapshot.docs.map(doc => ({
        id: doc.id,
        userId: doc.data().userId,
        timestamp: doc.data().timestamp,
        type: doc.data().type
      }));
      
      diagnostics.checks.matchingEvents = {
        count: matchingEvents.length,
        events: matchingEvents
      };
    } else {
      diagnostics.checks.matchingEvents = {
        count: 0,
        reason: 'No accessible user IDs found'
      };
    }
    
    // Summary
    diagnostics.summary = {
      hasLink: links.length > 0,
      hasAccessibleUsers: accessibleUserIds.length > 0,
      hasEvents: allEventsSnapshot.docs.length > 0,
      hasMatchingEvents: diagnostics.checks.matchingEvents?.count > 0,
      issue: null
    };
    
    // Determine issue
    if (!diagnostics.summary.hasLink) {
      diagnostics.summary.issue = 'No emergency link found. User needs to link this contact from mobile app.';
    } else if (!diagnostics.summary.hasAccessibleUsers) {
      diagnostics.summary.issue = 'Link exists but accessible user IDs are empty. Check email case matching.';
    } else if (!diagnostics.summary.hasEvents) {
      diagnostics.summary.issue = 'No events exist in Firestore. User needs to trigger a fall from mobile app.';
    } else if (!diagnostics.summary.hasMatchingEvents) {
      diagnostics.summary.issue = 'Events exist but userIds don\'t match. Check if events use same userId as link.';
    } else {
      diagnostics.summary.issue = 'Everything looks good! Events should be visible.';
    }
    
    res.json({
      success: true,
      diagnostics
    });
  } catch (error) {
    console.error('[Diagnostics] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;


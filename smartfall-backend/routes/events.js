import { Router } from 'express';
import { nanoid } from 'nanoid';
import { firestore, admin } from '../firebase.js';
import { sendAlertEmail } from '../email.js';
import { verifyToken, getAccessibleUserIds } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/events
 * Get events - requires authentication
 * Returns only events for users linked to the authenticated emergency contact
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    if (!req.user || !req.user.email) {
      console.error('[Events] No user email in request');
      return res.status(401).json({ 
        success: false, 
        message: 'User email not found in token' 
      });
    }

    const emergencyContactEmail = req.user.email;
    const normalizedQueryEmail = emergencyContactEmail.toLowerCase().trim();
    console.log('========================================');
    console.log('[Events] GET request from:', emergencyContactEmail);
    console.log('[Events] User UID:', req.user.uid);
    console.log('[Events] Querying events where userId = emergencyEmail:', normalizedQueryEmail);
    console.log('========================================');

    // NEW APPROACH: Use emergencyEmail as userId
    // Each emergency contact has their own userId (their email)
    // Events are stored with userId = emergencyEmail
    // So we query events where userId = logged-in email
    
    // Still verify the link exists for security
    const accessibleUserIds = await getAccessibleUserIds(emergencyContactEmail);
    console.log('[Events] Accessible user IDs (from links):', accessibleUserIds);
    console.log('[Events] Number of accessible users:', accessibleUserIds.length);
    
    // Use the logged-in email as the userId to query
    const userIdsToQuery = [normalizedQueryEmail];
    console.log('[Events] Querying events for userId (emergencyEmail):', userIdsToQuery);

    if (accessibleUserIds.length === 0) {
      // No linked users yet
      console.log('[Events] ⚠️ No linked users found');
      console.log('[Events] Checking if any links exist in database...');
      
      // Debug: Check all links
      try {
        const allLinksSnapshot = await firestore
          .collection('emergencyLinks')
          .where('status', '==', 'ACTIVE')
          .get();
        console.log('[Events] Total active links in database:', allLinksSnapshot.docs.length);
        if (allLinksSnapshot.docs.length > 0) {
          console.log('[Events] Sample links:');
          allLinksSnapshot.docs.slice(0, 5).forEach((doc, idx) => {
            const data = doc.data();
            console.log(`[Events] Link ${idx + 1}: userId="${data.userId}", email="${data.emergencyContactEmail}"`);
          });
          console.log('[Events] Query email (normalized):', emergencyContactEmail?.toLowerCase().trim());
          
          // Check if email mismatch
          const linkedEmails = allLinksSnapshot.docs.map(doc => doc.data().emergencyContactEmail?.toLowerCase().trim());
          const queryEmailNormalized = emergencyContactEmail?.toLowerCase().trim();
          const emailMatches = linkedEmails.includes(queryEmailNormalized);
          
          if (!emailMatches) {
            console.log('[Events] ⚠️ EMAIL MISMATCH DETECTED!');
            console.log('[Events] You are logged in as:', emergencyContactEmail);
            console.log('[Events] But links exist for:', linkedEmails);
            console.log('[Events] SOLUTION: Either:');
            console.log('[Events]   1. Log in with one of the linked emails:', linkedEmails);
            console.log('[Events]   2. Or create a new link from mobile app using:', emergencyContactEmail);
          }
        }
      } catch (debugErr) {
        console.error('[Events] Error checking links:', debugErr);
      }
      
      return res.json({ 
        success: true, 
        events: [],
        message: 'No linked users found. Users need to add you as an emergency contact from the mobile app.',
        debug: {
          queryEmail: emergencyContactEmail,
          normalizedEmail: emergencyContactEmail?.toLowerCase().trim(),
          hint: 'Check if you are logged in with the correct email address that was linked from the mobile app.'
        }
      });
    }

    // NEW APPROACH: userId = emergencyEmail
    // Query events where userId matches the logged-in emergency contact's email
    console.log('[Events] Querying events where userId = emergencyEmail:', normalizedQueryEmail);
    console.log('[Events] Privacy: Each emergency contact only sees events stored with their email as userId');

    // Note: Firestore requires a composite index when using where + orderBy on different fields
    // If you get an index error, create the index in Firestore Console
    let snapshot;
    try {
      // Query events where userId = emergencyEmail (the logged-in contact's email)
      snapshot = await firestore
        .collection('events')
        .where('userId', '==', normalizedQueryEmail)
        .orderBy('timestamp', 'desc')
        .limit(200) // Increased limit to store more past events
        .get();
    } catch (queryError) {
      console.error('[Events] Firestore query error:', queryError);
      console.error('[Events] Error code:', queryError.code);
      console.error('[Events] Error message:', queryError.message);
      
      // Check if it's an index error (code 9 = FAILED_PRECONDITION)
      const isIndexError = queryError.code === 9 || 
                          (queryError.message && queryError.message.toLowerCase().includes('index')) ||
                          (queryError.code && queryError.code.toString().includes('FAILED_PRECONDITION'));
      
      if (isIndexError) {
        console.log('[Events] Index error detected, trying query without orderBy...');
        console.log('[Events] Querying for userId:', normalizedQueryEmail);
        try {
          // Query without orderBy, then sort in memory - userId = emergencyEmail
          const fallbackSnapshot = await firestore
            .collection('events')
            .where('userId', '==', normalizedQueryEmail)
            .limit(200) // Increased limit to store more past events
            .get();
          
          console.log('[Events] ✅ Fallback query successful! Got', fallbackSnapshot.docs.length, 'events');
          
          if (fallbackSnapshot.docs.length === 0) {
            console.log('[Events] ⚠️ No events found for userId:', normalizedQueryEmail);
            console.log('[Events] Checking if events exist in Firestore...');
            // Debug: Check if any events exist at all
            const allEventsSnapshot = await firestore
              .collection('events')
              .limit(10)
              .get();
            console.log('[Events] Total events in Firestore:', allEventsSnapshot.docs.length);
            if (allEventsSnapshot.docs.length > 0) {
              console.log('[Events] Sample events:');
              allEventsSnapshot.docs.forEach((doc, idx) => {
                const data = doc.data();
                console.log(`[Events] Event ${idx + 1}: userId="${data.userId}", timestamp="${data.timestamp}"`);
              });
              console.log('[Events] Expected userId to match:', normalizedQueryEmail);
              console.log('[Events] Checking if event userIds match...');
              const matchingEvents = allEventsSnapshot.docs.filter(doc => {
                const data = doc.data();
                const userIdMatches = data.userId === normalizedQueryEmail;
                if (!userIdMatches) {
                  console.log(`[Events]   ❌ Mismatch: Event userId="${data.userId}" (expected: "${normalizedQueryEmail}")`);
                } else {
                  console.log(`[Events]   ✅ Match: Event userId="${data.userId}"`);
                }
                return userIdMatches;
              });
              console.log('[Events] Matching events found:', matchingEvents.length);
              if (matchingEvents.length === 0) {
                console.log('[Events] ⚠️ ISSUE: Events exist but userIds don\'t match!');
                console.log('[Events] SOLUTION: Make sure mobile app uses emergencyEmail as userId when creating events');
                console.log('[Events] SOLUTION: Expected userId format: emergencyEmail (e.g., "adechoes01@gmail.com")');
              }
            } else {
              console.log('[Events] ⚠️ No events exist in Firestore at all. User needs to trigger a fall from mobile app.');
            }
          }
          
          // NEW APPROACH: userId = emergencyEmail, so all events already match
          // Just map and sort
          const eventsArray = fallbackSnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data
            };
          });
          
          eventsArray.sort((a, b) => {
            const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return timeB - timeA; // Descending
          });
          
          console.log('[Events] ✅ Fallback query: Fetched', eventsArray.length, 'events where userId =', normalizedQueryEmail);
          console.log('[Events] ✅ Returning', eventsArray.length, 'sorted events to dashboard');
          
          // Return sorted events
          return res.json({ 
            success: true, 
            events: eventsArray.slice(0, 200), // Return up to 200 events
            accessibleUserCount: accessibleUserIds.length,
            queriedUserId: normalizedQueryEmail,
            note: 'Events sorted in memory (composite index recommended for better performance)'
          });
        } catch (fallbackError) {
          console.error('[Events] ❌ Fallback query also failed:', fallbackError);
          console.error('[Events] Fallback error code:', fallbackError.code);
          console.error('[Events] Fallback error message:', fallbackError.message);
          console.error('[Events] Fallback error stack:', fallbackError.stack);
          return res.status(500).json({ 
            success: false, 
            message: 'Failed to query events. Please create a composite index in Firestore.',
            error: queryError.message,
            fallbackError: fallbackError.message,
            indexHelp: 'Create index: collection "events", fields: userId (Ascending), timestamp (Descending)',
            indexUrl: queryError.message.includes('create it here') ? 
              queryError.message.match(/https:\/\/[^\s]+/)?.[0] : null
          });
        }
      }
      
      // Not an index error, throw it
      console.error('[Events] Non-index error, throwing:', queryError);
      throw queryError;
    }

    // NEW APPROACH: userId = emergencyEmail, so all events from query already match
    // No need for additional filtering since we query by userId = email
    let events = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data
      };
    });
    
    console.log('[Events] Fetched', events.length, 'events where userId =', normalizedQueryEmail);
    
    // NEW APPROACH: Since userId = emergencyEmail, no need for batch queries or filtering
    // We're only querying for one userId (the logged-in email)
    // Just sort the events by timestamp
    events.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA; // Descending
    });
    events = events.slice(0, 200); // Limit to 200 total events

    console.log('[Events] ========================================');
    console.log('[Events] Returning', events.length, 'events to dashboard');
    console.log('[Events] Queried userId (emergencyEmail):', normalizedQueryEmail);
    if (events.length > 0) {
      console.log('[Events] Event user IDs:', events.map(e => e.userId));
      console.log('[Events] First event:', {
        id: events[0].id,
        userId: events[0].userId,
        timestamp: events[0].timestamp,
        type: events[0].type
      });
    } else {
      console.log('[Events] ⚠️ No events to return!');
      console.log('[Events] Queried userId:', normalizedQueryEmail);
      console.log('[Events] Check backend logs above for diagnosis');
      console.log('[Events] Possible issues:');
      console.log('[Events]   1. Events have different userId (should be emergencyEmail)');
      console.log('[Events]   2. No events have been created yet');
      console.log('[Events]   3. Mobile app needs to use emergencyEmail as userId when creating events');
    }
    console.log('[Events] ========================================');
    
    res.json({ 
      success: true, 
      events,
      accessibleUserCount: accessibleUserIds.length,
      queriedUserId: normalizedQueryEmail // userId = emergencyEmail
    });
  } catch (err) {
    console.error('========================================');
    console.error('GET /api/events error');
    console.error('Error name:', err.name);
    console.error('Error message:', err.message);
    console.error('Error code:', err.code);
    console.error('Error stack:', err.stack);
    console.error('Full error object:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    console.error('========================================');
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch events',
      error: err.message || 'Unknown error',
      errorName: err.name,
      errorCode: err.code
    });
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
    
    // Require emergencyEmail for privacy - events must specify which contact to alert
    if (!emergencyEmail || !emergencyEmail.trim()) {
      console.error('[Backend] ❌ Event creation rejected: emergencyEmail is required for privacy');
      return res.status(400).json({ 
        success: false, 
        message: 'emergencyEmail is required. Events must specify which emergency contact to alert.' 
      });
    }

    const eventTimestamp = timestamp ?? new Date().toISOString();
    const coords =
      location?.lat != null && location?.lng != null
        ? { lat: Number(location.lat), lng: Number(location.lng) }
        : null;
    
    // Normalize emergencyEmail to lowercase for consistent querying
    const normalizedEmergencyEmail = emergencyEmail ? emergencyEmail.toLowerCase().trim() : null;

    // Update or create user profile if userName is provided
    if (userName && userName.trim()) {
      const userDoc = await firestore.collection('users').doc(userId).get();
      if (userDoc.exists) {
        // Update existing profile
        await firestore.collection('users').doc(userId).update({
          name: userName.trim(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        // Create new profile
        await firestore.collection('users').doc(userId).set({
          userId,
          name: userName.trim(),
          role: 'MOBILE_USER',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    const id = nanoid();
    
    const payload = {
      userId,
      userName: userName || null,
      emergencyEmail: normalizedEmergencyEmail, // Store normalized email
      type,
      timestamp: eventTimestamp,
      location: coords,
      status: 'OPEN',
      severity: severity || 'UNKNOWN',
      severityScore: severityScore || null,
      severityMetrics: severityMetrics || null
    };

    console.log('[Backend] ========================================');
    console.log('[Backend] Storing event with payload:', payload);
    console.log('[Backend] Event userId:', userId, '- This should match emergencyLinks userId');
    console.log('[Backend] Event userName:', userName || 'not provided');
    console.log('[Backend] Event emergencyEmail:', normalizedEmergencyEmail || 'ERROR: not provided');
    console.log('[Backend] ⚠️ Privacy: This event will ONLY be visible to emergency contact:', normalizedEmergencyEmail);
    console.log('[Backend] ========================================');

    await firestore.collection('events').doc(id).set(payload);
    console.log('[Backend] ✅ Event stored successfully in Firestore!');
    console.log('[Backend] Event ID:', id);
    console.log('[Backend] Event document path: events/' + id);
    
    // Verify the event was stored
    const verifyDoc = await firestore.collection('events').doc(id).get();
    if (verifyDoc.exists) {
      const storedData = verifyDoc.data();
      console.log('[Backend] ✅ Verification: Event exists in Firestore');
      console.log('[Backend] Stored userId:', storedData.userId);
      console.log('[Backend] Stored timestamp:', storedData.timestamp);
    } else {
      console.error('[Backend] ❌ ERROR: Event was not stored!');
    }

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


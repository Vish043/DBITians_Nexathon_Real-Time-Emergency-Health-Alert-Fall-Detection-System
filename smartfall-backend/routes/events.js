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
    console.log('========================================');
    console.log('[Events] GET request from:', emergencyContactEmail);
    console.log('[Events] User UID:', req.user.uid);
    console.log('========================================');

    // Get all user IDs that this emergency contact has access to
    const accessibleUserIds = await getAccessibleUserIds(emergencyContactEmail);
    console.log('[Events] Accessible user IDs:', accessibleUserIds);
    console.log('[Events] Number of accessible users:', accessibleUserIds.length);

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

    // Firestore 'in' query requires at least 1 item and max 10 items
    const userIdsToQuery = accessibleUserIds.length > 10 ? accessibleUserIds.slice(0, 10) : accessibleUserIds;
    const normalizedQueryEmail = emergencyContactEmail.toLowerCase().trim();
    console.log('[Events] Querying events for user IDs:', userIdsToQuery);
    console.log('[Events] Expected userId format: "demo-user-1" (or whatever was used when linking)');
    console.log('[Events] Filtering by emergency contact email:', normalizedQueryEmail);
    console.log('[Events] Privacy: Only showing events where emergencyEmail matches this contact');

    // Fetch events only for accessible users AND only for events where this emergency contact was alerted
    // This ensures privacy: each emergency contact only sees events where they were specifically alerted
    // Note: Firestore requires a composite index when using where + orderBy on different fields
    // If you get an index error, create the index in Firestore Console
    let snapshot;
    try {
      // Try with orderBy first - filter by both userId AND emergencyEmail
      snapshot = await firestore
        .collection('events')
        .where('userId', 'in', userIdsToQuery)
        .where('emergencyEmail', '==', emergencyContactEmail.toLowerCase().trim())
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
        console.log('[Events] Querying for userIds:', userIdsToQuery);
        try {
          // Query without orderBy, then sort in memory - filter by both userId AND emergencyEmail
          const fallbackSnapshot = await firestore
            .collection('events')
            .where('userId', 'in', userIdsToQuery)
            .where('emergencyEmail', '==', emergencyContactEmail.toLowerCase().trim())
            .limit(200) // Increased limit to store more past events
            .get();
          
          console.log('[Events] ✅ Fallback query successful! Got', fallbackSnapshot.docs.length, 'events');
          
          if (fallbackSnapshot.docs.length === 0) {
            console.log('[Events] ⚠️ No events found for userIds:', userIdsToQuery);
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
              console.log('[Events] Expected userIds to match:', userIdsToQuery);
              console.log('[Events] Checking if userIds match...');
              const matchingEvents = allEventsSnapshot.docs.filter(doc => {
                const data = doc.data();
                const matches = userIdsToQuery.includes(data.userId);
                if (!matches) {
                  console.log(`[Events]   ❌ Mismatch: Event userId="${data.userId}" not in query list`);
                }
                return matches;
              });
              console.log('[Events] Matching events found:', matchingEvents.length);
              if (matchingEvents.length === 0) {
                console.log('[Events] ⚠️ ISSUE: Events exist but userIds don\'t match!');
                console.log('[Events] SOLUTION: Make sure mobile app uses userId="demo-user-1" when creating events');
                console.log('[Events] SOLUTION: Make sure emergency link uses same userId="demo-user-1"');
              }
            } else {
              console.log('[Events] ⚠️ No events exist in Firestore at all. User needs to trigger a fall from mobile app.');
            }
          }
          
          // Sort in memory
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
          
          console.log('[Events] ✅ Returning', eventsArray.length, 'sorted events to dashboard');
          
          // Return sorted events
          return res.json({ 
            success: true, 
            events: eventsArray.slice(0, 200), // Return up to 200 events
            accessibleUserCount: accessibleUserIds.length,
            queriedUserIds: userIdsToQuery,
            queriedUserId: userIdsToQuery[0], // Add first userId for easier debugging
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

    // If more than 10 users, we need to do multiple queries (Firestore 'in' limit is 10)
    // Filter events to ensure privacy: only show events where emergencyEmail matches
    let events = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data
        };
      })
      .filter((event) => {
        // Only include events where emergencyEmail matches the logged-in contact
        // Exclude events with null/missing emergencyEmail for privacy
        const eventEmail = event.emergencyEmail?.toLowerCase().trim();
        const matches = eventEmail === normalizedQueryEmail;
        if (!matches && eventEmail) {
          console.log(`[Events] Filtered out event ${event.id}: emergencyEmail="${event.emergencyEmail}" doesn't match "${normalizedQueryEmail}"`);
        }
        return matches;
      });
    
    console.log('[Events] Fetched', snapshot.docs.length, 'events from query, filtered to', events.length, 'events matching emergencyEmail');

    // Initialize remainingBatches outside the if block to avoid scope issues
    let remainingBatches = [];
    
    if (accessibleUserIds.length > 10) {
      // Fetch remaining users in batches
      for (let i = 10; i < accessibleUserIds.length; i += 10) {
        const batch = accessibleUserIds.slice(i, i + 10);
        try {
          // Filter by both userId AND emergencyEmail for privacy
          const batchSnapshot = await firestore
            .collection('events')
            .where('userId', 'in', batch)
            .where('emergencyEmail', '==', emergencyContactEmail.toLowerCase().trim())
            .orderBy('timestamp', 'desc')
            .limit(200) // Increased limit for past events
            .get();
          
            // Filter batch events by emergencyEmail for privacy
            const batchEvents = batchSnapshot.docs
              .map((doc) => ({
                id: doc.id,
                ...doc.data()
              }))
              .filter((event) => {
                const eventEmail = event.emergencyEmail?.toLowerCase().trim();
                return eventEmail === normalizedQueryEmail;
              });
            remainingBatches.push(...batchEvents);
        } catch (batchError) {
          console.error('[Events] Error in batch query:', batchError);
          // Try without orderBy for this batch
          try {
            // Filter by both userId AND emergencyEmail for privacy
            const batchSnapshot = await firestore
              .collection('events')
              .where('userId', 'in', batch)
              .where('emergencyEmail', '==', emergencyContactEmail.toLowerCase().trim())
              .limit(200) // Increased limit for past events
              .get();
            
            // Filter batch events by emergencyEmail for privacy
            const batchEvents = batchSnapshot.docs
              .map((doc) => ({
                id: doc.id,
                ...doc.data()
              }))
              .filter((event) => {
                const eventEmail = event.emergencyEmail?.toLowerCase().trim();
                return eventEmail === normalizedQueryEmail;
              });
            remainingBatches.push(...batchEvents);
          } catch (fallbackBatchError) {
            console.error('[Events] Fallback batch query also failed:', fallbackBatchError);
            // Continue with what we have
          }
        }
      }
      
      events = [...events, ...remainingBatches];
      // Sort by timestamp descending
      events.sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA; // Descending
      });
      events = events.slice(0, 200); // Limit to 200 total events
    }

    console.log('[Events] ========================================');
    console.log('[Events] Returning', events.length, 'events to dashboard');
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
      console.log('[Events] Accessible user IDs:', accessibleUserIds);
      console.log('[Events] Queried user IDs:', userIdsToQuery);
      console.log('[Events] Check backend logs above for diagnosis');
    }
    console.log('[Events] ========================================');
    
      console.log('[Events] ========================================');
      console.log('[Events] Returning', events.length, 'events to dashboard');
      if (events.length === 0) {
        console.log('[Events] ⚠️ No events found!');
        console.log('[Events] Queried userIds:', userIdsToQuery);
        console.log('[Events] Check backend logs above for diagnosis');
        console.log('[Events] Possible issues:');
        console.log('[Events]   1. Events have different userId than link');
        console.log('[Events]   2. No events have been created yet');
        console.log('[Events]   3. Events were created before link was established');
      } else {
        console.log('[Events] ✅ Found events for userIds:', userIdsToQuery);
        console.log('[Events] Event userIds:', events.map(e => e.userId));
      }
      console.log('[Events] ========================================');
      
      res.json({ 
        success: true, 
        events,
        accessibleUserCount: accessibleUserIds.length,
        queriedUserIds: userIdsToQuery,
        queriedUserId: userIdsToQuery[0] // Add first userId for easier debugging
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

    const eventTimestamp = timestamp ?? new Date().toISOString();
    const coords =
      location?.lat != null && location?.lng != null
        ? { lat: Number(location.lat), lng: Number(location.lng) }
        : null;

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
    // Normalize emergencyEmail to lowercase for consistent querying
    const normalizedEmergencyEmail = emergencyEmail ? emergencyEmail.toLowerCase().trim() : null;
    
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
    console.log('[Backend] Event emergencyEmail:', emergencyEmail || 'not provided');
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


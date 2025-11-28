import { Router } from 'express';
import { firestore, admin } from '../firebase.js';

const router = Router();

/**
 * GET /api/migrate-events?oldUserId=Abhishek
 * Migrate events from userName-based userId to demo-user-1
 * Query params: oldUserId (optional, defaults to migrating all non-"demo-user-1")
 */
router.get('/', async (req, res) => {
  try {
    const { oldUserId } = req.query;
    const newUserId = 'demo-user-1';
    
    console.log('[MigrateEvents] Starting migration...');
    console.log('[MigrateEvents] Target userId:', newUserId);
    
    // Get all events
    const allEventsSnapshot = await firestore
      .collection('events')
      .get();
    
    console.log('[MigrateEvents] Total events in Firestore:', allEventsSnapshot.docs.length);
    
    const updates = [];
    const migrated = [];
    
    for (const doc of allEventsSnapshot.docs) {
      const data = doc.data();
      const currentUserId = data.userId;
      
      // If oldUserId is specified, only migrate those
      // Otherwise, migrate any userId that's not "demo-user-1"
      if (oldUserId) {
        if (currentUserId === oldUserId && currentUserId !== newUserId) {
          console.log(`[MigrateEvents] Migrating event ${doc.id}: "${currentUserId}" → "${newUserId}"`);
          updates.push(
            doc.ref.update({
              userId: newUserId,
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            })
          );
          migrated.push({ id: doc.id, oldUserId: currentUserId, newUserId });
        }
      } else {
        // Migrate any userId that's not the target
        if (currentUserId !== newUserId) {
          console.log(`[MigrateEvents] Migrating event ${doc.id}: "${currentUserId}" → "${newUserId}"`);
          updates.push(
            doc.ref.update({
              userId: newUserId,
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            })
          );
          migrated.push({ id: doc.id, oldUserId: currentUserId, newUserId });
        }
      }
    }
    
    if (updates.length > 0) {
      await Promise.all(updates);
      console.log('[MigrateEvents] ✅ Migrated', updates.length, 'events');
    } else {
      console.log('[MigrateEvents] No events need migration');
    }
    
    res.json({
      success: true,
      message: `Migrated ${updates.length} events to userId: ${newUserId}`,
      migrated: migrated,
      totalEvents: allEventsSnapshot.docs.length,
      migratedCount: updates.length
    });
  } catch (error) {
    console.error('[MigrateEvents] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to migrate events',
      error: error.message
    });
  }
});

export default router;


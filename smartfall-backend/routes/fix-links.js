import { Router } from 'express';
import { firestore, admin } from '../firebase.js';

const router = Router();

/**
 * GET /api/fix-links
 * Utility endpoint to normalize all emergency link emails to lowercase
 * This fixes case-sensitivity issues with existing links
 */
router.get('/', async (req, res) => {
  try {
    console.log('[FixLinks] Starting to normalize email addresses in emergencyLinks...');
    
    const linksSnapshot = await firestore
      .collection('emergencyLinks')
      .get();
    
    console.log('[FixLinks] Found', linksSnapshot.docs.length, 'total links');
    
    const updates = [];
    for (const doc of linksSnapshot.docs) {
      const data = doc.data();
      const currentEmail = data.emergencyContactEmail;
      const normalizedEmail = currentEmail?.toLowerCase().trim();
      
      if (currentEmail !== normalizedEmail) {
        console.log('[FixLinks] Updating link:', doc.id, 'from', currentEmail, 'to', normalizedEmail);
        updates.push(
          doc.ref.update({
            emergencyContactEmail: normalizedEmail,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          })
        );
      }
    }
    
    if (updates.length > 0) {
      await Promise.all(updates);
      console.log('[FixLinks] Updated', updates.length, 'links');
    } else {
      console.log('[FixLinks] All links already normalized');
    }
    
    res.json({
      success: true,
      message: `Normalized ${updates.length} emergency link emails`,
      totalLinks: linksSnapshot.docs.length,
      updatedLinks: updates.length
    });
  } catch (error) {
    console.error('[FixLinks] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fix links',
      error: error.message
    });
  }
});

export default router;


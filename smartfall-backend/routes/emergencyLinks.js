import { Router } from 'express';
import { nanoid } from 'nanoid';
import { firestore, admin } from '../firebase.js';

const router = Router();

/**
 * POST /api/emergency-links
 * Link an emergency contact to a user (called from mobile app)
 * Body: { userId, emergencyContactEmail }
 */
router.post('/', async (req, res) => {
  try {
    // Check if Firebase is initialized
    if (!firestore) {
      console.error('[EmergencyLinks] Firestore is not initialized!');
      return res.status(500).json({
        success: false,
        message: 'Database not initialized. Please check server configuration.',
        error: 'Firestore instance is null'
      });
    }

    const { userId, emergencyContactEmail } = req.body;

    console.log('[EmergencyLinks] POST request:', { userId, emergencyContactEmail });

    if (!userId || !emergencyContactEmail) {
      console.log('[EmergencyLinks] Missing required fields');
      return res.status(400).json({ 
        success: false, 
        message: 'userId and emergencyContactEmail are required' 
      });
    }

    // Trim and normalize email to lowercase for consistent storage and matching
    const trimmedEmail = emergencyContactEmail.trim();
    const normalizedEmail = trimmedEmail.toLowerCase().trim();
    console.log('[EmergencyLinks] Normalized email:', normalizedEmail, 'from:', trimmedEmail);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      console.log('[EmergencyLinks] Invalid email format:', trimmedEmail);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email format' 
      });
    }

    // Verify that the emergency contact email exists in the system
    try {
      const userRecord = await admin.auth().getUserByEmail(trimmedEmail);
      console.log('[EmergencyLinks] Found user in Firebase Auth:', userRecord.uid, userRecord.email);
      
      const userDoc = await firestore.collection('users').doc(userRecord.uid).get();
      
      if (!userDoc.exists) {
        // User exists in Auth but not in Firestore - create the document
        console.log('[EmergencyLinks] User document not found in Firestore, creating it...');
        await firestore.collection('users').doc(userRecord.uid).set({
          email: userRecord.email || trimmedEmail,
          name: userRecord.displayName || null,
          role: 'EMERGENCY_CONTACT',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('[EmergencyLinks] User document created in Firestore');
      } else {
        const userData = userDoc.data();
        console.log('[EmergencyLinks] User data:', { role: userData?.role, email: userData?.email });

        // If role is missing or incorrect, update it
        if (userData?.role !== 'EMERGENCY_CONTACT') {
          console.log('[EmergencyLinks] User role is not EMERGENCY_CONTACT, updating to EMERGENCY_CONTACT');
          await firestore.collection('users').doc(userRecord.uid).update({
            role: 'EMERGENCY_CONTACT',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log('[EmergencyLinks] User role updated to EMERGENCY_CONTACT');
        }
      }
    } catch (error) {
      console.error('[EmergencyLinks] Error verifying email:', error);
      console.error('[EmergencyLinks] Error code:', error.code);
      console.error('[EmergencyLinks] Error message:', error.message);
      if (error.code === 'auth/user-not-found') {
        return res.status(404).json({ 
          success: false, 
          message: 'No account found with this email. Please ask them to sign up on the dashboard first.' 
        });
      }
      // Log other errors but don't throw - return a user-friendly error
      return res.status(500).json({
        success: false,
        message: 'Failed to verify emergency contact email. Please try again later.',
        error: error.message
      });
    }

    // Check if link already exists (use normalized email)
    const existingLink = await firestore
      .collection('emergencyLinks')
      .where('userId', '==', userId)
      .where('emergencyContactEmail', '==', normalizedEmail)
      .limit(1)
      .get();

    if (!existingLink.empty) {
      const existingDoc = existingLink.docs[0];
      const existingData = existingDoc.data();
      
      if (existingData.status === 'ACTIVE') {
        return res.status(400).json({ 
          success: false, 
          message: 'This emergency contact is already linked' 
        });
      } else {
        // Reactivate the link
        await existingDoc.ref.update({
          status: 'ACTIVE',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return res.json({
          success: true,
          message: 'Emergency contact reactivated',
          linkId: existingDoc.id
        });
      }
    }

    // Create new link - use normalized email (already defined above)
    const linkId = nanoid();
    await firestore.collection('emergencyLinks').doc(linkId).set({
      userId,
      emergencyContactEmail: normalizedEmail, // Store in lowercase for consistent matching
      status: 'ACTIVE',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('[EmergencyLinks] Link created successfully:', linkId, 'with email:', normalizedEmail);

    res.status(201).json({
      success: true,
      message: 'Emergency contact linked successfully',
      linkId
    });
  } catch (error) {
    console.error('========================================');
    console.error('[EmergencyLinks] POST error');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    console.error('========================================');
    
    const statusCode = error.code === 'auth/user-not-found' ? 404 : 500;
    const errorMessage = error.code === 'auth/user-not-found' 
      ? 'No account found with this email. Please ask them to sign up on the dashboard first.'
      : error.message || 'Failed to link emergency contact';
    
    res.status(statusCode).json({ 
      success: false, 
      message: errorMessage,
      error: error.message
    });
  }
});

/**
 * GET /api/emergency-links
 * Get all emergency links for a user (from mobile app)
 * Query param: ?userId=user-id
 */
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'userId query parameter is required' 
      });
    }

    const linksSnapshot = await firestore
      .collection('emergencyLinks')
      .where('userId', '==', userId)
      .where('status', '==', 'ACTIVE')
      .get();

    const links = linksSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      links
    });
  } catch (error) {
    console.error('GET /api/emergency-links error', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch emergency links' 
    });
  }
});

/**
 * DELETE /api/emergency-links/:id
 * Remove an emergency contact link
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Link ID is required' 
      });
    }

    const linkDoc = await firestore.collection('emergencyLinks').doc(id).get();

    if (!linkDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        message: 'Link not found' 
      });
    }

    // Soft delete by setting status to INACTIVE
    await linkDoc.ref.update({
      status: 'INACTIVE',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({
      success: true,
      message: 'Emergency contact link removed'
    });
  } catch (error) {
    console.error('DELETE /api/emergency-links/:id error', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to remove emergency link' 
    });
  }
});

export default router;


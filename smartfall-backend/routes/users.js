import { Router } from 'express';
import { firestore, admin } from '../firebase.js';

const router = Router();

/**
 * POST /api/users/profile
 * Create or update mobile app user profile
 * Body: { userId, userName }
 */
router.post('/profile', async (req, res) => {
  try {
    const { userId, userName } = req.body;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'userId is required' 
      });
    }

    if (!userName || !userName.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'userName is required' 
      });
    }

    const trimmedName = userName.trim();

    // Check if user profile already exists
    const userDoc = await firestore.collection('users').doc(userId).get();

    if (userDoc.exists) {
      // Update existing profile
      await firestore.collection('users').doc(userId).update({
        name: trimmedName,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.json({
        success: true,
        message: 'User profile updated successfully',
        user: {
          userId,
          userName: trimmedName
        }
      });
    } else {
      // Create new profile
      await firestore.collection('users').doc(userId).set({
        userId,
        name: trimmedName,
        role: 'MOBILE_USER',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.status(201).json({
        success: true,
        message: 'User profile created successfully',
        user: {
          userId,
          userName: trimmedName
        }
      });
    }
  } catch (error) {
    console.error('POST /api/users/profile error', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save user profile' 
    });
  }
});

/**
 * GET /api/users/profile/:userId
 * Get user profile by userId
 */
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'userId is required' 
      });
    }

    const userDoc = await firestore.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        message: 'User profile not found' 
      });
    }

    const userData = userDoc.data();

    res.json({
      success: true,
      user: {
        userId,
        userName: userData.name || null,
        role: userData.role || 'MOBILE_USER',
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt
      }
    });
  } catch (error) {
    console.error('GET /api/users/profile/:userId error', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch user profile' 
    });
  }
});

export default router;


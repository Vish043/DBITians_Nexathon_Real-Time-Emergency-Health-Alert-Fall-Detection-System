import { Router } from 'express';
import { admin, firestore } from '../firebase.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/auth/signup
 * Create a new emergency contact account
 * Body: { email, password, name }
 */
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email format' 
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters' 
      });
    }

    // Check if user already exists
    try {
      const existingUser = await admin.auth().getUserByEmail(email);
      return res.status(400).json({ 
        success: false, 
        message: 'An account with this email already exists' 
      });
    } catch (error) {
      // User doesn't exist, which is what we want
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    // Create Firebase Auth user
    const userRecord = await admin.auth().createUser({
      email,
      password,
      emailVerified: false,
      displayName: name || null
    });

    // Store user profile in Firestore
    await firestore.collection('users').doc(userRecord.uid).set({
      email,
      name: name || null,
      role: 'EMERGENCY_CONTACT',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Generate custom token for immediate login
    const customToken = await admin.auth().createCustomToken(userRecord.uid);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        name: name || null
      },
      customToken // Client can use this to sign in immediately
    });
  } catch (error) {
    console.error('POST /api/auth/signup error', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to create account' 
    });
  }
});

/**
 * POST /api/auth/login
 * Login and get ID token
 * Body: { email, password }
 * Note: Client should use Firebase Auth SDK to sign in, then send ID token
 * This endpoint is for verification/validation
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    // Note: Firebase Admin SDK doesn't support password verification
    // The client should use Firebase Auth SDK to sign in
    // This endpoint just verifies the user exists and returns user info
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      
      // Get user profile from Firestore
      const userDoc = await firestore.collection('users').doc(userRecord.uid).get();
      const userData = userDoc.data();

      res.json({
        success: true,
        message: 'User found. Please use Firebase Auth SDK to sign in.',
        user: {
          uid: userRecord.uid,
          email: userRecord.email,
          name: userData?.name || null,
          role: userData?.role || 'EMERGENCY_CONTACT'
        }
      });
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        return res.status(404).json({ 
          success: false, 
          message: 'No account found with this email' 
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('POST /api/auth/login error', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to verify user' 
    });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user info
 * Requires: Authorization header with Bearer token
 */
router.get('/me', verifyToken, async (req, res) => {
  try {
    const userDoc = await firestore.collection('users').doc(req.user.uid).get();
    
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
        uid: req.user.uid,
        email: req.user.email,
        name: userData?.name || null,
        role: userData?.role || 'EMERGENCY_CONTACT',
        emailVerified: req.user.emailVerified
      }
    });
  } catch (error) {
    console.error('GET /api/auth/me error', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch user info' 
    });
  }
});

/**
 * GET /api/auth/verify-email
 * Check if an email exists in the system (for mobile app to verify before linking)
 * Query param: ?email=user@example.com
 */
router.get('/verify-email', async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email parameter is required' 
      });
    }

    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      const userDoc = await firestore.collection('users').doc(userRecord.uid).get();
      const userData = userDoc.data();

      res.json({
        success: true,
        exists: true,
        email: userRecord.email,
        name: userData?.name || null,
        role: userData?.role || 'EMERGENCY_CONTACT'
      });
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        return res.json({
          success: true,
          exists: false,
          message: 'No account found with this email. Please ask them to sign up first.'
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('GET /api/auth/verify-email error', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to verify email' 
    });
  }
});

export default router;


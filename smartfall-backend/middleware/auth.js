import { admin, firestore } from '../firebase.js';

/**
 * Middleware to verify Firebase ID token
 * Extracts user info and attaches to req.user
 */
export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'No authorization token provided' 
      });
    }

    const token = authHeader.split('Bearer ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid authorization token format' 
      });
    }

    // Verify the token with Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Attach user info to request - normalize email to lowercase
    const userEmail = decodedToken.email?.toLowerCase().trim();
    req.user = {
      uid: decodedToken.uid,
      email: userEmail,
      emailVerified: decodedToken.email_verified
    };
    
    console.log('[Auth] User authenticated:', userEmail);

    next();
  } catch (error) {
    console.error('[Auth] Token verification failed:', error.message);
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
};

/**
 * Get all user IDs that the authenticated user has access to
 * (users who have linked this emergency contact)
 */
export const getAccessibleUserIds = async (emergencyContactEmail) => {
  try {
    // Normalize email to lowercase for comparison
    const normalizedEmail = emergencyContactEmail?.toLowerCase().trim();
    console.log('[Auth] Getting accessible user IDs for:', normalizedEmail);
    
    // Query with normalized email
    const linksSnapshot = await firestore
      .collection('emergencyLinks')
      .where('emergencyContactEmail', '==', normalizedEmail)
      .where('status', '==', 'ACTIVE')
      .get();

    console.log('[Auth] Found', linksSnapshot.docs.length, 'active links for:', normalizedEmail);
    
    // If no links found with normalized email, try case-insensitive search
    if (linksSnapshot.docs.length === 0) {
      console.log('[Auth] No links found with exact match, trying case-insensitive search...');
      // Get all active links and filter in memory (for case-insensitive matching)
      const allLinksSnapshot = await firestore
        .collection('emergencyLinks')
        .where('status', '==', 'ACTIVE')
        .get();
      
      console.log('[Auth] Total active links in database:', allLinksSnapshot.docs.length);
      
      const matchingLinks = allLinksSnapshot.docs.filter(doc => {
        const data = doc.data();
        const linkEmail = data.emergencyContactEmail?.toLowerCase().trim();
        const matches = linkEmail === normalizedEmail;
        if (!matches) {
          console.log('[Auth] Email mismatch:', { 
            queryEmail: normalizedEmail, 
            linkEmail: linkEmail,
            originalLinkEmail: data.emergencyContactEmail,
            queryEmailLength: normalizedEmail?.length,
            linkEmailLength: linkEmail?.length,
            exactMatch: linkEmail === normalizedEmail
          });
        } else {
          console.log('[Auth] ✅ Found matching link:', {
            linkId: doc.id,
            userId: data.userId,
            email: data.emergencyContactEmail,
            status: data.status
          });
        }
        return matches;
      });
      
      console.log('[Auth] Found', matchingLinks.length, 'matching links after case-insensitive search');
      
      if (matchingLinks.length === 0 && allLinksSnapshot.docs.length > 0) {
        console.log('[Auth] ⚠️ No matches found. Sample links in database:');
        allLinksSnapshot.docs.slice(0, 3).forEach((doc, idx) => {
          const data = doc.data();
          const linkEmail = data.emergencyContactEmail?.toLowerCase().trim();
          console.log(`[Auth]   Link ${idx + 1}: "${data.emergencyContactEmail}" (normalized: "${linkEmail}")`);
          console.log(`[Auth]   Query: "${normalizedEmail}"`);
          console.log(`[Auth]   Match: ${linkEmail === normalizedEmail}`);
        });
      }
      
      const userIds = matchingLinks.map(doc => {
        const data = doc.data();
        console.log('[Auth] Matching link:', { userId: data.userId, email: data.emergencyContactEmail });
        return data.userId;
      }).filter(Boolean);
      
      console.log('[Auth] Accessible user IDs:', userIds);
      return userIds;
    }
    
    const userIds = linksSnapshot.docs.map(doc => {
      const data = doc.data();
      console.log('[Auth] Link data:', { userId: data.userId, email: data.emergencyContactEmail });
      return data.userId;
    }).filter(Boolean); // Filter out any null/undefined values
    
    console.log('[Auth] Accessible user IDs:', userIds);
    return userIds;
  } catch (error) {
    console.error('[Auth] Error getting accessible user IDs:', error);
    console.error('[Auth] Error stack:', error.stack);
    return [];
  }
};


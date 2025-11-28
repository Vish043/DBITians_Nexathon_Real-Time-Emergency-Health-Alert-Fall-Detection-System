import admin from 'firebase-admin';
import dotenv from 'dotenv';

// Ensure dotenv is loaded before accessing process.env
dotenv.config();

const {
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY = '',
  FIREBASE_DATABASE_URL
} = process.env;

if (!admin.apps.length) {
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    console.warn('[SmartFall] Firebase credentials missing. Firestore calls will fail.');
    console.warn('[SmartFall] Please check your .env file has:');
    console.warn('  - FIREBASE_PROJECT_ID');
    console.warn('  - FIREBASE_CLIENT_EMAIL');
    console.warn('  - FIREBASE_PRIVATE_KEY');
    console.warn('  - FIREBASE_DATABASE_URL');
  } else {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: FIREBASE_PROJECT_ID,
          clientEmail: FIREBASE_CLIENT_EMAIL,
          privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        }),
        databaseURL: FIREBASE_DATABASE_URL
      });
      console.log('[SmartFall] Firebase Admin initialized successfully');
    } catch (error) {
      console.error('[SmartFall] Failed to initialize Firebase Admin:', error.message);
      throw error;
    }
  }
}

// Export firestore - will throw error if Firebase not initialized
let firestoreInstance = null;
try {
  firestoreInstance = admin.firestore();
} catch (error) {
  console.error('[SmartFall] Cannot access Firestore - Firebase not initialized:', error.message);
}

export const firestore = firestoreInstance;

// Export admin for auth middleware
export { admin };


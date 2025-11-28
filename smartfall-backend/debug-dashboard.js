import dotenv from 'dotenv';
dotenv.config();

import { firestore, admin } from './firebase.js';

/**
 * Debug script to check why dashboard isn't showing events
 * Run: node debug-dashboard.js <emergency-contact-email>
 */

async function debugDashboard(emergencyEmail) {
  try {
    console.log('========================================');
    console.log('Dashboard Debug Script');
    console.log('========================================');
    console.log('Emergency Contact Email:', emergencyEmail);
    console.log('');

    // Normalize email
    const normalizedEmail = emergencyEmail?.toLowerCase().trim();
    console.log('Normalized Email:', normalizedEmail);
    console.log('');

    // 1. Check if user exists in Firebase Auth
    console.log('1. Checking Firebase Auth...');
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(emergencyEmail);
      console.log('   ✅ User found in Firebase Auth');
      console.log('   UID:', userRecord.uid);
      console.log('   Email:', userRecord.email);
    } catch (error) {
      console.log('   ❌ User NOT found in Firebase Auth');
      console.log('   Error:', error.message);
      return;
    }
    console.log('');

    // 2. Check Firestore user document
    console.log('2. Checking Firestore user document...');
    const userDoc = await firestore.collection('users').doc(userRecord.uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      console.log('   ✅ User document exists');
      console.log('   Role:', userData.role);
      console.log('   Email:', userData.email);
    } else {
      console.log('   ❌ User document NOT found in Firestore');
    }
    console.log('');

    // 3. Check emergency links
    console.log('3. Checking emergency links...');
    const linksSnapshot = await firestore
      .collection('emergencyLinks')
      .where('emergencyContactEmail', '==', normalizedEmail)
      .where('status', '==', 'ACTIVE')
      .get();
    
    console.log('   Found', linksSnapshot.docs.length, 'active links');
    
    if (linksSnapshot.docs.length === 0) {
      console.log('   ⚠️ No active links found with normalized email');
      console.log('   Trying case-insensitive search...');
      const allLinksSnapshot = await firestore
        .collection('emergencyLinks')
        .where('status', '==', 'ACTIVE')
        .get();
      
      console.log('   Total active links in database:', allLinksSnapshot.docs.length);
      const matchingLinks = allLinksSnapshot.docs.filter(doc => {
        const data = doc.data();
        const linkEmail = data.emergencyContactEmail?.toLowerCase().trim();
        return linkEmail === normalizedEmail;
      });
      
      console.log('   Matching links (case-insensitive):', matchingLinks.length);
      matchingLinks.forEach((doc, idx) => {
        const data = doc.data();
        console.log(`   Link ${idx + 1}: userId="${data.userId}", email="${data.emergencyContactEmail}"`);
      });
    } else {
      linksSnapshot.docs.forEach((doc, idx) => {
        const data = doc.data();
        console.log(`   Link ${idx + 1}: userId="${data.userId}", email="${data.emergencyContactEmail}"`);
      });
    }
    console.log('');

    // 4. Get accessible user IDs
    const accessibleUserIds = linksSnapshot.docs.map(doc => doc.data().userId).filter(Boolean);
    if (linksSnapshot.docs.length === 0) {
      // Try case-insensitive
      const allLinksSnapshot = await firestore
        .collection('emergencyLinks')
        .where('status', '==', 'ACTIVE')
        .get();
      const matchingLinks = allLinksSnapshot.docs.filter(doc => {
        const data = doc.data();
        const linkEmail = data.emergencyContactEmail?.toLowerCase().trim();
        return linkEmail === normalizedEmail;
      });
      accessibleUserIds.push(...matchingLinks.map(doc => doc.data().userId).filter(Boolean));
    }
    
    console.log('4. Accessible User IDs:', accessibleUserIds);
    console.log('');

    if (accessibleUserIds.length === 0) {
      console.log('❌ No accessible user IDs found!');
      console.log('   → User needs to link this emergency contact from mobile app');
      return;
    }

    // 5. Check events
    console.log('5. Checking events for accessible users...');
    const eventsSnapshot = await firestore
      .collection('events')
      .where('userId', 'in', accessibleUserIds.slice(0, 10)) // Firestore limit
      .limit(10)
      .get();
    
    console.log('   Found', eventsSnapshot.docs.length, 'events');
    
    if (eventsSnapshot.docs.length === 0) {
      console.log('   ⚠️ No events found for these user IDs');
      console.log('   Checking all events in Firestore...');
      const allEventsSnapshot = await firestore
        .collection('events')
        .limit(10)
        .get();
      
      console.log('   Total events in Firestore:', allEventsSnapshot.docs.length);
      if (allEventsSnapshot.docs.length > 0) {
        console.log('   Sample events:');
        allEventsSnapshot.docs.forEach((doc, idx) => {
          const data = doc.data();
          console.log(`   Event ${idx + 1}: userId="${data.userId}", timestamp="${data.timestamp}"`);
        });
        console.log('   Expected userIds:', accessibleUserIds);
        console.log('   → Mismatch: Events have different userIds than linked users');
      } else {
        console.log('   → No events exist yet. User needs to trigger a fall from mobile app.');
      }
    } else {
      console.log('   ✅ Events found:');
      eventsSnapshot.docs.forEach((doc, idx) => {
        const data = doc.data();
        console.log(`   Event ${idx + 1}: userId="${data.userId}", type="${data.type}", timestamp="${data.timestamp}"`);
      });
    }
    console.log('');

    console.log('========================================');
    console.log('Summary:');
    console.log('========================================');
    if (accessibleUserIds.length === 0) {
      console.log('❌ ISSUE: No emergency links found');
      console.log('   SOLUTION: User needs to link this email from mobile app');
    } else if (eventsSnapshot.docs.length === 0) {
      console.log('⚠️ ISSUE: No events found for linked users');
      console.log('   SOLUTION: User needs to trigger a fall from mobile app');
    } else {
      console.log('✅ Everything looks good! Events should appear in dashboard');
    }

  } catch (error) {
    console.error('Error:', error);
    console.error('Stack:', error.stack);
  }
}

// Get email from command line argument
const email = process.argv[2];
if (!email) {
  console.error('Usage: node debug-dashboard.js <emergency-contact-email>');
  console.error('Example: node debug-dashboard.js caregiver@example.com');
  process.exit(1);
}

debugDashboard(email).then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});


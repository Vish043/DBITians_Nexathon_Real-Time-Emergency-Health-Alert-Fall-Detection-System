# SmartFall Authentication & Access Control Setup Guide

## Overview

This guide explains how to set up the secure account linking and access control system for SmartFall.

## Architecture

1. **Emergency Contacts** sign up on the web dashboard using Firebase Authentication
2. **Mobile App Users** link emergency contacts by email (email must exist in system)
3. **Access Control** ensures emergency contacts only see events from users who linked them
4. **Firestore Collections**:
   - `users` - User profiles (emergency contacts)
   - `emergencyLinks` - Links between users and emergency contacts
   - `events` - Fall detection events (filtered by access)

## Setup Instructions

### 1. Firebase Configuration

#### Enable Firebase Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Authentication** > **Sign-in method**
4. Enable **Email/Password** provider
5. Save

#### Get Firebase Web Config

1. Go to **Project Settings** > **Your apps**
2. Click **Web** icon (</>) to add a web app
3. Register app (name it "SmartFall Dashboard")
4. Copy the Firebase config object

### 2. Backend Setup

The backend is already configured with Firebase Admin SDK. Ensure your `.env` has:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
```

### 3. Dashboard Setup

#### Install Firebase SDK

```bash
cd smartfall-dashboard
npm install firebase
```

#### Configure Environment Variables

Create `smartfall-dashboard/.env`:

```env
VITE_API_URL=http://localhost:4000
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

**Get these values from Firebase Console > Project Settings > Your apps > Web app config**

#### Update AuthContext

The `AuthContext.jsx` file is already set up to use these environment variables.

### 4. Mobile App Setup

No additional setup needed! The mobile app will:
- Verify emergency contact emails exist before linking
- Link emergency contacts via API
- Store user profile locally

## Workflow

### Step 1: Emergency Contact Signs Up

1. Open dashboard: `http://localhost:5173` (or your Vite dev server)
2. Click **Sign up**
3. Enter:
   - Name (optional)
   - Email
   - Password (min 6 characters)
4. Click **Sign Up**
5. Account is created in Firebase Auth and Firestore

### Step 2: Mobile User Links Emergency Contact

1. Open mobile app
2. Tap **⚙️ Settings** button
3. Enter:
   - Your Name
   - Emergency Contact Email (must match the email from Step 1)
4. Tap **Save & Link**
5. App verifies email exists
6. If valid, creates link in Firestore `emergencyLinks` collection

### Step 3: Emergency Contact Views Events

1. Emergency contact logs into dashboard
2. Dashboard fetches events via `GET /api/events` with auth token
3. Backend:
   - Verifies token
   - Finds all `userId`s linked to this emergency contact
   - Returns only events for those users
4. Dashboard displays filtered events

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Create emergency contact account
- `POST /api/auth/login` - Login (returns user info)
- `GET /api/auth/me` - Get current user (requires auth token)
- `GET /api/auth/verify-email?email=...` - Check if email exists

### Emergency Links

- `POST /api/emergency-links` - Link emergency contact (from mobile app)
  ```json
  {
    "userId": "demo-user-1",
    "emergencyContactEmail": "contact@example.com"
  }
  ```
- `GET /api/emergency-links?userId=...` - Get links for a user
- `DELETE /api/emergency-links/:id` - Remove a link

### Events (Protected)

- `GET /api/events` - Get events (requires auth token, returns only linked users' events)
- `POST /api/events` - Create event (no auth required, from mobile app)
- `PATCH /api/events/:id` - Update event status
- `DELETE /api/events/:id` - Delete event

## Security Features

1. **Token Verification**: All protected routes verify Firebase ID tokens
2. **Access Control**: Emergency contacts only see events from linked users
3. **Email Verification**: Mobile app verifies email exists before linking
4. **Role-Based**: Users have role `EMERGENCY_CONTACT` in Firestore

## Firestore Structure

### Collection: `users`

```javascript
{
  email: "contact@example.com",
  name: "John Doe",
  role: "EMERGENCY_CONTACT",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Collection: `emergencyLinks`

```javascript
{
  userId: "demo-user-1",
  emergencyContactEmail: "contact@example.com",
  status: "ACTIVE", // or "INACTIVE"
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Collection: `events`

```javascript
{
  userId: "demo-user-1",
  userName: "User Name",
  emergencyEmail: "contact@example.com",
  type: "FALL",
  timestamp: "2025-01-20T10:30:00Z",
  location: { lat: 19.07, lng: 72.87 },
  status: "OPEN",
  severity: { level: "HIGH", score: 7, metrics: {...} }
}
```

## Testing

### Test Signup Flow

1. Start backend: `cd smartfall-backend && npm run dev`
2. Start dashboard: `cd smartfall-dashboard && npm run dev`
3. Open dashboard, sign up with test email
4. Verify account created in Firebase Console

### Test Linking Flow

1. Ensure emergency contact account exists (from signup)
2. Open mobile app
3. Go to settings, enter emergency contact email
4. Save - should verify and link successfully
5. Check Firestore `emergencyLinks` collection

### Test Access Control

1. Emergency contact logs into dashboard
2. Should see events only from linked users
3. If no users linked, should see empty state message
4. Create test event from mobile app
5. Should appear in dashboard for linked emergency contact

## Troubleshooting

### "No authorization token provided"

- Dashboard not sending auth token
- Check `AuthContext.jsx` - token should be in localStorage
- Check API interceptor in `api.js`

### "Invalid or expired token"

- Token expired (Firebase tokens expire after 1 hour)
- AuthContext should auto-refresh, but may need manual refresh
- Try logging out and back in

### "No account found with this email"

- Emergency contact hasn't signed up yet
- Ask them to sign up on dashboard first
- Verify email spelling matches exactly

### "This email is not registered as an emergency contact"

- Email exists but role is wrong
- Check Firestore `users` collection
- Role should be `EMERGENCY_CONTACT`

### Dashboard shows "No linked users found"

- Mobile app hasn't linked this emergency contact yet
- User needs to add email in mobile app settings
- Check `emergencyLinks` collection in Firestore

## Next Steps

- Add email verification for new accounts
- Add password reset functionality
- Add multiple emergency contacts per user
- Add user management in dashboard
- Add activity logs for security auditing


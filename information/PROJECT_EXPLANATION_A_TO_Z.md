# SmartFall Project: Complete A-Z Explanation

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Component Breakdown](#component-breakdown)
5. [Data Flow](#data-flow)
6. [Security & Authentication](#security--authentication)
7. [Key Features](#key-features)
8. [How It Works](#how-it-works)

---

## 🎯 Project Overview

**SmartFall** is a real-time fall detection and emergency alert system designed for a 24-hour hackathon. It transforms a smartphone into a fall detector using built-in sensors, automatically sends alerts to emergency contacts, and provides a web dashboard for monitoring.

### Core Purpose
- **Detect falls** in real-time using smartphone sensors (accelerometer, gyroscope, barometer)
- **Send emergency alerts** via email to designated contacts
- **Track and monitor** fall events through a web dashboard
- **Provide location data** via GPS for emergency response

### Target Users
- **Elderly individuals** at risk of falls
- **People with medical conditions** requiring monitoring
- **Caregivers and family members** who need to be alerted
- **Healthcare facilities** monitoring patients

---

## 🏗️ System Architecture

SmartFall consists of **three main components**:

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Mobile App    │────────▶│   Backend API   │────────▶│  Web Dashboard  │
│  (React Native) │         │  (Node.js/Expr) │         │   (React/Vite)  │
└─────────────────┘         └─────────────────┘         └─────────────────┘
       │                            │                            │
       │                            │                            │
       ▼                            ▼                            ▼
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│ Phone Sensors   │         │  Firebase       │         │  Browser        │
│ (Accel/Gyro)    │         │  (Firestore)    │         │  (Chrome/etc)   │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

### 1. **Mobile App** (React Native with Expo)
- Runs on user's smartphone
- Continuously monitors sensors
- Detects falls using algorithms
- Sends alerts to backend

### 2. **Backend API** (Node.js + Express)
- Receives fall events from mobile app
- Stores data in Firebase Firestore
- Sends email alerts via Nodemailer
- Manages authentication and access control

### 3. **Web Dashboard** (React + Vite)
- Displays fall events in real-time
- Allows emergency contacts to monitor users
- Provides filtering, statistics, and event management

---

## 🛠️ Technology Stack

### Mobile App
- **Framework**: React Native with Expo
- **Sensors**: `expo-sensors` (accelerometer, gyroscope, barometer)
- **Location**: `expo-location` (GPS coordinates)
- **Storage**: `@react-native-async-storage/async-storage` (local data)
- **HTTP**: `axios` (API communication)

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: Firebase Firestore (via `firebase-admin`)
- **Authentication**: Firebase Authentication
- **Email**: Nodemailer (SMTP)
- **Environment**: `dotenv` (configuration)

### Dashboard
- **Framework**: React (Vite)
- **HTTP**: `axios` (API calls)
- **Authentication**: Firebase Client SDK
- **Styling**: CSS (custom styles)

---

## 📦 Component Breakdown

### Mobile App Structure

#### `App.js` (Main Entry Point)
- **Purpose**: Main UI component
- **Features**:
  - Displays fall detection status (NORMAL/SUSPICIOUS/FALL)
  - Shows severity level and metrics
  - User profile display
  - Settings button to open profile modal
  - Countdown timer during fall alert

#### `hooks/useFallDetector.js` (Core Logic)
- **Purpose**: Fall detection algorithm and sensor management
- **Key Functions**:
  - **Sensor Subscription**: Reads accelerometer, gyroscope, barometer at 20 Hz
  - **Fall Detection Algorithm**:
    - Computes acceleration magnitude: `A = √(x² + y² + z²)`
    - Maintains 3-second sliding window of data
    - Detects impact (max acceleration > threshold)
    - Detects post-impact stillness (low variance, mean ≈ 9.8 m/s²)
    - Calculates severity score (Low/Medium/High)
  - **Scoring System**:
    - Impact detected: +2 points
    - Stillness detected: +2 points
    - High rotation: +1 point
    - Score ≥ 4 → FALL
    - Score 2-3 → SUSPICIOUS
    - Score < 2 → NORMAL
  - **Severity Calculation**:
    - Acceleration peak
    - Rotation angle
    - Time still after fall
    - Height estimate from barometer
  - **Alert Flow**:
    - On FALL detection → 10-second countdown
    - User can cancel ("I'm OK")
    - If not cancelled → Get GPS location → Send to backend

#### `services/sensors.js` (Sensor Abstraction)
- **Purpose**: Wraps Expo sensor APIs
- **Functions**:
  - `subscribeSensors()`: Sets up accelerometer, gyroscope, barometer listeners
  - Handles sensor errors gracefully
  - Returns cleanup function to unsubscribe

#### `services/api.js` (API Communication)
- **Purpose**: Centralized API calls
- **Functions**:
  - `sendFallEvent()`: POST fall event to backend
  - `verifyEmergencyEmail()`: Check if email is registered
  - `linkEmergencyContact()`: Create link between user and emergency contact
  - `saveUserProfile()`: Store user name in Firestore

#### `components/UserProfileModal.js` (User Settings)
- **Purpose**: User profile management UI
- **Features**:
  - Input fields for name and emergency email
  - Real-time email verification
  - Save profile locally (AsyncStorage) and remotely (Firestore)
  - Link emergency contact

---

### Backend Structure

#### `index.js` (Main Server)
- **Purpose**: Express app setup and routing
- **Routes**:
  - `GET /`: Health check
  - `GET /health`: JSON health status
  - `/api/auth`: Authentication routes
  - `/api/emergency-links`: Emergency contact linking
  - `/api/users`: User profile management
  - `/api/events`: Fall event management (protected)

#### `routes/events.js` (Event Management)
- **Purpose**: Handle fall event creation and retrieval
- **Endpoints**:
  - `POST /api/events`: Create new fall event
    - Accepts: `userId`, `type`, `location`, `timestamp`, `userName`, `emergencyEmail`, `severity`, `severityScore`, `severityMetrics`
    - Stores in Firestore `events` collection
    - Sends email alert
    - Returns event ID
  - `GET /api/events`: Get events (protected)
    - Requires Firebase ID token
    - Filters events by linked users (access control)
    - Returns last 50 events sorted by timestamp
    - Fallback query if Firestore index missing
  - `DELETE /api/events/:id`: Delete event
  - `PATCH /api/events/:id`: Update event status

#### `routes/auth.js` (Authentication)
- **Purpose**: User authentication for emergency contacts
- **Endpoints**:
  - `POST /api/auth/signup`: Create new emergency contact account
  - `POST /api/auth/login`: Login and get ID token
  - `GET /api/auth/me`: Get current user info
  - `GET /api/auth/verify-email`: Check if email exists

#### `routes/emergencyLinks.js` (Contact Linking)
- **Purpose**: Link mobile users to emergency contacts
- **Endpoints**:
  - `POST /api/emergency-links`: Create link
    - Verifies email exists in Firebase Auth
    - Creates/updates Firestore user document
    - Creates link in `emergencyLinks` collection
    - Normalizes email to lowercase
  - `GET /api/emergency-links`: Get links for user
  - `DELETE /api/emergency-links/:id`: Remove link

#### `routes/users.js` (User Profiles)
- **Purpose**: Manage mobile user profiles
- **Endpoints**:
  - `POST /api/users/profile`: Create/update user profile
  - `GET /api/users/profile/:userId`: Get user profile

#### `middleware/auth.js` (Authentication Middleware)
- **Purpose**: Verify Firebase ID tokens
- **Functions**:
  - `verifyToken()`: Validates token, attaches user to request
  - `getAccessibleUserIds()`: Gets user IDs linked to emergency contact

#### `firebase.js` (Firebase Initialization)
- **Purpose**: Initialize Firebase Admin SDK
- **Features**:
  - Loads credentials from environment variables
  - Initializes Firestore
  - Exports `firestore` and `admin` instances

#### `email.js` (Email Service)
- **Purpose**: Send email alerts via Nodemailer
- **Functions**:
  - `sendAlertEmail()`: Sends HTML email with:
    - User name and ID
    - Timestamp
    - Severity level and metrics
    - Google Maps link
    - Event details

---

### Dashboard Structure

#### `App.jsx` (Main Component)
- **Purpose**: Dashboard UI and data management
- **Features**:
  - Authentication check (redirects to login if not authenticated)
  - Fetches events every 5 seconds
  - Displays statistics cards
  - Filtering and sorting
  - Event details modal
  - Status updates

#### `contexts/AuthContext.jsx` (Authentication Context)
- **Purpose**: Global authentication state management
- **Features**:
  - Firebase Auth integration
  - Token management
  - Auto-attach token to API requests
  - Login/logout/signup functions

#### `components/EventsTable.jsx` (Event Display)
- **Purpose**: Table view of fall events
- **Features**:
  - Columns: Time, User, Type, Status, Location, Severity, Actions
  - Google Maps links
  - Delete button
  - Status dropdown (OPEN/INVESTIGATING/RESOLVED)
  - Click to view details

#### `components/StatisticsCards.jsx` (Statistics)
- **Purpose**: Display key metrics
- **Metrics**:
  - Total events
  - High severity count
  - Today's events
  - Active users
  - Open cases
  - Medium severity count

#### `components/FilterBar.jsx` (Filtering)
- **Purpose**: Filter and sort events
- **Features**:
  - Search by user name
  - Filter by severity (All/Low/Medium/High)
  - Filter by status (All/Open/Investigating/Resolved)
  - Sort by time or severity

#### `components/EventDetailsModal.jsx` (Event Details)
- **Purpose**: Detailed event information
- **Features**:
  - Full event data
  - Severity metrics breakdown
  - Location coordinates
  - User information

#### `pages/LoginPage.jsx` & `SignupPage.jsx` (Authentication Pages)
- **Purpose**: User authentication UI
- **Features**:
  - Email/password login
  - Signup with name, email, password
  - Error handling
  - Redirect to dashboard on success

---

## 🔄 Data Flow

### 1. **Fall Detection Flow**

```
Mobile App Sensors
    ↓
Accelerometer/Gyroscope Data (20 Hz)
    ↓
Fall Detection Algorithm
    ↓
FALL Detected? → Yes → 10s Countdown
    ↓                        ↓
   No                   User Cancels?
    ↓                        ↓
Continue Monitoring      No → Get GPS Location
                              ↓
                         POST /api/events
                              ↓
                         Backend Stores in Firestore
                              ↓
                         Send Email Alert
                              ↓
                         Dashboard Updates (within 5s)
```

### 2. **Emergency Contact Linking Flow**

```
Mobile App User
    ↓
Opens Settings Modal
    ↓
Enters Name & Emergency Email
    ↓
Email Verification (GET /api/auth/verify-email)
    ↓
Email Exists? → No → Error: "Email not registered"
    ↓
   Yes
    ↓
Save Profile (POST /api/users/profile)
    ↓
Link Contact (POST /api/emergency-links)
    ↓
Backend Creates Link in Firestore
    ↓
Success! Profile Saved
```

### 3. **Dashboard Access Flow**

```
Emergency Contact
    ↓
Visits Dashboard
    ↓
Not Logged In? → Yes → Login Page
    ↓
   No
    ↓
Firebase Auth Token
    ↓
GET /api/events (with token)
    ↓
Backend Verifies Token
    ↓
Backend Finds Linked Users
    ↓
Backend Filters Events by Linked Users
    ↓
Returns Filtered Events
    ↓
Dashboard Displays Events
```

### 4. **Email Alert Flow**

```
Fall Event Created
    ↓
Backend Receives Event
    ↓
Extract Emergency Email (from event or user profile)
    ↓
Build HTML Email Template
    ↓
Include: User Name, Timestamp, Severity, Location, Maps Link
    ↓
Send via Nodemailer (SMTP)
    ↓
Emergency Contact Receives Email
```

---

## 🔒 Security & Authentication

### Authentication System

1. **Firebase Authentication**
   - Emergency contacts sign up/login on dashboard
   - Uses email/password authentication
   - Firebase generates ID tokens

2. **Token-Based Access**
   - Dashboard sends ID token in `Authorization: Bearer <token>` header
   - Backend verifies token using Firebase Admin SDK
   - Token contains user email and UID

3. **Access Control**
   - Emergency contacts can only see events from users who linked them
   - Backend enforces access at API level (not client-side)
   - Query filters events by `userId` in `emergencyLinks` collection

### Data Security

1. **Email Normalization**
   - All emails stored in lowercase
   - Prevents case-sensitivity issues
   - Consistent matching

2. **Role-Based System**
   - Users have roles: `EMERGENCY_CONTACT`, `MOBILE_USER`
   - Extensible for future roles (admin, etc.)

3. **Firestore Security**
   - Backend uses Firebase Admin SDK (bypasses security rules)
   - All access controlled at API level
   - No direct client access to Firestore

---

## ✨ Key Features

### Mobile App Features

1. **Real-Time Fall Detection**
   - Continuous sensor monitoring (20 Hz)
   - Hybrid detection algorithm (threshold + scoring)
   - Severity classification (Low/Medium/High)

2. **User Cancellation**
   - 10-second countdown before alert
   - "I'm OK" button to cancel
   - Prevents false alarms

3. **GPS Location**
   - Automatic location capture on fall
   - Included in alert email
   - Google Maps link

4. **User Profile Management**
   - Store name locally and remotely
   - Link emergency contacts
   - Email verification before linking

5. **Severity Metrics**
   - Acceleration peak
   - Rotation angle
   - Time still after fall
   - Height estimate (barometer)

### Backend Features

1. **Event Storage**
   - Firestore database
   - Persistent storage
   - Queryable by user, time, severity

2. **Email Alerts**
   - HTML email templates
   - Professional design
   - Includes all event details
   - Google Maps integration

3. **Access Control**
   - Token-based authentication
   - Role-based access
   - Filtered event queries

4. **Error Handling**
   - Comprehensive error logging
   - User-friendly error messages
   - Fallback queries for Firestore indexes

### Dashboard Features

1. **Real-Time Updates**
   - Polls backend every 5 seconds
   - Automatic refresh
   - Live event feed

2. **Statistics**
   - Total events
   - Severity breakdown
   - Today's events
   - Active users

3. **Filtering & Sorting**
   - Search by user name
   - Filter by severity/status
   - Sort by time/severity

4. **Event Management**
   - View event details
   - Update status (Open/Investigating/Resolved)
   - Delete events
   - Google Maps links

5. **Authentication**
   - Secure login/signup
   - Session management
   - Auto-logout on token expiry

---

## 🔧 How It Works

### Step-by-Step: Complete Fall Detection Process

1. **User Opens Mobile App**
   - App initializes
   - Sensors start reading (accelerometer, gyroscope, barometer)
   - Fall detection algorithm begins monitoring

2. **User Sets Up Profile** (First Time)
   - Opens settings (⚙️ button)
   - Enters name: "John Doe"
   - Enters emergency email: "caregiver@example.com"
   - App verifies email exists in system
   - App saves profile locally and remotely
   - App creates link in `emergencyLinks` collection

3. **Continuous Monitoring**
   - Sensors read data 20 times per second
   - Algorithm computes acceleration magnitude
   - Maintains 3-second sliding window
   - Calculates fall score continuously
   - Displays status: NORMAL/SUSPICIOUS/FALL

4. **Fall Detected**
   - Algorithm detects: Impact + Stillness → Score ≥ 4
   - App shows full-screen modal: "Possible fall detected. Sending alert in 10 seconds..."
   - Countdown starts: 10, 9, 8, ...
   - User can press "I'm OK (Cancel)" button

5. **User Doesn't Cancel**
   - Countdown reaches 0
   - App requests GPS location
   - App calculates severity (Low/Medium/High)
   - App sends POST request to backend:
     ```json
     {
       "userId": "demo-user-1",
       "type": "FALL",
       "location": { "lat": 19.07, "lng": 72.87 },
       "timestamp": "2025-01-15T10:30:00.000Z",
       "userName": "John Doe",
       "emergencyEmail": "caregiver@example.com",
       "severity": {
         "level": "HIGH",
         "score": 7,
         "metrics": {
           "accelerationPeak": 45.2,
           "rotationAngle": 180.5,
           "timeStill": 3.2,
           "heightEstimate": 1.5
         }
       }
     }
     ```

6. **Backend Processes Event**
   - Receives POST request
   - Validates data
   - Stores in Firestore `events` collection
   - Creates/updates user profile in `users` collection
   - Builds email template with:
     - User name: "John Doe"
     - Timestamp: "January 15, 2025 at 10:30 AM"
     - Severity: "HIGH"
     - Metrics: Acceleration peak, rotation, etc.
     - Google Maps link: `https://maps.google.com/?q=19.07,72.87`
   - Sends email via Nodemailer to `caregiver@example.com`
   - Returns success response with event ID

7. **Emergency Contact Receives Email**
   - Email arrives in inbox
   - Subject: "[SmartFall] Fall Alert Detected - John Doe (HIGH)"
   - HTML email with:
     - Red "FALL DETECTED" badge
     - User information
     - Severity details
     - Clickable "View Location on Google Maps" button
     - Event timestamp

8. **Dashboard Updates**
   - Emergency contact logs into dashboard
   - Dashboard polls backend every 5 seconds
   - New event appears in table
   - Shows: Time, User (John Doe), Type (FALL), Status (OPEN), Severity (HIGH)
   - Click "View on map" → Opens Google Maps
   - Can update status to "Investigating" or "Resolved"
   - Can delete event if needed

---

## 📊 Database Structure

### Firestore Collections

#### `users`
```javascript
{
  userId: "demo-user-1",           // Mobile user ID
  name: "John Doe",                 // User's name
  role: "MOBILE_USER",              // User role
  createdAt: Timestamp,
  updatedAt: Timestamp
}
// OR
{
  uid: "firebase-auth-uid",         // Firebase Auth UID
  email: "caregiver@example.com",  // Emergency contact email
  name: "Jane Caregiver",           // Emergency contact name
  role: "EMERGENCY_CONTACT",        // User role
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### `emergencyLinks`
```javascript
{
  linkId: "abc123",
  userId: "demo-user-1",                    // Mobile user ID
  emergencyContactEmail: "caregiver@example.com", // Normalized to lowercase
  status: "ACTIVE",                          // ACTIVE or INACTIVE
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### `events`
```javascript
{
  id: "event-xyz789",
  userId: "demo-user-1",
  userName: "John Doe",
  type: "FALL",
  timestamp: "2025-01-15T10:30:00.000Z",
  location: {
    lat: 19.07,
    lng: 72.87
  },
  status: "OPEN",                           // OPEN, INVESTIGATING, RESOLVED
  severity: {
    level: "HIGH",                           // LOW, MEDIUM, HIGH
    score: 7,
    metrics: {
      accelerationPeak: 45.2,
      rotationAngle: 180.5,
      timeStill: 3.2,
      heightEstimate: 1.5
    }
  },
  emergencyEmail: "caregiver@example.com"
}
```

---

## 🎓 Technical Concepts Explained

### Fall Detection Algorithm

1. **Acceleration Magnitude**
   - Formula: `A = √(x² + y² + z²)`
   - Measures total acceleration regardless of phone orientation
   - Gravity = ~9.8 m/s² (when still)
   - Impact = >20 m/s² (sudden change)

2. **Sliding Window**
   - Maintains last 3 seconds of data
   - Allows detection of impact followed by stillness
   - Typical fall pattern: High acceleration → Low variance

3. **Stillness Detection**
   - Low variance in acceleration
   - Mean acceleration ≈ 9.8 m/s² (gravity)
   - Indicates person is lying down after fall

4. **Severity Scoring**
   - **Acceleration Peak**: Higher = more severe
   - **Rotation Angle**: More rotation = more severe
   - **Time Still**: Longer = more severe
   - **Height Estimate**: Higher fall = more severe

### Sensor Data Processing

1. **Sampling Rate**: 20 Hz (20 readings per second)
2. **Data Window**: 3 seconds = 60 data points
3. **Real-Time Processing**: Each new reading updates the window
4. **Threshold Detection**: Continuous comparison against thresholds

### Email Template System

1. **HTML Template**: Professional design with:
   - Header with logo/branding
   - Severity badge (color-coded)
   - User information section
   - Metrics table
   - Google Maps button
   - Footer with timestamp

2. **Plain Text Fallback**: For email clients that don't support HTML

3. **Dynamic Content**: Template filled with actual event data

---

## 🚀 Deployment Considerations

### Development Setup
- Backend: `localhost:4000`
- Dashboard: `localhost:5173`
- Mobile App: Expo Go (development)

### Production Considerations
- Backend: Deploy to Heroku, Railway, or AWS
- Dashboard: Deploy to Vercel, Netlify, or AWS
- Mobile App: Build with EAS Build, publish to App Store/Play Store
- Environment Variables: Secure storage (AWS Secrets Manager, etc.)
- Database: Firebase Firestore (already cloud-based)
- Email: Production SMTP service (SendGrid, AWS SES, etc.)

---

## 📈 Future Enhancements

1. **Machine Learning**: Train ML model for better accuracy
2. **Multiple Contacts**: Support multiple emergency contacts
3. **SMS Alerts**: Send SMS in addition to email
4. **Mobile Dashboard**: React Native app for emergency contacts
5. **Historical Analytics**: Trends, patterns, risk scoring
6. **Integration**: Connect with healthcare systems, emergency services
7. **Offline Support**: Queue events when offline, send when online
8. **Battery Optimization**: Reduce sensor sampling when not needed

---

## 🎯 Summary

SmartFall is a **complete end-to-end system** that:
- ✅ Detects falls using smartphone sensors
- ✅ Sends alerts to emergency contacts
- ✅ Provides a dashboard for monitoring
- ✅ Includes authentication and access control
- ✅ Calculates fall severity
- ✅ Provides location data for emergency response

The system is **modular**, **scalable**, and **secure**, making it suitable for both hackathon demos and production deployment with additional enhancements.

---

**Built for: 24-Hour Hackathon**  
**Status: Fully Functional Prototype**  
**Tech Stack: React Native, Node.js, Firebase, React**


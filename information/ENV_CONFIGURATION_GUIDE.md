# Environment Variables Configuration Guide

## 📋 Overview

This guide explains all environment variables needed for SmartFall project.

---

## 🔧 Backend Environment Variables (`smartfall-backend/.env`)

### Required Variables (13 total)

```env
# Server Configuration
PORT=4000
DASHBOARD_ORIGIN=http://localhost:5173

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=alerts@smartfall.dev
EMERGENCY_CONTACT=emergency-contact@example.com

# Firebase Admin SDK Configuration
FIREBASE_PROJECT_ID=smartfall-demo
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@smartfall-demo.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_DATABASE_URL=https://smartfall-demo.firebaseio.com
```

### Variable Descriptions

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Backend server port | `4000` |
| `DASHBOARD_ORIGIN` | Allowed CORS origin for dashboard | `http://localhost:5173` |
| `SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP server port (465 for SSL, 587 for TLS) | `465` |
| `SMTP_USER` | SMTP username (usually your email) | `your-email@gmail.com` |
| `SMTP_PASS` | SMTP password (app password for Gmail) | `abcd efgh ijkl mnop` |
| `EMAIL_FROM` | Email sender address | `alerts@smartfall.dev` |
| `EMERGENCY_CONTACT` | Default emergency contact email | `emergency@example.com` |
| `FIREBASE_PROJECT_ID` | Firebase project ID | `smartfall-demo` |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account email | `firebase-adminsdk@...` |
| `FIREBASE_PRIVATE_KEY` | Firebase service account private key | `"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"` |
| `FIREBASE_DATABASE_URL` | Firebase Realtime Database URL | `https://project-id.firebaseio.com` |

### Important Notes

1. **FIREBASE_PRIVATE_KEY**: 
   - Must be wrapped in double quotes
   - Use `\n` for newlines (not actual newlines)
   - Copy exactly from Firebase service account JSON

2. **SMTP Configuration**:
   - For Gmail: Use App Password (not regular password)
   - Port 465 = SSL (secure: true)
   - Port 587 = TLS (secure: false, requiresAuth: true)

---

## 🎨 Dashboard Environment Variables (`smartfall-dashboard/.env`)

### Required Variables (7 total)

```env
# Backend API URL
VITE_API_URL=http://localhost:4000

# Firebase Web App Configuration
VITE_FIREBASE_API_KEY=AIzaSyBNvFSgU4JOlqdwuV6nUecW0jEp0LdXyrc
VITE_FIREBASE_AUTH_DOMAIN=smartfall-demo.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=smartfall-demo
VITE_FIREBASE_STORAGE_BUCKET=smartfall-demo.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

### Variable Descriptions

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `VITE_API_URL` | Backend API base URL | Your backend server URL |
| `VITE_FIREBASE_API_KEY` | Firebase API key | Firebase Console > Project Settings > Your apps > Web app |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain | Same as above |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID | Same as above |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket | Same as above |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging sender ID | Same as above |
| `VITE_FIREBASE_APP_ID` | Firebase App ID | Same as above |

### Important Notes

1. **VITE_ Prefix**: 
   - All dashboard env vars must start with `VITE_`
   - This is required by Vite to expose them to the frontend

2. **Firebase Config**:
   - Get from Firebase Console > Project Settings > Your apps
   - Click the Web icon (</>) to add a web app
   - Copy the config object values

3. **API URL**:
   - For local development: `http://localhost:4000`
   - For production: Your deployed backend URL
   - For mobile device access: Use your computer's LAN IP (e.g., `http://192.168.14.65:4000`)

---

## 📱 Mobile App Environment Variables

### Optional (can be set in `smartfall-app/.env`)

```env
EXPO_PUBLIC_API_URL=http://192.168.14.65:4000
```

**Note**: The mobile app currently hardcodes the API URL in `services/api.js`. You can set this environment variable if you want to make it configurable.

---

## ✅ Configuration Checklist

### Backend Setup
- [ ] Create `smartfall-backend/.env` file
- [ ] Set `PORT` (default: 4000)
- [ ] Set `DASHBOARD_ORIGIN` (your dashboard URL)
- [ ] Configure SMTP settings (Gmail, SendGrid, etc.)
- [ ] Set `EMERGENCY_CONTACT` (default emergency email)
- [ ] Add Firebase Admin SDK credentials
- [ ] Verify `FIREBASE_PRIVATE_KEY` is properly formatted

### Dashboard Setup
- [ ] Create `smartfall-dashboard/.env` file
- [ ] Set `VITE_API_URL` (your backend URL)
- [ ] Get Firebase Web App config from Firebase Console
- [ ] Add all 6 Firebase config variables
- [ ] Verify all variables start with `VITE_`

### Verification
- [ ] Backend starts without errors
- [ ] Dashboard connects to backend API
- [ ] Dashboard can authenticate with Firebase
- [ ] Email alerts are sent successfully

---

## 🔍 How to Get Firebase Configuration

### For Backend (Admin SDK):
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** (gear icon)
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key**
6. Download the JSON file
7. Copy values to `.env`:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (with `\n` escapes)
   - `databaseURL` → `FIREBASE_DATABASE_URL` (if exists)

### For Dashboard (Web App):
1. Go to Firebase Console > Project Settings
2. Scroll to **Your apps** section
3. Click **Web** icon (</>) to add a web app
4. Register app (name: "SmartFall Dashboard")
5. Copy the config object:
   ```javascript
   {
     apiKey: "AIza...",
     authDomain: "project.firebaseapp.com",
     projectId: "project-id",
     storageBucket: "project.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123"
   }
   ```
6. Map to `.env` variables:
   - `apiKey` → `VITE_FIREBASE_API_KEY`
   - `authDomain` → `VITE_FIREBASE_AUTH_DOMAIN`
   - `projectId` → `VITE_FIREBASE_PROJECT_ID`
   - `storageBucket` → `VITE_FIREBASE_STORAGE_BUCKET`
   - `messagingSenderId` → `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `appId` → `VITE_FIREBASE_APP_ID`

---

## 🚨 Common Issues

### Backend Issues

1. **"Firebase not initialized"**
   - Check `FIREBASE_PRIVATE_KEY` format (must have `\n` escapes)
   - Verify all Firebase variables are set

2. **"Email sending failed"**
   - Check SMTP credentials
   - For Gmail: Use App Password, not regular password
   - Verify port (465 for SSL, 587 for TLS)

### Dashboard Issues

1. **"Cannot connect to API"**
   - Check `VITE_API_URL` matches backend URL
   - Verify backend is running
   - Check CORS settings in backend

2. **"Firebase Auth error"**
   - Verify all `VITE_FIREBASE_*` variables are set
   - Check Firebase Authentication is enabled in console
   - Verify email/password provider is enabled

---

## 📝 Example Files

### `smartfall-backend/.env` (Complete)
```env
PORT=4000
DASHBOARD_ORIGIN=http://localhost:5173
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=alerts@smartfall.dev
EMERGENCY_CONTACT=caregiver@example.com
FIREBASE_PROJECT_ID=smartfall-demo
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@smartfall-demo.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
FIREBASE_DATABASE_URL=https://smartfall-demo.firebaseio.com
```

### `smartfall-dashboard/.env` (Complete)
```env
VITE_API_URL=http://localhost:4000
VITE_FIREBASE_API_KEY=AIzaSyBNvFSgU4JOlqdwuV6nUecW0jEp0LdXyrc
VITE_FIREBASE_AUTH_DOMAIN=smartfall-demo.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=smartfall-demo
VITE_FIREBASE_STORAGE_BUCKET=smartfall-demo.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

---

## 🔒 Security Notes

1. **Never commit `.env` files to Git**
   - They're already in `.gitignore`
   - Use `.env.sample` files as templates

2. **Keep credentials secret**
   - Don't share `.env` files
   - Use different credentials for development/production

3. **Rotate credentials regularly**
   - Especially if exposed or compromised

---

**Last Updated**: Based on current SmartFall implementation


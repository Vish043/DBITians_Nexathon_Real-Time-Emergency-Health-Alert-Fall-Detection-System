import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { subscribeSensors } from '../services/sensors';
import { sendFallEvent } from '../services/api';

const COUNTDOWN_SECONDS = 10;
const SAMPLE_INTERVAL_MS = 50; // 20 Hz
const WINDOW_MS = 3000;
const G = 9.80665;
const IMPACT_THRESHOLD_MS2 = 20;
const STILLNESS_VAR_THRESHOLD = 0.05;
const STILLNESS_GRAVITY_TOLERANCE = 0.25;
const GYRO_THRESHOLD = 5;
const DEMO_USER_ID = 'demo-user-1';

// Severity thresholds
const SEVERITY_LOW_MAX_ACCEL = 30; // m/s²
const SEVERITY_MEDIUM_MAX_ACCEL = 50; // m/s²
const SEVERITY_LOW_MAX_ROTATION = 10; // rad/s
const SEVERITY_MEDIUM_MAX_ROTATION = 20; // rad/s
const SEVERITY_MIN_STILL_TIME = 1000; // ms
const SEVERITY_MEDIUM_STILL_TIME = 2000; // ms
const PRESSURE_CHANGE_PER_METER = 0.12; // hPa per meter (approximate)

const STORAGE_KEYS = {
  USER_NAME: '@smartfall:userName',
  EMERGENCY_EMAIL: '@smartfall:emergencyEmail',
  USER_ID: '@smartfall:userId' // Store generated userId
};

/**
 * Generate a userId from userName
 * Normalizes the name: lowercase, replace spaces with hyphens, remove special chars
 */
const generateUserIdFromName = (userName) => {
  if (!userName || !userName.trim()) {
    return DEMO_USER_ID; // Fallback to demo-user-1 if no name
  }
  
  // Normalize: lowercase, replace spaces/special chars with hyphens, remove multiple hyphens
  const normalized = userName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphen
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  
  return normalized || DEMO_USER_ID; // Fallback if result is empty
};

export const CLASSIFICATIONS = {
  NORMAL: { label: 'NORMAL', color: '#22c55e' },
  SUSPICIOUS: { label: 'SUSPICIOUS', color: '#fbbf24' },
  FALL: { label: 'FALL', color: '#f87171' }
};

export const useFallDetector = () => {
  const [acceleration, setAcceleration] = useState({ x: 0, y: 0, z: 0 });
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
  const [pressure, setPressure] = useState(null);
  const [fallScore, setFallScore] = useState(0);
  const [classification, setClassification] = useState('NORMAL');
  const [countdown, setCountdown] = useState(null);
  const [status, setStatus] = useState('Monitoring');
  const [error, setError] = useState(null);
  const [lastEvent, setLastEvent] = useState(null);
  const [windowStats, setWindowStats] = useState({
    maxA: 0,
    mean: 0,
    variance: 0,
    stillness: false
  });
  const [userProfile, setUserProfile] = useState({ userName: '', emergencyEmail: '', userId: '' });
  const [severity, setSeverity] = useState(null);

  const magnitudeWindowRef = useRef([]);
  const confirmFallRef = useRef(null);
  const prevClassificationRef = useRef('NORMAL');
  const fallDetectedAtRef = useRef(null);
  const pressureBeforeFallRef = useRef(null);
  const maxRotationRef = useRef(0);
  const maxAccelerationRef = useRef(0);
  const stillnessStartTimeRef = useRef(null);

  const accelerationMagnitude = useMemo(() => {
    const { x, y, z } = acceleration;
    return Math.sqrt(x * x + y * y + z * z);
  }, [acceleration]);

  const gyroMagnitude = useMemo(() => {
    const { x, y, z } = rotation;
    return Math.sqrt(x * x + y * y + z * z);
  }, [rotation]);

  // Load user profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const [userName, emergencyEmail, storedUserId] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.USER_NAME),
          AsyncStorage.getItem(STORAGE_KEYS.EMERGENCY_EMAIL),
          AsyncStorage.getItem(STORAGE_KEYS.USER_ID)
        ]);
        
        // Generate userId from name if not stored, or if name changed
        let userId = storedUserId || '';
        if (userName && userName.trim()) {
          const generatedUserId = generateUserIdFromName(userName);
          if (!storedUserId || generatedUserId !== storedUserId) {
            userId = generatedUserId;
            await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, userId);
            console.log('[Hook] Generated and stored userId:', userId, 'from name:', userName);
          }
        } else if (!storedUserId) {
          userId = DEMO_USER_ID;
        }
        
        const profile = {
          userName: userName || '',
          emergencyEmail: emergencyEmail || '',
          userId: userId
        };
        console.log('[Hook] Loaded user profile:', profile);
        setUserProfile(profile);
      } catch (err) {
        console.error('Error loading profile:', err);
      }
    };
    loadProfile();
  }, []);

  useEffect(() => {
    console.log('useFallDetector: Initializing sensors...');
    let unsubscribe = () => {};
    try {
      unsubscribe = subscribeSensors({
        interval: SAMPLE_INTERVAL_MS,
        onAcceleration: setAcceleration,
        onRotation: setRotation,
        onPressure: (data) => {
          setPressure(data.pressure);
          // Store pressure before fall is detected
          if (fallDetectedAtRef.current === null && data.pressure) {
            pressureBeforeFallRef.current = data.pressure;
          }
        }
      });
      console.log('useFallDetector: Sensors initialized successfully');
    } catch (err) {
      console.error('Failed to initialize sensors:', err);
      setError('Failed to initialize sensors. Please restart the app.');
    }
    return unsubscribe;
  }, []);

  useEffect(() => {
    const now = Date.now();
    const window = magnitudeWindowRef.current;
    window.push({ ts: now, mag: accelerationMagnitude });
    while (window.length && now - window[0].ts > WINDOW_MS) {
      window.shift();
    }

    if (!window.length) return;
    const mags = window.map((d) => d.mag);
    const maxA = Math.max(...mags) * G;
    const mean = mags.reduce((sum, val) => sum + val, 0) / mags.length;
    const variance =
      mags.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / Math.max(1, mags.length - 1);
    const stillness =
      mags.length >= (WINDOW_MS / SAMPLE_INTERVAL_MS) * 0.6 &&
      variance < STILLNESS_VAR_THRESHOLD &&
      Math.abs(mean - 1) < STILLNESS_GRAVITY_TOLERANCE;

    // Track max values for severity calculation
    if (maxA > maxAccelerationRef.current) {
      maxAccelerationRef.current = maxA;
    }
    if (gyroMagnitude > maxRotationRef.current) {
      maxRotationRef.current = gyroMagnitude;
    }

    // Track stillness time after fall detection
    if (fallDetectedAtRef.current !== null) {
      if (stillness) {
        if (stillnessStartTimeRef.current === null) {
          stillnessStartTimeRef.current = now;
        }
      } else {
        stillnessStartTimeRef.current = null;
      }
    }

    let score = 0;
    if (maxA > IMPACT_THRESHOLD_MS2) score += 2;
    if (stillness) score += 2;
    if (gyroMagnitude > GYRO_THRESHOLD) score += 1;

    const newClassification = score >= 4 ? 'FALL' : score >= 2 ? 'SUSPICIOUS' : 'NORMAL';

    setFallScore(score);
    setWindowStats({ maxA, mean, variance, stillness });
    setClassification(newClassification);
  }, [accelerationMagnitude, gyroMagnitude]);

  useEffect(() => {
    if (classification === 'FALL' && prevClassificationRef.current !== 'FALL' && countdown === null) {
      // Fall just detected - reset tracking variables
      fallDetectedAtRef.current = Date.now();
      maxAccelerationRef.current = 0;
      maxRotationRef.current = 0;
      stillnessStartTimeRef.current = null;
      setStatus('Possible fall detected');
      setCountdown(COUNTDOWN_SECONDS);
    }
    prevClassificationRef.current = classification;
  }, [classification, countdown]);

  // Calculate severity based on physics-based analysis
  const calculateSeverity = useCallback(() => {
    const now = Date.now();
    const accelerationPeak = maxAccelerationRef.current; // m/s²
    const rotationAngle = maxRotationRef.current; // rad/s (approximate)
    
    // Calculate time still after fall
    const timeStill = stillnessStartTimeRef.current 
      ? now - stillnessStartTimeRef.current 
      : 0;
    
    // Calculate height estimate from barometer (if available)
    let heightEstimate = null;
    // Access current pressure from state (will be captured when function is called)
    const currentPressure = pressure;
    if (pressureBeforeFallRef.current && currentPressure) {
      const pressureChange = pressureBeforeFallRef.current - currentPressure;
      // Positive pressure change means we went down (higher pressure at lower altitude)
      if (pressureChange > 0) {
        heightEstimate = (pressureChange / PRESSURE_CHANGE_PER_METER); // meters
      }
    }

    console.log('[Severity] Metrics:', {
      accelerationPeak,
      rotationAngle,
      timeStill,
      heightEstimate
    });

    // Severity scoring
    let severityScore = 0;
    
    // Acceleration peak contribution (0-3 points)
    if (accelerationPeak >= SEVERITY_MEDIUM_MAX_ACCEL) {
      severityScore += 3; // High impact
    } else if (accelerationPeak >= SEVERITY_LOW_MAX_ACCEL) {
      severityScore += 2; // Medium impact
    } else if (accelerationPeak > IMPACT_THRESHOLD_MS2) {
      severityScore += 1; // Low impact
    }

    // Rotation angle contribution (0-2 points)
    if (rotationAngle >= SEVERITY_MEDIUM_MAX_ROTATION) {
      severityScore += 2; // High rotation
    } else if (rotationAngle >= SEVERITY_LOW_MAX_ROTATION) {
      severityScore += 1; // Medium rotation
    }

    // Time still contribution (0-2 points)
    if (timeStill >= SEVERITY_MEDIUM_STILL_TIME) {
      severityScore += 2; // Long stillness (likely serious)
    } else if (timeStill >= SEVERITY_MIN_STILL_TIME) {
      severityScore += 1; // Medium stillness
    }

    // Height estimate contribution (0-2 points, if available)
    if (heightEstimate !== null) {
      if (heightEstimate >= 1.5) {
        severityScore += 2; // High fall (>1.5m)
      } else if (heightEstimate >= 0.5) {
        severityScore += 1; // Medium fall (0.5-1.5m)
      }
    }

    // Determine severity level
    let severityLevel = 'LOW';
    if (severityScore >= 6) {
      severityLevel = 'HIGH';
    } else if (severityScore >= 3) {
      // Special case: If impact >50 m/s² but score is only 3, classify as LOW
      if (accelerationPeak > 50 && severityScore === 3) {
        severityLevel = 'LOW';
      } else {
        severityLevel = 'MEDIUM';
      }
    }

    const severityData = {
      level: severityLevel,
      score: severityScore,
      metrics: {
        accelerationPeak: Math.round(accelerationPeak * 10) / 10,
        rotationAngle: Math.round(rotationAngle * 10) / 10,
        timeStill: Math.round(timeStill),
        heightEstimate: heightEstimate !== null ? Math.round(heightEstimate * 100) / 100 : null
      }
    };

    console.log('[Severity] Calculated:', severityData);
    return severityData;
  }, [pressure]);

  const cancelAlert = useCallback(() => {
    setCountdown(null);
    setStatus('Monitoring');
    setError(null);
    // Reset fall tracking when cancelled
    fallDetectedAtRef.current = null;
    maxAccelerationRef.current = 0;
    maxRotationRef.current = 0;
    stillnessStartTimeRef.current = null;
    pressureBeforeFallRef.current = null;
  }, []);

  const confirmFall = useCallback(async () => {
    setCountdown(null);
    setStatus('Sending alert…');
    setError(null);
    try {
      // Load fresh profile data from AsyncStorage right before sending
      let currentProfile = { userName: '', emergencyEmail: '' };
      try {
        const [userName, emergencyEmail] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.USER_NAME),
          AsyncStorage.getItem(STORAGE_KEYS.EMERGENCY_EMAIL)
        ]);
        currentProfile = {
          userName: userName || '',
          emergencyEmail: emergencyEmail || ''
        };
        console.log('[Hook] Loaded fresh profile from AsyncStorage:', currentProfile);
      } catch (err) {
        console.error('[Hook] Error loading profile from AsyncStorage:', err);
        // Fall back to state
        currentProfile = userProfile;
      }

      let coords = null;
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      if (locationStatus === 'granted') {
        const position = await Location.getCurrentPositionAsync({});
        coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
      }

      const timestamp = new Date().toISOString();
      
      // Generate userId from userName (or use stored userId)
      let userId;
      try {
        const storedUserId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
        if (storedUserId) {
          userId = storedUserId;
          console.log('[Hook] Using stored userId:', userId);
        } else if (currentProfile.userName && currentProfile.userName.trim()) {
          // Generate userId from name
          userId = generateUserIdFromName(currentProfile.userName);
          // Store it for future use
          await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, userId);
          console.log('[Hook] Generated and stored userId:', userId, 'from name:', currentProfile.userName);
        } else {
          userId = DEMO_USER_ID;
          console.log('[Hook] No name provided, using default userId:', userId);
        }
      } catch (err) {
        console.error('[Hook] Error getting userId, using default:', err);
        userId = currentProfile.userName ? generateUserIdFromName(currentProfile.userName) : DEMO_USER_ID;
      }
      
      console.log('[Hook] Using profile for sending:', currentProfile);
      console.log('[Hook] Using userId:', userId, '(userName:', currentProfile.userName, ')');
      
      // Calculate severity before sending
      const severityData = calculateSeverity();
      setSeverity(severityData);
      
      // Prepare payload - only include fields if they have values
      const payload = {
        userId,
        type: 'FALL',
        location: coords,
        timestamp,
        severity: severityData.level,
        severityScore: severityData.score,
        severityMetrics: severityData.metrics
      };
      
      // Only add userName and emergencyEmail if they exist and are not empty
      if (currentProfile.userName && currentProfile.userName.trim()) {
        payload.userName = currentProfile.userName.trim();
      }
      if (currentProfile.emergencyEmail && currentProfile.emergencyEmail.trim()) {
        payload.emergencyEmail = currentProfile.emergencyEmail.trim();
      }
      
      console.log('[Hook] Sending fall event to backend with payload:', JSON.stringify(payload, null, 2));
      
      const response = await sendFallEvent(payload);

      console.log('Backend response:', response.data);

      if (!response?.data?.success) {
        throw new Error(response?.data?.message ?? 'Failed to send alert');
      }

      setLastEvent({ id: response.data.eventId, timestamp, location: coords, severity: severityData });
      setStatus('Alert sent ✅');
      setError(null); // Clear any previous errors
      
      // Reset fall tracking after successful send
      fallDetectedAtRef.current = null;
      maxAccelerationRef.current = 0;
      maxRotationRef.current = 0;
      stillnessStartTimeRef.current = null;
      pressureBeforeFallRef.current = null;
    } catch (err) {
      console.error('Error sending fall event:', err);
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        response: err.response?.data,
        status: err.response?.status
      });
      
      // Check if the request actually succeeded (data might be in Firestore even if response failed)
      const errorMessage = err.response?.data?.message || err.message || 'Failed to send alert';
      
      // If we got a response but it's an error, show that
      if (err.response) {
        setError(errorMessage);
        setStatus('Failed to send alert');
      } else if (err.code === 'NETWORK_ERROR' || err.message === 'Network Error' || err.code === 'ECONNABORTED') {
        // Network error - but data might have reached backend anyway
        setError('Network timeout - but alert may have been sent. Check dashboard.');
        setStatus('Sending... (check dashboard)');
      } else {
        setError(errorMessage);
        setStatus('Failed to send alert');
      }
    }
  }, []);

  useEffect(() => {
    confirmFallRef.current = confirmFall;
  }, [confirmFall]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      confirmFallRef.current?.();
      return;
    }
    const timer = setTimeout(
      () => setCountdown((prev) => (prev === null ? null : prev - 1)),
      1000
    );
    return () => clearTimeout(timer);
  }, [countdown, userProfile]);

  const classificationMeta = CLASSIFICATIONS[classification] || CLASSIFICATIONS.NORMAL;

  const updateUserProfile = useCallback((profile) => {
    console.log('[Hook] Updating user profile:', profile);
    setUserProfile(profile);
  }, []);

  return {
    rotation,
    fallScore,
    classification,
    classificationMeta,
    countdown,
    status,
    error,
    lastEvent,
    windowStats,
    cancelAlert,
    userProfile,
    updateUserProfile,
    severity
  };
};


import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Location from 'expo-location';
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

export const CLASSIFICATIONS = {
  NORMAL: { label: 'NORMAL', color: '#22c55e' },
  SUSPICIOUS: { label: 'SUSPICIOUS', color: '#fbbf24' },
  FALL: { label: 'FALL', color: '#f87171' }
};

export const useFallDetector = () => {
  const [acceleration, setAcceleration] = useState({ x: 0, y: 0, z: 0 });
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
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

  const magnitudeWindowRef = useRef([]);
  const confirmFallRef = useRef(null);
  const prevClassificationRef = useRef('NORMAL');

  const accelerationMagnitude = useMemo(() => {
    const { x, y, z } = acceleration;
    return Math.sqrt(x * x + y * y + z * z);
  }, [acceleration]);

  const gyroMagnitude = useMemo(() => {
    const { x, y, z } = rotation;
    return Math.sqrt(x * x + y * y + z * z);
  }, [rotation]);

  useEffect(() => {
    const unsubscribe = subscribeSensors({
      interval: SAMPLE_INTERVAL_MS,
      onAcceleration: setAcceleration,
      onRotation: setRotation
    });
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
      setStatus('Possible fall detected');
      setCountdown(COUNTDOWN_SECONDS);
    }
    prevClassificationRef.current = classification;
  }, [classification, countdown]);

  const cancelAlert = useCallback(() => {
    setCountdown(null);
    setStatus('Monitoring');
    setError(null);
  }, []);

  const confirmFall = useCallback(async () => {
    setCountdown(null);
    setStatus('Sending alert…');
    setError(null);
    try {
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
      const { data } = await sendFallEvent({
        userId: DEMO_USER_ID,
        type: 'FALL',
        location: coords,
        timestamp
      });

      if (!data?.success) {
        throw new Error(data?.message ?? 'Failed to send alert');
      }

      setLastEvent({ id: data.eventId, timestamp, location: coords });
      setStatus('Alert sent ✅');
    } catch (err) {
      console.error(err);
      setError(err.message);
      setStatus('Failed to send alert');
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
  }, [countdown]);

  return {
    rotation,
    fallScore,
    classification,
    classificationMeta: CLASSIFICATIONS[classification],
    countdown,
    status,
    error,
    lastEvent,
    windowStats,
    cancelAlert
  };
};


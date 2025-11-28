import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import { Accelerometer, Gyroscope } from 'expo-sensors';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:4000';
const COUNTDOWN_SECONDS = 10;
const DEMO_USER = {
  userId: 'demo-user-1',
  userName: 'SmartFall User',
  contactEmail: 'emergency@example.com'
};

export default function App() {
  const [acceleration, setAcceleration] = useState({ x: 0, y: 0, z: 0 });
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
  const [fallScore, setFallScore] = useState(0);
  const [countdown, setCountdown] = useState(null);
  const [status, setStatus] = useState('Monitoring');
  const [lastEvent, setLastEvent] = useState(null);
  const [error, setError] = useState(null);

  const lastMagnitudeRef = useRef(1);
  const isCountingDown = countdown !== null;

  const accelerationMagnitude = useMemo(() => {
    const { x, y, z } = acceleration;
    return Math.sqrt(x * x + y * y + z * z);
  }, [acceleration]);

  useEffect(() => {
    Accelerometer.setUpdateInterval(100);
    Gyroscope.setUpdateInterval(100);

    const accSub = Accelerometer.addListener((data) => setAcceleration(data));
    const gyroSub = Gyroscope.addListener((data) => setRotation(data));

    return () => {
      accSub && accSub.remove();
      gyroSub && gyroSub.remove();
    };
  }, []);

  useEffect(() => {
    const last = lastMagnitudeRef.current;
    const jerk = Math.abs(accelerationMagnitude - last);
    const rotationEnergy = Math.sqrt(rotation.x ** 2 + rotation.y ** 2 + rotation.z ** 2);

    let score = 0;
    if (accelerationMagnitude > 2.8) score += 2;
    if (jerk > 1.5) score += 1;
    if (rotationEnergy > 6) score += 1;

    setFallScore(score);
    lastMagnitudeRef.current = accelerationMagnitude;

    if (score >= 3 && !isCountingDown) {
      setStatus('Possible fall detected');
      setCountdown(COUNTDOWN_SECONDS);
    }
  }, [accelerationMagnitude, rotation, isCountingDown]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      confirmFall();
      return;
    }
    const timer = setTimeout(() => setCountdown((prev) => (prev === null ? null : prev - 1)), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const cancelAlert = () => {
    setCountdown(null);
    setStatus('Monitoring');
    setError(null);
  };

  const confirmFall = async () => {
    setCountdown(null);
    setStatus('Sending alert…');
    setError(null);
    try {
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      if (locationStatus !== 'granted') {
        throw new Error('Location permission denied');
      }

      const position = await Location.getCurrentPositionAsync({});
      const payload = {
        userId: DEMO_USER.userId,
        userName: DEMO_USER.userName,
        contactEmail: DEMO_USER.contactEmail,
        severity: fallScore >= 4 ? 'high' : 'medium',
        score: fallScore,
        location: {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }
      };

      const res = await fetch(`${API_BASE}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to send alert');
      }

      const event = await res.json();
      setLastEvent(event);
      setStatus('Alert sent ✅');
    } catch (err) {
      console.error(err);
      setError(err.message);
      setStatus('Failed to send alert');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.card}>
        <Text style={styles.title}>SmartFall Monitor</Text>
        <Text style={styles.status}>{status}</Text>
        {countdown !== null ? (
          <>
            <Text style={styles.countdown}>{countdown}</Text>
            <Text style={styles.subtitle}>Cancel if you are okay</Text>
            <TouchableOpacity style={styles.cancelButton} onPress={cancelAlert}>
              <Text style={styles.cancelText}>I am OK</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.metricLabel}>Fall score</Text>
            <Text style={styles.metricValue}>{fallScore.toFixed(1)}</Text>
            <Text style={styles.subtitle}>
              Accel: {accelerationMagnitude.toFixed(2)}g · Rot: {rotation.x.toFixed(2)},{' '}
              {rotation.y.toFixed(2)}, {rotation.z.toFixed(2)}
            </Text>
          </>
        )}
        {error && <Text style={styles.error}>{error}</Text>}
        {lastEvent && (
          <View style={styles.eventCard}>
            <Text style={styles.eventTitle}>Last alert</Text>
            <Text style={styles.eventText}>{new Date(lastEvent.fallDetectedAt).toLocaleString()}</Text>
            {lastEvent.location?.lat && (
              <Text style={styles.eventText}>
                {lastEvent.location.lat.toFixed(4)}, {lastEvent.location.lng.toFixed(4)}
              </Text>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 24
  },
  card: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    justifyContent: 'center'
  },
  title: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12
  },
  status: {
    fontSize: 18,
    color: '#cbd5f5',
    textAlign: 'center',
    marginBottom: 8
  },
  metricLabel: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center'
  },
  metricValue: {
    fontSize: 54,
    color: '#f8fafc',
    textAlign: 'center',
    fontWeight: '800',
    marginVertical: 4
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 12
  },
  countdown: {
    fontSize: 72,
    color: '#f87171',
    textAlign: 'center',
    fontWeight: '800',
    marginVertical: 12
  },
  cancelButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 12,
    marginHorizontal: 24,
    marginTop: 16
  },
  cancelText: {
    color: '#0f172a',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700'
  },
  error: {
    color: '#f87171',
    textAlign: 'center',
    marginTop: 12
  },
  eventCard: {
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 12,
    marginTop: 20
  },
  eventTitle: {
    color: '#f1f5f9',
    fontWeight: '600',
    marginBottom: 6
  },
  eventText: {
    color: '#cbd5f5',
    fontSize: 14
  }
});


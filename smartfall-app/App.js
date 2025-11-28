import { registerRootComponent } from 'expo';
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFallDetector } from './hooks/useFallDetector';

console.log('SmartFall App mounting');

function App() {
  const {
    rotation,
    fallScore,
    classificationMeta,
    windowStats,
    countdown,
    status,
    error,
    lastEvent,
    cancelAlert
  } = useFallDetector();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.card}>
        <Text style={styles.title}>SmartFall Monitor</Text>
        <Text style={[styles.state, { color: classificationMeta.color }]}>
          {classificationMeta.label}
        </Text>
        <Text style={styles.status}>{status}</Text>

        <View style={styles.metricsRow}>
          <View style={styles.metricBlock}>
            <Text style={styles.metricLabel}>Score</Text>
            <Text style={styles.metricValue}>{fallScore.toFixed(1)}</Text>
          </View>
          <View style={styles.metricBlock}>
            <Text style={styles.metricLabel}>Max impact</Text>
            <Text style={styles.metricValue}>{windowStats.maxA.toFixed(1)} m/s²</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>
          Mean A: {windowStats.mean.toFixed(2)}g · Var: {windowStats.variance.toFixed(3)} · Still:{' '}
          {windowStats.stillness ? 'Yes' : 'No'}
        </Text>
        <Text style={styles.subtitle}>
          Gyro: {rotation.x.toFixed(2)}, {rotation.y.toFixed(2)}, {rotation.z.toFixed(2)}
        </Text>

        {error && <Text style={styles.error}>{error}</Text>}

        {lastEvent && (
          <View style={styles.eventCard}>
            <Text style={styles.eventTitle}>Last alert</Text>
            <Text style={styles.eventText}>{new Date(lastEvent.timestamp).toLocaleString()}</Text>
            {lastEvent.location?.lat && (
              <Text style={styles.eventText}>
                {lastEvent.location.lat.toFixed(4)}, {lastEvent.location.lng.toFixed(4)}
              </Text>
            )}
          </View>
        )}
      </View>

      {countdown !== null && (
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Possible fall detected.</Text>
            <Text style={styles.modalSubtitle}>Sending alert in 10 seconds…</Text>
            <Text style={styles.countdown}>{countdown}</Text>
            <TouchableOpacity style={styles.cancelButton} onPress={cancelAlert}>
              <Text style={styles.cancelText}>I'm OK (Cancel)</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

export default App;

// Register with Expo
registerRootComponent(App);

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
  state: {
    fontSize: 20,
    textAlign: 'center',
    fontWeight: '700',
    marginBottom: 8
  },
  status: {
    fontSize: 16,
    color: '#cbd5f5',
    textAlign: 'center',
    marginBottom: 16
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16
  },
  metricBlock: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16
  },
  metricLabel: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center'
  },
  metricValue: {
    fontSize: 40,
    color: '#f8fafc',
    textAlign: 'center',
    fontWeight: '800',
    marginTop: 4
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 12
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
    marginTop: 16,
    paddingHorizontal: 24
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
  },
  modal: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center'
  },
  modalTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700'
  },
  modalSubtitle: {
    color: '#cbd5f5',
    marginTop: 8,
    marginBottom: 12,
    textAlign: 'center'
  }
});

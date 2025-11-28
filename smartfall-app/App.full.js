import React from 'react';
import { StyleSheet, Text, View, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';

console.log('Simple App: Module loading...');

export default function SimpleApp() {
  console.log('Simple App: Component function called!');
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.card}>
        <Text style={styles.title}>SmartFall Monitor</Text>
        <Text style={styles.subtitle}>Simple Test - If you see this, rendering works!</Text>
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
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 12
  }
});


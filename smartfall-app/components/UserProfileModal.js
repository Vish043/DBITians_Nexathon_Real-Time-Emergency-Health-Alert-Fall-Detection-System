import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  USER_NAME: '@smartfall:userName',
  EMERGENCY_EMAIL: '@smartfall:emergencyEmail'
};

export default function UserProfileModal({ visible, onClose, onSave }) {
  const [userName, setUserName] = useState('');
  const [emergencyEmail, setEmergencyEmail] = useState('');

  useEffect(() => {
    if (visible) {
      loadProfile();
    }
  }, [visible]);

  const loadProfile = async () => {
    try {
      const [name, email] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.USER_NAME),
        AsyncStorage.getItem(STORAGE_KEYS.EMERGENCY_EMAIL)
      ]);
      setUserName(name || '');
      setEmergencyEmail(email || '');
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  };

  const handleSave = async () => {
    try {
      const trimmedName = userName.trim();
      const trimmedEmail = emergencyEmail.trim();
      
      console.log('[Modal] Saving profile:', { userName: trimmedName, emergencyEmail: trimmedEmail });
      
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.USER_NAME, trimmedName),
        AsyncStorage.setItem(STORAGE_KEYS.EMERGENCY_EMAIL, trimmedEmail)
      ]);
      
      console.log('[Modal] Profile saved to AsyncStorage');
      
      const profile = { userName: trimmedName, emergencyEmail: trimmedEmail };
      onSave(profile);
      onClose();
    } catch (err) {
      console.error('[Modal] Error saving profile:', err);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>User Profile</Text>
          <Text style={styles.modalSubtitle}>Enter your details for emergency alerts</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Your Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor="#64748b"
              value={userName}
              onChangeText={setUserName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Emergency Contact Email</Text>
            <TextInput
              style={styles.input}
              placeholder="emergency@example.com"
              placeholderTextColor="#64748b"
              value={emergencyEmail}
              onChangeText={setEmergencyEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.hint}>This email will receive fall alerts</Text>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
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
    maxWidth: 400
  },
  modalTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8
  },
  modalSubtitle: {
    color: '#cbd5f5',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24
  },
  inputGroup: {
    marginBottom: 20
  },
  label: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155'
  },
  hint: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 6
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center'
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center'
  },
  saveButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700'
  }
});


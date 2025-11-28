import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { verifyEmergencyEmail, linkEmergencyContact, saveUserProfile } from '../services/api';

const STORAGE_KEYS = {
  USER_NAME: '@smartfall:userName',
  EMERGENCY_EMAIL: '@smartfall:emergencyEmail',
  USER_ID: '@smartfall:userId'
};

/**
 * Generate a userId from userName
 * Normalizes the name: lowercase, replace spaces with hyphens, remove special chars
 */
const generateUserIdFromName = (userName) => {
  console.log('[Modal] generateUserIdFromName called with:', userName);
  
  if (!userName || !userName.trim()) {
    console.log('[Modal] No name provided, returning default userId');
    return 'demo-user-1'; // Fallback
  }
  
  // Normalize: lowercase, replace spaces/special chars with hyphens, remove multiple hyphens
  const normalized = userName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphen
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  
  const result = normalized || 'demo-user-1'; // Fallback if result is empty
  console.log('[Modal] Generated userId:', result, 'from name:', userName);
  return result;
};

export default function UserProfileModal({ visible, onClose, onSave, userId = 'demo-user-1' }) {
  const [userName, setUserName] = useState('');
  const [emergencyEmail, setEmergencyEmail] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [emailError, setEmailError] = useState('');

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

  const handleEmailBlur = async () => {
    const trimmedEmail = emergencyEmail.trim();
    if (!trimmedEmail) {
      setEmailError('');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setEmailError('Invalid email format');
      return;
    }

    setVerifying(true);
    setEmailError('');

    try {
      const result = await verifyEmergencyEmail(trimmedEmail);
      if (!result.exists) {
        setEmailError('This email is not registered. Please ask them to sign up on the dashboard first.');
      } else {
        setEmailError(''); // Email exists and is valid
      }
    } catch (err) {
      console.error('[Modal] Error verifying email:', err);
      setEmailError('Could not verify email. Please check your connection.');
    } finally {
      setVerifying(false);
    }
  };

  const handleSave = async () => {
    try {
      const trimmedName = userName.trim();
      const trimmedEmail = emergencyEmail.trim();

      if (!trimmedEmail) {
        Alert.alert('Error', 'Emergency contact email is required');
        return;
      }

      // Generate userId from name (or use existing stored userId)
      let currentUserId;
      try {
        const storedUserId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
        if (storedUserId && trimmedName) {
          // If name changed, regenerate userId
          const newUserId = generateUserIdFromName(trimmedName);
          if (newUserId !== storedUserId) {
            console.log('[Modal] Name changed, updating userId:', storedUserId, '→', newUserId);
            currentUserId = newUserId;
            await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, newUserId);
          } else {
            currentUserId = storedUserId;
          }
        } else if (trimmedName) {
          // Generate new userId from name
          console.log('[Modal] No stored userId found, generating from name:', trimmedName);
          currentUserId = generateUserIdFromName(trimmedName);
          await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, currentUserId);
          console.log('[Modal] ✅ Generated and stored userId:', currentUserId, 'from name:', trimmedName);
        } else {
          // No name provided, use prop userId or default
          currentUserId = userId || 'demo-user-1';
        }
      } catch (err) {
        console.error('[Modal] Error managing userId:', err);
        currentUserId = trimmedName ? generateUserIdFromName(trimmedName) : (userId || 'demo-user-1');
      }

      console.log('[Modal] Using userId:', currentUserId, 'for name:', trimmedName);

      // Verify email exists before saving
      setSaving(true);
      setEmailError('');

      const verifyResult = await verifyEmergencyEmail(trimmedEmail);
      if (!verifyResult.exists) {
        setEmailError('This email is not registered. Please ask them to sign up on the dashboard first.');
        setSaving(false);
        return;
      }

      // Save user profile to Firestore (name) - use generated userId
      if (trimmedName) {
        try {
          await saveUserProfile(currentUserId, trimmedName);
          console.log('[Modal] User profile saved to Firestore with userId:', currentUserId);
        } catch (profileError) {
          console.error('[Modal] Error saving user profile:', profileError);
          // Continue even if profile save fails - still save locally
        }
      }

      // Link the emergency contact - use generated userId
      try {
        await linkEmergencyContact(currentUserId, trimmedEmail);
        console.log('[Modal] Emergency contact linked successfully with userId:', currentUserId);
      } catch (linkError) {
        const errorMsg = linkError.response?.data?.message || linkError.message || 'Failed to link emergency contact';
        const status = linkError.response?.status;
        const errorData = linkError.response?.data;
        
        console.error('[Modal] Link error details:', {
          message: errorMsg,
          status: status,
          data: errorData,
          fullError: linkError
        });
        
        if (errorMsg.includes('already linked') || (status === 400 && errorMsg.includes('already linked'))) {
          // Link already exists - this is fine, just continue without showing error
          console.log('[Modal] ✅ Emergency contact already linked - this is OK, continuing...');
          // Don't show error alert, just continue to save profile
          // The link exists, so we can proceed
        } else if (status === 404 && errorMsg.includes('not registered')) {
          // Email not registered - show specific error
          setEmailError(errorMsg);
          setSaving(false);
          Alert.alert('Error', errorMsg);
          return;
        } else {
          // Show the actual error message to user
          Alert.alert('Error', errorMsg || 'Failed to link emergency contact. Please check your connection and try again.');
          setSaving(false);
          return; // Don't throw, just return to allow user to retry
        }
      }

      // Save to local storage (including userId)
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.USER_NAME, trimmedName),
        AsyncStorage.setItem(STORAGE_KEYS.EMERGENCY_EMAIL, trimmedEmail),
        AsyncStorage.setItem(STORAGE_KEYS.USER_ID, currentUserId)
      ]);

      console.log('[Modal] Profile saved to AsyncStorage with userId:', currentUserId);

      const profile = { userName: trimmedName, emergencyEmail: trimmedEmail, userId: currentUserId };
      onSave(profile);
      Alert.alert('Success', 'Profile saved and emergency contact linked successfully!');
      onClose();
    } catch (err) {
      console.error('[Modal] Error saving profile:', err);
      console.error('[Modal] Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      // Don't show duplicate alerts if we already showed one
      if (!err.response || err.response.status !== 404) {
        const errorMsg = err.response?.data?.message || err.message || 'Failed to save profile. Please try again.';
        Alert.alert('Error', errorMsg);
      }
    } finally {
      setSaving(false);
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
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, emailError && styles.inputError]}
                placeholder="emergency@example.com"
                placeholderTextColor="#64748b"
                value={emergencyEmail}
                onChangeText={(text) => {
                  setEmergencyEmail(text);
                  setEmailError(''); // Clear error on change
                }}
                onBlur={handleEmailBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!verifying && !saving}
              />
              {verifying && (
                <ActivityIndicator size="small" color="#22c55e" style={styles.verifyingIndicator} />
              )}
            </View>
            {emailError ? (
              <Text style={styles.errorText}>{emailError}</Text>
            ) : (
              <Text style={styles.hint}>
                This email must be registered on the dashboard first
              </Text>
            )}
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.saveButton, (saving || verifying) && styles.saveButtonDisabled]} 
              onPress={handleSave}
              disabled={saving || verifying}
            >
              {saving ? (
                <ActivityIndicator color="#0f172a" />
              ) : (
                <Text style={styles.saveButtonText}>Save & Link</Text>
              )}
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
  inputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center'
  },
  input: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
    minHeight: 50,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
    textAlignVertical: 'center' // For Android
  },
  inputError: {
    borderColor: '#ef4444'
  },
  verifyingIndicator: {
    position: 'absolute',
    right: 14
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 6
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
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48
  },
  saveButtonDisabled: {
    opacity: 0.6
  },
  saveButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700'
  }
});


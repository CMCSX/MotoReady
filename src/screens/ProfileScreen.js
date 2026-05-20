import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { db } from '../modules/storage';
import { theme } from '../styles/theme';

export default function ProfileScreen({ navigation, isDarkMode }) {
  const currentTheme = isDarkMode ? theme.dark : theme.light;
  const colors = currentTheme.colors;
  const shadows = currentTheme.shadows;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    bikeModel: '',
    experienceYears: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    bloodType: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    const data = await db.getProfile();
    if (data) {
      setProfile(data);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!profile.fullName.trim()) {
      Alert.alert('Validation Error', 'Full Name is required.');
      return;
    }
    if (!profile.email.trim() || !profile.email.includes('@')) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }

    setSaving(true);
    const success = await db.saveProfile(profile);
    setSaving(false);

    if (success) {
      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } else {
      Alert.alert('Error', 'Failed to save profile details.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Get user initials for premium avatar
  const getInitials = (name) => {
    if (!name) return 'R';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={[styles.backBtn, { backgroundColor: colors.surfaceContainerHigh }]} 
          onPress={() => navigation.goBack()}
        >
          <FontAwesome6 name="arrow-left" size={16} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.onSurface }]}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Display */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarInitials}>{getInitials(profile.fullName)}</Text>
          </View>
          <Text style={[styles.avatarSubtitle, { color: colors.onSurfaceVariant }]}>Rider Profile Card</Text>
        </View>

        {/* Form Fields */}
        <Text style={[styles.groupTitle, { color: colors.primary }]}>Rider Identity</Text>
        <View style={[styles.card, { backgroundColor: colors.surface }, shadows.level1]}>
          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>Full Name</Text>
            <TextInput
              style={[styles.input, { color: colors.onSurface, borderColor: colors.outlineVariant }]}
              value={profile.fullName}
              onChangeText={(txt) => setProfile(prev => ({ ...prev, fullName: txt }))}
              placeholder="e.g. John Doe"
              placeholderTextColor={colors.onSurfaceVariant + '80'}
            />
          </View>

          <View style={[styles.fieldRow, styles.borderTop, { borderTopColor: colors.outlineVariant }]}>
            <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>Email Address</Text>
            <TextInput
              style={[styles.input, { color: colors.onSurface, borderColor: colors.outlineVariant }]}
              value={profile.email}
              onChangeText={(txt) => setProfile(prev => ({ ...prev, email: txt }))}
              placeholder="e.g. rider@motoready.com"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={colors.onSurfaceVariant + '80'}
            />
          </View>
        </View>

        <Text style={[styles.groupTitle, { color: colors.primary }]}>Motorcycle Details</Text>
        <View style={[styles.card, { backgroundColor: colors.surface }, shadows.level1]}>
          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>Bike Model</Text>
            <TextInput
              style={[styles.input, { color: colors.onSurface, borderColor: colors.outlineVariant }]}
              value={profile.bikeModel}
              onChangeText={(txt) => setProfile(prev => ({ ...prev, bikeModel: txt }))}
              placeholder="e.g. Yamaha MT-07"
              placeholderTextColor={colors.onSurfaceVariant + '80'}
            />
          </View>

          <View style={[styles.fieldRow, styles.borderTop, { borderTopColor: colors.outlineVariant }]}>
            <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>Riding Experience (Years)</Text>
            <TextInput
              style={[styles.input, { color: colors.onSurface, borderColor: colors.outlineVariant }]}
              value={profile.experienceYears}
              onChangeText={(txt) => setProfile(prev => ({ ...prev, experienceYears: txt }))}
              placeholder="e.g. 3"
              keyboardType="numeric"
              placeholderTextColor={colors.onSurfaceVariant + '80'}
            />
          </View>
        </View>

        <Text style={[styles.groupTitle, { color: colors.primary }]}>Medical & Emergency (Safety First)</Text>
        <View style={[styles.card, { backgroundColor: colors.surface }, shadows.level1]}>
          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>Emergency Name</Text>
            <TextInput
              style={[styles.input, { color: colors.onSurface, borderColor: colors.outlineVariant }]}
              value={profile.emergencyContactName}
              onChangeText={(txt) => setProfile(prev => ({ ...prev, emergencyContactName: txt }))}
              placeholder="e.g. John Doe (Spouse)"
              placeholderTextColor={colors.onSurfaceVariant + '80'}
            />
          </View>

          <View style={[styles.fieldRow, styles.borderTop, { borderTopColor: colors.outlineVariant }]}>
            <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>Emergency Phone</Text>
            <TextInput
              style={[styles.input, { color: colors.onSurface, borderColor: colors.outlineVariant }]}
              value={profile.emergencyContactPhone}
              onChangeText={(txt) => setProfile(prev => ({ ...prev, emergencyContactPhone: txt }))}
              placeholder="e.g. +1-555-0199"
              keyboardType="phone-pad"
              placeholderTextColor={colors.onSurfaceVariant + '80'}
            />
          </View>

          <View style={[styles.fieldRow, styles.borderTop, { borderTopColor: colors.outlineVariant }]}>
            <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>Blood Type</Text>
            <TextInput
              style={[styles.input, { color: colors.onSurface, borderColor: colors.outlineVariant }]}
              value={profile.bloodType}
              onChangeText={(txt) => setProfile(prev => ({ ...prev, bloodType: txt }))}
              placeholder="e.g. O+"
              placeholderTextColor={colors.onSurfaceVariant + '80'}
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity 
          style={[styles.saveBtn, { backgroundColor: colors.primary }]} 
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <>
              <FontAwesome6 name="check" size={16} color={colors.onPrimary} style={{ marginRight: 8 }} />
              <Text style={[styles.saveBtnText, { color: colors.onPrimary }]}>Save Profile</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 44 : Platform.OS === 'android' ? 24 : 12,
    paddingBottom: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 64,
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: 12,
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 10,
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
  },
  avatarSubtitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 18,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: theme.shapes.medium,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  fieldRow: {
    paddingVertical: 14,
    flexDirection: 'column',
    gap: 6,
  },
  borderTop: {
    borderTopWidth: 1,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  input: {
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: theme.shapes.small,
  },
  saveBtn: {
    marginTop: 32,
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});

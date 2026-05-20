import React from 'react';
import { StyleSheet, Text, View, Switch, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { db } from '../modules/storage';
import { theme } from '../styles/theme';

export default function SettingsScreen({ isDarkMode, onToggleDarkMode, onClearDataComplete }) {
  const currentTheme = isDarkMode ? theme.dark : theme.light;
  const colors = currentTheme.colors;
  const shadows = currentTheme.shadows;

  const handleClearData = () => {
    Alert.alert(
      "Clear All Data",
      "This will permanently delete all saved parking spots, cached weather data, and ticket history. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear Everything", 
          style: "destructive",
          onPress: async () => {
            const success = await db.clearAllData();
            if (success) {
              Alert.alert("Data Cleared", "All application data has been wiped.");
              if (onClearDataComplete) onClearDataComplete();
            } else {
              Alert.alert("Error", "Could not clear storage.");
            }
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>MotoReady</Text>
        <Text style={[styles.title, { color: colors.onSurface }]}>Settings</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 96 }} showsVerticalScrollIndicator={false}>
        
        {/* Appearance Group */}
        <Text style={[styles.groupTitle, { color: colors.primary }]}>Appearance</Text>
        <View style={[styles.settingsGroup, { backgroundColor: colors.surface }, shadows.level1]}>
          <View style={styles.settingRow}>
            <View style={styles.rowLabelBox}>
              <FontAwesome6 name="moon" size={16} color={colors.onSurfaceVariant} style={styles.rowIcon} />
              <View>
                <Text style={[styles.rowTitle, { color: colors.onSurface }]}>Dark Mode</Text>
                <Text style={[styles.rowSub, { color: colors.onSurfaceVariant }]}>Adjust theme colors for night riding</Text>
              </View>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={onToggleDarkMode}
              trackColor={{ false: colors.outlineVariant, true: colors.primaryContainer }}
              thumbColor={isDarkMode ? colors.primary : colors.secondary}
            />
          </View>
        </View>

        {/* Data Management Group */}
        <Text style={[styles.groupTitle, { color: colors.primary }]}>Data & Cache</Text>
        <View style={[styles.settingsGroup, { backgroundColor: colors.surface }, shadows.level1]}>
          <TouchableOpacity style={styles.settingRow} onPress={handleClearData}>
            <View style={styles.rowLabelBox}>
              <FontAwesome6 name="trash-can" size={16} color={colors.error} style={styles.rowIcon} />
              <View>
                <Text style={[styles.rowTitle, { color: colors.error }]}>Clear All App Data</Text>
                <Text style={[styles.rowSub, { color: colors.onSurfaceVariant }]}>Wipe tickets, parkings, and cache</Text>
              </View>
            </View>
            <FontAwesome6 name="chevron-right" size={12} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        {/* About Group */}
        <Text style={[styles.groupTitle, { color: colors.primary }]}>About</Text>
        <View style={[styles.settingsGroup, { backgroundColor: colors.surface }, shadows.level1]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.onSurfaceVariant }]}>Application</Text>
            <Text style={[styles.infoVal, { color: colors.onSurface }]}>MotoReady Mobile</Text>
          </View>
          <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: colors.outlineVariant }]}>
            <Text style={[styles.infoLabel, { color: colors.onSurfaceVariant }]}>Version</Text>
            <Text style={[styles.infoVal, { color: colors.onSurface }]}>1.0.0 (Native)</Text>
          </View>
          <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: colors.outlineVariant }]}>
            <Text style={[styles.infoLabel, { color: colors.onSurfaceVariant }]}>Powered by</Text>
            <Text style={[styles.infoVal, { color: colors.onSurface }]}>Expo & Material Design 3</Text>
          </View>
        </View>

        <Text style={[styles.copyright, { color: colors.onSurfaceVariant }]}>
          © 2026 MotoReady. Safe rides start here.
        </Text>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
    marginTop: 48,
  },
  eyebrow: {
    fontSize: theme.typography.sizes.eyebrow,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: theme.typography.sizes.titleLarge,
    fontWeight: '700',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 16,
  },
  settingsGroup: {
    borderRadius: theme.shapes.large,
    overflow: 'hidden',
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  rowLabelBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowIcon: {
    width: 24,
    marginRight: 12,
    textAlign: 'center',
  },
  rowTitle: {
    fontSize: theme.typography.sizes.bodyLarge,
    fontWeight: '600',
  },
  rowSub: {
    fontSize: 12,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  infoLabel: {
    fontSize: theme.typography.sizes.bodyMedium,
  },
  infoVal: {
    fontSize: theme.typography.sizes.bodyMedium,
    fontWeight: '600',
  },
  copyright: {
    textAlign: 'center',
    fontSize: 11,
    marginTop: 32,
    opacity: 0.7,
  },
});

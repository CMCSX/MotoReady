import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { db } from '../modules/storage';
import { theme } from '../styles/theme';

export default function ParkingScreen({ isDarkMode }) {
  const currentTheme = isDarkMode ? theme.dark : theme.light;
  const colors = currentTheme.colors;
  const shadows = currentTheme.shadows;

  const [activeTab, setActiveTab] = useState('park');
  const [photoUri, setPhotoUri] = useState(null);
  const [parkingNotes, setParkingNotes] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [selectedSpot, setSelectedSpot] = useState(null);

  useEffect(() => {
    loadParkingHistory();
  }, []);

  const loadParkingHistory = async () => {
    const list = await db.getParkingLocations();
    setHistory(list);
    if (list.length > 0 && !selectedSpot) {
      setSelectedSpot(list[0]);
    }
  };

  const handlePickImage = async (useCamera = false) => {
    try {
      let result;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          alert('Camera permissions are required to snap a parking photo.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          quality: 0.8,
          allowsEditing: true,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          alert('Photo library permissions are required to select a parking photo.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          quality: 0.8,
          allowsEditing: true,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (err) {
      alert('Error choosing image.');
    }
  };

  const handleSaveParking = async () => {
    setSaveLoading(true);
    try {
      let latitude = 14.5995;
      let longitude = 120.9842;

      // Basic browser geolocation coordinates
      if (navigator.geolocation) {
        await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              latitude = pos.coords.latitude;
              longitude = pos.coords.longitude;
              resolve();
            },
            () => resolve()
          );
        });
      }

      const success = await db.addParkingLocation(latitude, longitude, photoUri, parkingNotes);
      if (success) {
        alert('Bike Parking location saved successfully!');
        setPhotoUri(null);
        setParkingNotes('');
        loadParkingHistory();
        setActiveTab('find');
      } else {
        alert('Could not save parking. Try again.');
      }
    } catch (err) {
      alert('Failed saving bike parking.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteSpot = async (id) => {
    const confirmDelete = window.confirm("Delete this saved parking spot?");
    if (confirmDelete) {
      const success = await db.deleteParkingLocation(id);
      if (success) {
        loadParkingHistory();
        if (selectedSpot && selectedSpot.id === id) {
          setSelectedSpot(null);
        }
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>MotoReady</Text>
        <Text style={[styles.title, { color: colors.onSurface }]}>Smart Parking</Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: colors.outlineVariant }]}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'park' && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab('park')}
        >
          <FontAwesome6 name="motorcycle" size={16} color={activeTab === 'park' ? colors.primary : colors.secondary} />
          <Text style={[styles.tabText, { color: activeTab === 'park' ? colors.primary : colors.secondary }]}>Park Bike</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'find' && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab('find')}
        >
          <FontAwesome6 name="compass" size={16} color={activeTab === 'find' ? colors.primary : colors.secondary} />
          <Text style={[styles.tabText, { color: activeTab === 'find' ? colors.primary : colors.secondary }]}>Find Bike</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'park' ? (
          <View style={styles.formGroup}>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Save Current Location</Text>
            
            {/* Snap Photo Box */}
            <View style={[styles.photoBox, { backgroundColor: colors.surfaceVariant, borderColor: colors.outline }]}>
              {photoUri ? (
                <View style={styles.photoContainer}>
                  <Image source={{ uri: photoUri }} style={styles.photo} />
                  <TouchableOpacity style={styles.clearPhoto} onPress={() => setPhotoUri(null)}>
                    <FontAwesome6 name="xmark" size={16} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.photoPlaceholder}>
                  <FontAwesome6 name="camera" size={32} color={colors.onSurfaceVariant} style={{ marginBottom: 12 }} />
                  <Text style={[styles.photoText, { color: colors.onSurfaceVariant }]}>
                    Attach a photo of your bike parking space
                  </Text>
                  <View style={styles.photoActions}>
                    <TouchableOpacity 
                      style={[styles.smallBtn, { backgroundColor: colors.primary }]} 
                      onPress={() => handlePickImage(true)}
                    >
                      <Text style={{ color: colors.onPrimary, fontWeight: '700', fontSize: 13 }}>Snap Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.smallBtn, { backgroundColor: colors.secondaryContainer }]} 
                      onPress={() => handlePickImage(false)}
                    >
                      <Text style={{ color: colors.onSecondaryContainer, fontWeight: '700', fontSize: 13 }}>Choose Gallery</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Note Fields */}
            <TextInput
              style={[styles.notesInput, { backgroundColor: colors.surface, borderColor: colors.outline, color: colors.onSurface }]}
              placeholder="Add details (e.g. Row G, Bay 4, Near entrance...)"
              placeholderTextColor={`${colors.onSurfaceVariant}aa`}
              multiline
              numberOfLines={3}
              value={parkingNotes}
              onChangeText={setParkingNotes}
            />

            <TouchableOpacity 
              style={[styles.saveBtn, { backgroundColor: colors.primary }]} 
              onPress={handleSaveParking}
              disabled={saveLoading}
            >
              {saveLoading ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <>
                  <FontAwesome6 name="floppy-disk" size={18} color={colors.onPrimary} style={{ marginRight: 8 }} />
                  <Text style={[styles.saveBtnText, { color: colors.onPrimary }]}>Pin Current Location</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.findGroup}>
            {/* History Selector */}
            {history.length === 0 ? (
              <View style={styles.emptyHistory}>
                <FontAwesome6 name="motorcycle" size={48} color={`${colors.onSurfaceVariant}55`} style={{ marginBottom: 16 }} />
                <Text style={{ color: colors.onSurfaceVariant, fontSize: 15 }}>No saved parking spots found.</Text>
              </View>
            ) : (
              <View style={styles.historySection}>
                
                {/* Embedded Web Map */}
                {selectedSpot && (
                  <View style={[styles.mapContainer, shadows.level2]}>
                    <iframe
                      src={`https://maps.google.com/maps?q=${selectedSpot.latitude},${selectedSpot.longitude}&z=16&output=embed`}
                      style={{ width: '100%', height: '100%', border: 0 }}
                      title="Parking Map Preview"
                    />
                  </View>
                )}

                {/* Spot Details Card */}
                {selectedSpot && (
                  <View style={[styles.detailsCard, { backgroundColor: colors.surface }, shadows.level1]}>
                    <View style={styles.detailsHeader}>
                      <Text style={[styles.detailsTitle, { color: colors.onSurface }]}>Saved Parking Spot</Text>
                      <Text style={[styles.detailsTime, { color: colors.onSurfaceVariant }]}>
                        {new Date(selectedSpot.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    {selectedSpot.photoData && (
                      <Image source={{ uri: selectedSpot.photoData }} style={styles.detailsPhoto} />
                    )}
                    {selectedSpot.notes ? (
                      <Text style={[styles.detailsNotes, { color: colors.onSurface }]}>{selectedSpot.notes}</Text>
                    ) : (
                      <Text style={[styles.detailsNotes, { color: colors.onSurfaceVariant, fontStyle: 'italic' }]}>
                        No parking description notes added.
                      </Text>
                    )}
                  </View>
                )}

                {/* Spot History List */}
                <Text style={[styles.listTitle, { color: colors.primary }]}>Your Saved Parking Spots</Text>
                <View style={styles.spotList}>
                  {history.map((spot) => (
                    <TouchableOpacity 
                      key={spot.id} 
                      style={[
                        styles.spotRow, 
                        { backgroundColor: colors.surface, borderLeftColor: colors.outline },
                        selectedSpot && selectedSpot.id === spot.id && { borderLeftColor: colors.primary, borderLeftWidth: 4 }
                      ]}
                      onPress={() => setSelectedSpot(spot)}
                    >
                      <View style={styles.spotRowLeft}>
                        {spot.photoData ? (
                          <Image source={{ uri: spot.photoData }} style={styles.spotRowThumb} />
                        ) : (
                          <View style={[styles.spotRowThumbPlaceholder, { backgroundColor: colors.surfaceVariant }]}>
                            <FontAwesome6 name="motorcycle" size={14} color={colors.onSurfaceVariant} />
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.spotRowNotes, { color: colors.onSurface }]} numberOfLines={1}>
                            {spot.notes || 'No description notes'}
                          </Text>
                          <Text style={[styles.spotRowTime, { color: colors.onSurfaceVariant }]}>
                            {new Date(spot.timestamp).toLocaleDateString()} at {new Date(spot.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => handleDeleteSpot(spot.id)} style={styles.deleteBtn}>
                        <FontAwesome6 name="trash-can" size={14} color={colors.error} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
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
    marginTop: 12,
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
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: 8,
  },
  tabText: {
    fontSize: theme.typography.sizes.bodyLarge,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 96,
  },
  formGroup: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.titleMedium,
    fontWeight: '700',
  },
  photoBox: {
    borderRadius: theme.shapes.large,
    borderWidth: 1,
    borderStyle: 'dashed',
    height: 200,
    overflow: 'hidden',
  },
  photoContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  clearPhoto: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  photoText: {
    fontSize: theme.typography.sizes.bodyMedium,
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.8,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 12,
  },
  smallBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.shapes.small,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: theme.shapes.medium,
    padding: 12,
    fontSize: theme.typography.sizes.bodyMedium,
    fontFamily: theme.typography.fontFamily,
    height: 80,
    textAlignVertical: 'top',
  },
  saveBtn: {
    flexDirection: 'row',
    height: 52,
    borderRadius: theme.shapes.large,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: theme.typography.sizes.bodyLarge,
    fontWeight: '700',
  },
  findGroup: {},
  emptyHistory: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  historySection: {
    gap: 16,
  },
  mapContainer: {
    height: 200,
    borderRadius: theme.shapes.large,
    overflow: 'hidden',
  },
  detailsCard: {
    padding: 16,
    borderRadius: theme.shapes.large,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailsTitle: {
    fontSize: theme.typography.sizes.bodyLarge,
    fontWeight: '700',
  },
  detailsTime: {
    fontSize: 12,
  },
  detailsPhoto: {
    width: '100%',
    height: 150,
    borderRadius: theme.shapes.medium,
    marginBottom: 12,
    resizeMode: 'cover',
  },
  detailsNotes: {
    fontSize: theme.typography.sizes.bodyMedium,
    lineHeight: 20,
  },
  listTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 8,
  },
  spotList: {
    gap: 10,
  },
  spotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: theme.shapes.medium,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
  },
  spotRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  spotRowThumb: {
    width: 40,
    height: 40,
    borderRadius: theme.shapes.small,
    resizeMode: 'cover',
  },
  spotRowThumbPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: theme.shapes.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotRowNotes: {
    fontSize: theme.typography.sizes.bodyMedium,
    fontWeight: '600',
  },
  spotRowTime: {
    fontSize: 11,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 12,
  },
});

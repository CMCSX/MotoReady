import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { db } from '../modules/storage';
import { theme } from '../styles/theme';

export default function ParkingScreen({ isDarkMode }) {
  const currentTheme = isDarkMode ? theme.dark : theme.light;
  const colors = currentTheme.colors;
  const shadows = currentTheme.shadows;

  const [activeTab, setActiveTab] = useState('park'); // 'park' or 'find'
  const [photoUri, setPhotoUri] = useState(null);
  const [notes, setNotes] = useState('');
  const [coords, setCoords] = useState(null);
  const [capturingLocation, setCapturingLocation] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Saved locations state
  const [savedSpots, setSavedSpots] = useState([]);
  const [selectedSpotForMap, setSelectedSpotForMap] = useState(null);

  useEffect(() => {
    loadSavedSpots();
  }, []);

  const loadSavedSpots = async () => {
    const spots = await db.getParkingLocations();
    setSavedSpots(spots);
    if (spots.length > 0) {
      setSelectedSpotForMap(spots[0]);
    }
  };

  const handlePickImage = async (useCamera = false) => {
    try {
      const permissionResult = useCamera 
        ? await ImagePicker.requestCameraPermissionsAsync() 
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert("Permission Denied", "Permission to access camera/gallery is required.");
        return;
      }

      const options = {
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      };

      const result = useCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      console.warn('Image picker error:', error);
    }
  };

  const handleCaptureLocation = async () => {
    setCapturingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Denied", "Location permissions are required to save parking spot coordinates.");
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setCoords({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
      });
    } catch (error) {
      console.warn(error);
      Alert.alert("Location Error", "Could not get current coordinates.");
    } finally {
      setCapturingLocation(false);
    }
  };

  const handleSaveParking = async () => {
    if (!coords) {
      Alert.alert("Location Required", "Please capture your current location before saving.");
      return;
    }

    setSaving(true);
    try {
      await db.addParkingLocation(coords.latitude, coords.longitude, photoUri, notes);
      Alert.alert("Success", "Parking spot saved successfully!");
      setPhotoUri(null);
      setNotes('');
      setCoords(null);
      await loadSavedSpots();
      setActiveTab('find');
    } catch (err) {
      Alert.alert("Error", "Failed to save parking spot.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSpot = (id) => {
    Alert.alert(
      "Delete Parking Spot",
      "Are you sure you want to delete this parking spot?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            await db.deleteParkingLocation(id);
            await loadSavedSpots();
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      
      {/* Custom Tab Switcher */}
      <View style={[styles.tabBar, { backgroundColor: colors.surfaceContainerHigh }]}>
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'park' && [styles.activeTabItem, { backgroundColor: colors.primary }]]}
          onPress={() => setActiveTab('park')}
        >
          <FontAwesome6 name="motorcycle" size={16} color={activeTab === 'park' ? colors.onPrimary : colors.onSurfaceVariant} />
          <Text style={[styles.tabText, { color: activeTab === 'park' ? colors.onPrimary : colors.onSurfaceVariant }]}>
            Park Bike
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'find' && [styles.activeTabItem, { backgroundColor: colors.primary }]]}
          onPress={() => setActiveTab('find')}
        >
          <FontAwesome6 name="map-pin" size={16} color={activeTab === 'find' ? colors.onPrimary : colors.onSurfaceVariant} />
          <Text style={[styles.tabText, { color: activeTab === 'find' ? colors.onPrimary : colors.onSurfaceVariant }]}>
            Find Bike ({savedSpots.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {activeTab === 'park' ? (
          <View style={styles.tabContent}>
            <Text style={[styles.title, { color: colors.onSurface }]}>Park My Bike</Text>
            <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
              Save your bike's location and add details to easily find it later.
            </Text>

            {/* Photo Capture Section */}
            <Text style={[styles.label, { color: colors.onSurface }]}>Photo of Parking Spot</Text>
            {photoUri ? (
              <View style={styles.photoContainer}>
                <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" />
                <TouchableOpacity 
                  style={[styles.deletePhotoBtn, { backgroundColor: colors.error }]}
                  onPress={() => setPhotoUri(null)}
                >
                  <FontAwesome6 name="trash-can" size={14} color="#FFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.photoPlaceholder, { borderColor: colors.outlineVariant, backgroundColor: colors.surface }]}>
                <FontAwesome6 name="camera" size={32} color={colors.outline} />
                <Text style={[styles.photoHint, { color: colors.onSurfaceVariant }]}>Take a photo or choose an existing image</Text>
                <View style={styles.photoActions}>
                  <TouchableOpacity style={[styles.photoBtn, { backgroundColor: colors.primaryContainer }]} onPress={() => handlePickImage(true)}>
                    <Text style={{ color: colors.onPrimaryContainer, fontWeight: '600' }}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.photoBtn, { backgroundColor: colors.secondaryContainer }]} onPress={() => handlePickImage(false)}>
                    <Text style={{ color: colors.onSecondaryContainer, fontWeight: '600' }}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Notes Section */}
            <Text style={[styles.label, { color: colors.onSurface }]}>Notes & Details</Text>
            <TextInput
              style={[styles.textInput, { 
                borderColor: colors.outlineVariant, 
                backgroundColor: colors.surface,
                color: colors.onSurface 
              }]}
              placeholder="e.g. Level 3 near column C, next to exit gate…"
              placeholderTextColor={`${colors.onSurfaceVariant}aa`}
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
            />

            {/* Location Coordinates Capture */}
            <Text style={[styles.label, { color: colors.onSurface }]}>GPS Location</Text>
            {coords ? (
              <View style={[styles.locationCard, { backgroundColor: colors.surfaceContainerHigh }]}>
                <FontAwesome6 name="circle-check" size={24} color={colors.success} style={styles.locationCardIcon} />
                <View style={styles.locationCardInfo}>
                  <Text style={[styles.coordsText, { color: colors.onSurface }]}>
                    Lat: {coords.latitude.toFixed(6)}, Lon: {coords.longitude.toFixed(6)}
                  </Text>
                  <Text style={[styles.accuracyText, { color: colors.onSurfaceVariant }]}>
                    Accuracy: ±{Math.round(coords.accuracy)}m
                  </Text>
                </View>
                <TouchableOpacity style={[styles.reCaptureBtn, { backgroundColor: colors.surface }]} onPress={handleCaptureLocation}>
                  <Text style={{ color: colors.primary, fontWeight: '600' }}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={[styles.captureBtn, { backgroundColor: colors.primaryContainer }]}
                onPress={handleCaptureLocation}
                disabled={capturingLocation}
              >
                {capturingLocation ? (
                  <ActivityIndicator size="small" color={colors.onPrimaryContainer} />
                ) : (
                  <>
                    <FontAwesome6 name="crosshairs" size={16} color={colors.onPrimaryContainer} style={{ marginRight: 8 }} />
                    <Text style={{ color: colors.onPrimaryContainer, fontWeight: '700' }}>Capture Current GPS</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Save Button */}
            <TouchableOpacity 
              style={[styles.saveBtn, { backgroundColor: coords ? colors.primary : `${colors.outlineVariant}80` }]}
              onPress={handleSaveParking}
              disabled={saving || !coords}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <Text style={[styles.saveBtnText, { color: coords ? colors.onPrimary : `${colors.onSurfaceVariant}aa` }]}>
                  Save Parking Location
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.tabContent}>
            <Text style={[styles.title, { color: colors.onSurface }]}>Saved Bike Locations</Text>
            
            {savedSpots.length === 0 ? (
              <View style={styles.emptyContainer}>
                <FontAwesome6 name="circle-question" size={48} color={colors.outline} style={{ opacity: 0.4 }} />
                <Text style={[styles.emptyText, { color: colors.onSurface }]}>No saved parking spots</Text>
                <Text style={[styles.emptySub, { color: colors.onSurfaceVariant }]}>Save your location on the "Park Bike" tab first.</Text>
              </View>
            ) : (
              <View>
                {/* Spot Map View */}
                {selectedSpotForMap && (
                  <View style={[styles.mapContainer, shadows.level2]}>
                    <MapView
                      style={styles.map}
                      region={{
                        latitude: selectedSpotForMap.latitude,
                        longitude: selectedSpotForMap.longitude,
                        latitudeDelta: 0.005,
                        longitudeDelta: 0.005,
                      }}
                    >
                      <Marker
                        coordinate={{
                          latitude: selectedSpotForMap.latitude,
                          longitude: selectedSpotForMap.longitude,
                        }}
                        title="My Bike"
                        description={selectedSpotForMap.notes || "Saved location"}
                      />
                    </MapView>
                  </View>
                )}

                {/* Spots List */}
                <View style={styles.spotsList}>
                  {savedSpots.map((spot, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={[
                        styles.spotCard, 
                        { 
                          backgroundColor: colors.surface,
                          borderColor: selectedSpotForMap?.id === spot.id ? colors.primary : 'transparent',
                          borderWidth: 2
                        },
                        shadows.level1
                      ]}
                      onPress={() => setSelectedSpotForMap(spot)}
                    >
                      {spot.photoData && (
                        <Image source={{ uri: spot.photoData }} style={styles.spotPhoto} contentFit="cover" />
                      )}
                      <View style={styles.spotInfo}>
                        <Text style={[styles.spotNotes, { color: colors.onSurface }]}>
                          {spot.notes || 'No description added'}
                        </Text>
                        <Text style={[styles.spotTime, { color: colors.onSurfaceVariant }]}>
                          {new Date(spot.timestamp).toLocaleDateString()} at {new Date(spot.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </Text>
                        <Text style={[styles.spotCoords, { color: colors.primary }]}>
                          {spot.latitude.toFixed(5)}, {spot.longitude.toFixed(5)}
                        </Text>
                      </View>
                      
                      <TouchableOpacity 
                        style={[styles.deleteSpotBtn, { backgroundColor: colors.surfaceContainerHigh }]}
                        onPress={() => handleDeleteSpot(spot.id)}
                      >
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    margin: 16,
    marginBottom: 8,
    borderRadius: theme.shapes.medium,
    padding: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    borderRadius: theme.shapes.small,
  },
  activeTabItem: {
    // shadow elevation handled locally
  },
  tabText: {
    fontSize: theme.typography.sizes.bodyMedium,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 80,
  },
  tabContent: {
    flex: 1,
  },
  title: {
    fontSize: theme.typography.sizes.titleLarge,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: theme.typography.sizes.bodyMedium,
    marginBottom: 12,
    lineHeight: 18,
  },
  label: {
    fontSize: theme.typography.sizes.bodyLarge,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 4,
  },
  photoContainer: {
    position: 'relative',
    height: 140,
    borderRadius: theme.shapes.medium,
    overflow: 'hidden',
    marginBottom: 10,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  deletePhotoBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: theme.shapes.full,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 5,
  },
  photoPlaceholder: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: theme.shapes.medium,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginBottom: 10,
  },
  photoHint: {
    fontSize: theme.typography.sizes.bodySmall,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 12,
  },
  photoBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: theme.shapes.full,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: theme.shapes.medium,
    padding: 12,
    fontSize: theme.typography.sizes.bodyLarge,
    textAlignVertical: 'top',
    height: 72,
    marginBottom: 10,
  },
  captureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: theme.shapes.full,
    marginBottom: 12,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: theme.shapes.medium,
    marginBottom: 12,
  },
  locationCardIcon: {
    marginRight: 12,
  },
  locationCardInfo: {
    flex: 1,
  },
  coordsText: {
    fontSize: theme.typography.sizes.bodyMedium,
    fontWeight: '600',
  },
  accuracyText: {
    fontSize: 12,
    marginTop: 2,
  },
  reCaptureBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.shapes.full,
  },
  saveBtn: {
    height: 52,
    borderRadius: theme.shapes.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    fontSize: theme.typography.sizes.bodyLarge,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: theme.typography.sizes.titleMedium,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySub: {
    fontSize: theme.typography.sizes.bodyMedium,
    textAlign: 'center',
    marginTop: 4,
  },
  mapContainer: {
    height: 240,
    borderRadius: theme.shapes.large,
    overflow: 'hidden',
    marginBottom: 20,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  spotsList: {
    gap: 12,
  },
  spotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.shapes.large,
    padding: 12,
  },
  spotPhoto: {
    width: 64,
    height: 64,
    borderRadius: theme.shapes.medium,
    marginRight: 12,
  },
  spotInfo: {
    flex: 1,
  },
  spotNotes: {
    fontSize: theme.typography.sizes.bodyLarge,
    fontWeight: '700',
  },
  spotTime: {
    fontSize: 12,
    marginTop: 4,
  },
  spotCoords: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  deleteSpotBtn: {
    width: 36,
    height: 36,
    borderRadius: theme.shapes.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

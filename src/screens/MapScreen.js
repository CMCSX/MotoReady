import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Linking, Alert } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { weather } from '../modules/weather';
import { theme } from '../styles/theme';

export default function MapScreen({ isDarkMode }) {
  const currentTheme = isDarkMode ? theme.dark : theme.light;
  const colors = currentTheme.colors;
  const shadows = currentTheme.shadows;

  const mapRef = useRef(null);

  const [currentLoc, setCurrentLoc] = useState({
    latitude: 14.5995, // Default Manila
    longitude: 120.9842,
    latitudeDelta: 0.015,
    longitudeDelta: 0.015,
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [nearbyPOIs, setNearbyPOIs] = useState([]);

  const categories = ['All', 'Parking', 'Fuel', 'Food', 'Repair'];

  useEffect(() => {
    getUserLocation();
  }, []);

  useEffect(() => {
    generateNearbyPOIs();
  }, [currentLoc, selectedCategory]);

  const getUserLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Denied", "Location permissions are required to center the map.");
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      const newLoc = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      };
      setCurrentLoc(newLoc);
      mapRef.current?.animateToRegion(newLoc, 1000);
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'MotoReadyMobile/1.0', 'Accept-Language': 'en' }
      });
      const data = await res.json();
      if (data && data.length > 0) {
        const target = {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        };
        setCurrentLoc(target);
        mapRef.current?.animateToRegion(target, 1000);
      } else {
        Alert.alert("Not Found", `Could not find "${searchQuery}"`);
      }
    } catch (err) {
      Alert.alert("Error", "Location search failed.");
    } finally {
      setLoading(false);
    }
  };

  const generateNearbyPOIs = () => {
    const lat = currentLoc.latitude;
    const lon = currentLoc.longitude;

    const allPOIs = [
      {
        id: 'poi_1',
        name: 'MotoReady Safe Park',
        category: 'Parking',
        latitude: lat + 0.003,
        longitude: lon + 0.002,
        distance: '450m',
        rating: 4.8,
        icon: 'square-parking',
        color: '#2E7D32',
      },
      {
        id: 'poi_2',
        name: 'RapidFix Moto Shop',
        category: 'Repair',
        latitude: lat - 0.004,
        longitude: lon + 0.003,
        distance: '620m',
        rating: 4.9,
        icon: 'wrench',
        color: '#E67E22',
      },
      {
        id: 'poi_3',
        name: 'EcoFuel Station',
        category: 'Fuel',
        latitude: lat + 0.002,
        longitude: lon - 0.004,
        distance: '750m',
        rating: 4.5,
        icon: 'gas-pump',
        color: '#BA1A1A',
      },
      {
        id: 'poi_4',
        name: 'Biker Bite Diner',
        category: 'Food',
        latitude: lat - 0.002,
        longitude: lon - 0.001,
        distance: '310m',
        rating: 4.7,
        icon: 'utensils',
        color: '#1A237E',
      },
      {
        id: 'poi_5',
        name: 'Downtown Bike Parking',
        category: 'Parking',
        latitude: lat - 0.005,
        longitude: lon - 0.003,
        distance: '900m',
        rating: 4.2,
        icon: 'square-parking',
        color: '#2E7D32',
      }
    ];

    if (selectedCategory === 'All') {
      setNearbyPOIs(allPOIs);
    } else {
      setNearbyPOIs(allPOIs.filter(p => p.category === selectedCategory));
    }
  };

  const handleNavigate = (poi) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${poi.latitude},${poi.longitude}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Could not open map navigation.");
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* Map view container */}
      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={currentLoc}
        >
          <Marker
            coordinate={{ latitude: currentLoc.latitude, longitude: currentLoc.longitude }}
            title="My Location"
            pinColor={colors.primary}
          />
          {nearbyPOIs.map((poi) => (
            <Marker
              key={poi.id}
              coordinate={{ latitude: poi.latitude, longitude: poi.longitude }}
              title={poi.name}
              description={`${poi.category} • ${poi.distance} • Rating: ${poi.rating}`}
              pinColor={poi.color}
            />
          ))}
        </MapView>

        {/* Floating Search Bar */}
        <View style={[styles.floatingSearch, shadows.level3, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
          <FontAwesome6 name="magnifying-glass" size={18} color={colors.onSurfaceVariant} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.onSurface }]}
            placeholder="Search location…"
            placeholderTextColor={`${colors.onSurfaceVariant}aa`}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity style={[styles.searchBtn, { backgroundColor: colors.primary }]} onPress={handleSearch}>
            <FontAwesome6 name="arrow-right" size={16} color={colors.onPrimary} />
          </TouchableOpacity>
        </View>

        {/* Locate Me Floating Action Button */}
        <TouchableOpacity 
          style={[styles.locateFab, shadows.level3, { backgroundColor: colors.surface }]}
          onPress={getUserLocation}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <FontAwesome6 name="location-crosshairs" size={20} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Category Selection Filter Chips */}
      <View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.chipScroll}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.chip, 
                { 
                  backgroundColor: colors.surface, 
                  borderColor: colors.outline 
                },
                selectedCategory === cat && {
                  backgroundColor: colors.secondaryContainer,
                  borderColor: colors.secondaryContainer,
                }
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text 
                style={[
                  styles.chipText, 
                  { color: colors.onSurfaceVariant },
                  selectedCategory === cat && {
                    color: colors.onSecondaryContainer,
                    fontWeight: '700'
                  }
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Nearby Places Section */}
      <ScrollView contentContainerStyle={styles.nearbyContainer} showsVerticalScrollIndicator={false}>
        <Text style={[styles.nearbyTitle, { color: colors.onSurface }]}>Nearby for Riders</Text>
        
        {nearbyPOIs.length === 0 ? (
          <View style={styles.emptyPOI}>
            <Text style={{ color: colors.onSurfaceVariant }}>No locations found for this category.</Text>
          </View>
        ) : (
          <View style={styles.poiList}>
            {nearbyPOIs.map((poi) => (
              <View key={poi.id} style={[styles.poiCard, { backgroundColor: colors.surface }, shadows.level1]}>
                <View style={[styles.poiIconBox, { backgroundColor: `${poi.color}15` }]}>
                  <FontAwesome6 name={poi.icon} size={18} color={poi.color} />
                </View>
                <View style={styles.poiInfo}>
                  <Text style={[styles.poiName, { color: colors.onSurface }]}>{poi.name}</Text>
                  <Text style={[styles.poiMeta, { color: colors.onSurfaceVariant }]}>
                    {poi.category} • {poi.distance} • <FontAwesome6 name="star" size={12} color="#F1C40F" /> {poi.rating}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={[styles.navBtn, { backgroundColor: colors.primaryContainer }]}
                  onPress={() => handleNavigate(poi)}
                >
                  <FontAwesome6 name="diamond-turn-right" size={16} color={colors.onPrimaryContainer} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapWrap: {
    height: 320,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  floatingSearch: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: theme.shapes.full,
    paddingLeft: 16,
    paddingRight: 4,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: theme.typography.sizes.bodyLarge,
    fontFamily: theme.typography.fontFamily,
    padding: 0,
  },
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: theme.shapes.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locateFab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: theme.shapes.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: theme.shapes.small,
    borderWidth: 1,
    height: 38,
  },
  chipText: {
    fontSize: theme.typography.sizes.bodyMedium,
    fontWeight: '500',
  },
  nearbyContainer: {
    paddingHorizontal: 16,
    paddingBottom: 96,
  },
  nearbyTitle: {
    fontSize: theme.typography.sizes.titleMedium,
    fontWeight: '700',
    marginBottom: 12,
  },
  emptyPOI: {
    padding: 24,
    alignItems: 'center',
  },
  poiList: {
    gap: 12,
  },
  poiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: theme.shapes.large,
  },
  poiIconBox: {
    width: 44,
    height: 44,
    borderRadius: theme.shapes.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  poiInfo: {
    flex: 1,
  },
  poiName: {
    fontSize: theme.typography.sizes.bodyLarge,
    fontWeight: '700',
  },
  poiMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: theme.shapes.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

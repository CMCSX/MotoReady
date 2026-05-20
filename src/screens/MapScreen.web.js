import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { theme } from '../styles/theme';

export default function MapScreen({ isDarkMode }) {
  const currentTheme = isDarkMode ? theme.dark : theme.light;
  const colors = currentTheme.colors;
  const shadows = currentTheme.shadows;

  const [currentLoc, setCurrentLoc] = useState({
    latitude: 14.5995, // Default Manila
    longitude: 120.9842,
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [nearbyPOIs, setNearbyPOIs] = useState([]);
  const [poiCache, setPoiCache] = useState([]);

  const categories = ['All', 'Parking', 'Fuel', 'Food', 'Repair'];

  useEffect(() => {
    getUserLocation();
  }, []);

  useEffect(() => {
    fetchNearbyPOIs(currentLoc.latitude, currentLoc.longitude);
  }, [currentLoc.latitude, currentLoc.longitude]);

  useEffect(() => {
    if (selectedCategory === 'All') {
      setNearbyPOIs(poiCache);
    } else {
      setNearbyPOIs(poiCache.filter(p => p.category === selectedCategory));
    }
  }, [selectedCategory, poiCache]);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const fetchNearbyPOIs = async (lat, lon) => {
    setLoading(true);
    const radius = 2500; // 2.5km search radius
    const query = `[out:json][timeout:15];
(
  node["amenity"="motorcycle_parking"](around:${radius},${lat},${lon});
  node["amenity"="parking"](around:${radius},${lat},${lon});
  node["amenity"="fuel"](around:${radius},${lat},${lon});
  node["amenity"="restaurant"](around:${radius},${lat},${lon});
  node["amenity"="cafe"](around:${radius},${lat},${lon});
  node["shop"="motorcycle"](around:${radius},${lat},${lon});
  node["shop"="car_repair"](around:${radius},${lat},${lon});
);
out body 30;`;

    try {
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      const data = await response.json();
      if (data && data.elements && data.elements.length > 0) {
        const parsed = data.elements.map((el, idx) => {
          let category = 'Parking';
          let icon = 'square-parking';
          let color = '#2E7D32';

          if (el.tags.amenity === 'fuel') {
            category = 'Fuel';
            icon = 'gas-pump';
            color = '#BA1A1A';
          } else if (['restaurant', 'cafe', 'fast_food', 'bar'].includes(el.tags.amenity)) {
            category = 'Food';
            icon = 'utensils';
            color = '#1A237E';
          } else if (el.tags.shop === 'motorcycle' || el.tags.shop === 'car_repair') {
            category = 'Repair';
            icon = 'wrench';
            color = '#E67E22';
          }

          const dist = calculateDistance(lat, lon, el.lat, el.lon);
          const ratingSeed = (el.id % 10) / 10;
          const rating = (4.0 + ratingSeed * 1.0).toFixed(1);

          return {
            id: `osm_${el.id || idx}`,
            name: el.tags.name || el.tags.brand || `${category} Service`,
            category,
            latitude: el.lat,
            longitude: el.lon,
            distance: dist < 1000 ? `${Math.round(dist)}m` : `${(dist / 1000).toFixed(1)}km`,
            distVal: dist,
            rating: parseFloat(rating),
            icon,
            color,
          };
        });

        parsed.sort((a, b) => a.distVal - b.distVal);
        setPoiCache(parsed);
      } else {
        generateFallbackPOIs(lat, lon);
      }
    } catch (err) {
      console.warn("OSM Overpass query failed on web, using fallbacks:", err);
      generateFallbackPOIs(lat, lon);
    } finally {
      setLoading(false);
    }
  };

  const generateFallbackPOIs = (lat, lon) => {
    const fallbackList = [
      {
        id: 'poi_1',
        name: 'MotoReady Safe Park',
        category: 'Parking',
        latitude: lat + 0.003,
        longitude: lon + 0.002,
        distance: '450m',
        distVal: 450,
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
        distVal: 620,
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
        distVal: 750,
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
        distVal: 310,
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
        distVal: 900,
        rating: 4.2,
        icon: 'square-parking',
        color: '#2E7D32',
      }
    ];
    setPoiCache(fallbackList);
  };

  const getUserLocation = async () => {
    setLoading(true);
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setCurrentLoc({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
            setLoading(false);
          },
          () => {
            setLoading(false);
          }
        );
      } else {
        setLoading(false);
      }
    } catch (err) {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'en' }
      });
      const data = await res.json();
      if (data && data.length > 0) {
        setCurrentLoc({
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
        });
      } else {
        alert(`Could not find "${searchQuery}"`);
      }
    } catch (err) {
      alert("Location search failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (poi) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${poi.latitude},${poi.longitude}`;
    window.open(url, '_blank');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* Web Map view using an iframe wrapper */}
      <View style={styles.mapWrap}>
        <iframe
          src={`https://maps.google.com/maps?q=${currentLoc.latitude},${currentLoc.longitude}&z=14&output=embed`}
          style={{ width: '100%', height: '100%', border: 0 }}
          title="Map View"
        />

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
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.nearbyContainer} showsVerticalScrollIndicator={false}>
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

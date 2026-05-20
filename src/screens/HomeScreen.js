import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Polyline, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { weather } from '../modules/weather';
import { gearLogic } from '../modules/gearLogic';
import { db } from '../modules/storage';
import { theme } from '../styles/theme';

export default function HomeScreen({ isDarkMode, navigation }) {
  const currentTheme = isDarkMode ? theme.dark : theme.light;
  const colors = currentTheme.colors;
  const shadows = currentTheme.shadows;

  const mapRef = useRef(null);
  const detailMapRef = useRef(null);
  const subscriptionRef = useRef(null);
  const timerRef = useRef(null);

  // Weather & Gear State
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [gearRecommendations, setGearRecommendations] = useState([]);
  const [weatherError, setWeatherError] = useState(null);
  const [showWeatherSearch, setShowWeatherSearch] = useState(false);
  const [weatherCity, setWeatherCity] = useState('');
  const [isWeatherExpanded, setIsWeatherExpanded] = useState(false);

  // Ride Tracker State
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [path, setPath] = useState([]);
  const [elapsedTime, setElapsedTime] = useState(0); // seconds
  const [distance, setDistance] = useState(0); // km
  const [currentSpeed, setCurrentSpeed] = useState(0); // km/h
  const [history, setHistory] = useState([]);
  const [showIntroBanner, setShowIntroBanner] = useState(true);
  const [profileName, setProfileName] = useState('Moto Rider');
  const [currentLocation, setCurrentLocation] = useState(null);
  
  // Save Dialog State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [rideTitle, setRideTitle] = useState('');

  // Past Ride Detail Modal State
  const [selectedRide, setSelectedRide] = useState(null);

  const getInitials = (name) => {
    if (!name) return 'R';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const loadUserProfileName = async () => {
    try {
      const data = await db.getProfile();
      if (data && data.fullName) {
        setProfileName(data.fullName);
      }
    } catch (e) {
      console.log('Error loading profile name:', e);
    }
  };

  useEffect(() => {
    loadWeatherData();
    loadRidesHistory();
    getCurrentUserLocation();
    loadUserProfileName();
    return () => {
      stopGPSWatch();
      stopTimer();
    };
  }, []);

  useEffect(() => {
    if (!navigation) return;
    const unsubscribe = navigation.addListener('focus', () => {
      setShowIntroBanner(true);
      loadUserProfileName();
    });
    return unsubscribe;
  }, [navigation]);

  const loadRidesHistory = async () => {
    const list = await db.getRides();
    setHistory(list);
  };

  const loadWeatherData = async () => {
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      const data = await weather.getWeather();
      setWeatherData(data);
      const recs = gearLogic.getGearRecommendations(data);
      setGearRecommendations(recs);
    } catch (err) {
      console.warn(err);
      setWeatherError(
        err.message === 'LOCATION_UNAVAILABLE'
          ? 'Location unavailable. Search city manually.'
          : 'Failed to load weather data.'
      );
    } finally {
      setWeatherLoading(false);
    }
  };

  const handleManualWeatherSearch = async () => {
    if (!weatherCity.trim()) return;
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      const data = await weather.getWeatherForCity(weatherCity);
      setWeatherData(data);
      const recs = gearLogic.getGearRecommendations(data);
      setGearRecommendations(recs);
      setShowWeatherSearch(false);
      setWeatherCity('');
    } catch (err) {
      setWeatherError(err.message || 'City not found.');
    } finally {
      setWeatherLoading(false);
    }
  };

  const getCurrentUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coord = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setCurrentLocation(coord);
      mapRef.current?.animateToRegion({
        ...coord,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 800);
    } catch (err) {
      console.log('Error getting location', err);
    }
  };

  // GPS Tracking Logic
  const startGPSWatch = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Denied", "MotoReady requires location permissions to track your rides.");
        return;
      }

      subscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 2000,
          distanceInterval: 3,
        },
        (location) => {
          const { latitude, longitude, speed } = location.coords;
          const newCoord = { latitude, longitude, timestamp: location.timestamp };
          setCurrentLocation(newCoord);

          const speedKmH = speed ? speed * 3.6 : 0;
          setCurrentSpeed(speedKmH);

          setPath((prevPath) => {
            const updatedPath = [...prevPath, newCoord];
            
            if (prevPath.length > 0) {
              const last = prevPath[prevPath.length - 1];
              const distAdded = getDistance(last.latitude, last.longitude, latitude, longitude);
              setDistance((prevDist) => prevDist + distAdded);
            }

            // Animate map view to follow the rider
            mapRef.current?.animateToRegion({
              latitude,
              longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }, 500);

            return updatedPath;
          });
        }
      );
    } catch (err) {
      console.log('Watch Position Error', err);
    }
  };

  const stopGPSWatch = () => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
    setCurrentSpeed(0);
  };

  // Timer logic
  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Haversine formula
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleStartRide = () => {
    setIsRecording(true);
    setIsPaused(false);
    setPath([]);
    setDistance(0);
    setElapsedTime(0);
    startGPSWatch();
    startTimer();
  };

  const handlePauseResumeRide = () => {
    if (isPaused) {
      setIsPaused(false);
      startGPSWatch();
      startTimer();
    } else {
      setIsPaused(true);
      stopGPSWatch();
      stopTimer();
    }
  };

  const handleStopRide = () => {
    stopGPSWatch();
    stopTimer();
    setRideTitle(`Ride on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    setShowSaveModal(true);
  };

  const handleSaveRide = async () => {
    const avgSpeed = elapsedTime > 0 ? (distance / (elapsedTime / 3600)) : 0;
    
    await db.addRide(rideTitle, distance.toFixed(2), elapsedTime, avgSpeed.toFixed(1), path);
    
    setIsRecording(false);
    setIsPaused(false);
    setPath([]);
    setDistance(0);
    setElapsedTime(0);
    setShowSaveModal(false);
    loadRidesHistory();
  };

  const handleDeleteRide = async (id) => {
    Alert.alert(
      "Delete Ride",
      "Are you sure you want to delete this ride permanently?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            await db.deleteRide(id);
            loadRidesHistory();
          }
        }
      ]
    );
  };

  const formatElapsedTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h > 0 ? h + ':' : ''}${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
  };

  const formatDurationText = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  const getPriorityColor = (priority) => {
    switch (priority.toLowerCase()) {
      case 'critical': return colors.error;
      case 'high': return colors.warning;
      case 'medium': return colors.primary;
      default: return colors.secondary;
    }
  };

  const getPriorityBg = (priority) => {
    switch (priority.toLowerCase()) {
      case 'critical': return colors.errorContainer;
      case 'high': return colors.warningContainer;
      case 'medium': return colors.primaryContainer;
      default: return colors.secondaryContainer;
    }
  };

  const getPriorityTextColor = (priority) => {
    switch (priority.toLowerCase()) {
      case 'critical': return colors.onErrorContainer;
      case 'high': return colors.onWarningContainer;
      case 'medium': return colors.onPrimaryContainer;
      default: return colors.onSecondaryContainer;
    }
  };

  const getWeatherTheme = (weather) => {
    if (!weather) return { bg: colors.surfaceContainer, text: colors.onSurface, label: colors.onSurfaceVariant, borderColor: colors.outlineVariant };
    
    const temp = weather.temperature;
    const rainChance = weather.rainChance || 0;
    const desc = (weather.description || '').toLowerCase();
    
    if (rainChance > 40 || desc.includes('rain') || desc.includes('drizzle') || desc.includes('shower') || desc.includes('storm')) {
      // Wet/Rainy Theme (Soft blue/indigo)
      return {
        bg: isDarkMode ? 'rgba(30, 58, 138, 0.3)' : 'rgba(219, 234, 254, 0.7)',
        text: isDarkMode ? '#93C5FD' : '#1E40AF',
        label: isDarkMode ? '#BFDBFE' : '#2563EB',
        borderColor: isDarkMode ? 'rgba(30, 58, 138, 0.6)' : '#BFDBFE',
      };
    }
    
    if (temp <= 12) {
      // Cold Ice Theme (Soft teal/cyan)
      return {
        bg: isDarkMode ? 'rgba(17, 94, 89, 0.3)' : 'rgba(204, 251, 241, 0.7)',
        text: isDarkMode ? '#99F6E4' : '#115E59',
        label: isDarkMode ? '#CCFBF1' : '#0D9488',
        borderColor: isDarkMode ? 'rgba(17, 94, 89, 0.6)' : '#99F6E4',
      };
    }
    
    if (temp >= 29) {
      // Hot Sun Theme (Soft amber/orange)
      return {
        bg: isDarkMode ? 'rgba(120, 53, 4, 0.3)' : 'rgba(254, 243, 199, 0.7)',
        text: isDarkMode ? '#FDE047' : '#92400E',
        label: isDarkMode ? '#FEF08A' : '#D97706',
        borderColor: isDarkMode ? 'rgba(120, 53, 4, 0.6)' : '#FCD34D',
      };
    }
    
    // Nice Standard Ride Weather (Soft green/emerald)
    return {
      bg: isDarkMode ? 'rgba(6, 78, 59, 0.3)' : 'rgba(209, 250, 229, 0.7)',
      text: isDarkMode ? '#6EE7B7' : '#065F46',
      label: isDarkMode ? '#A7F3D0' : '#059669',
      borderColor: isDarkMode ? 'rgba(6, 78, 59, 0.6)' : '#A7F3D0',
    };
  };

  const animateToRideBoundaries = (ridePath) => {
    if (!ridePath || ridePath.length === 0) return;
    
    // Fit Map coordinates
    setTimeout(() => {
      detailMapRef.current?.fitToCoordinates(ridePath, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
    }, 400);
  };

  const weatherTheme = getWeatherTheme(weatherData);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>MotoReady</Text>
            <Text style={[styles.title, { color: colors.onSurface }]}>Ride Dashboard</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={[styles.profileCircle, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={styles.profileCircleText}>{getInitials(profileName)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showIntroBanner && (
          <View style={[styles.infoBanner, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}25` }]}>
            <View style={styles.infoBannerContent}>
              <View style={styles.infoBannerHeader}>
                <FontAwesome6 name="circle-play" size={15} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.infoBannerTitle, { color: colors.onSurface }]}>Ride Recording Feature</Text>
              </View>
              <Text style={[styles.infoBannerDescription, { color: colors.onSurfaceVariant }]}>
                Track your journeys in real time. Use the controls to map your active route, track live speeds, distance, and elapsed duration. Saving your finished ride builds your activity log below.
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.infoBannerCloseBtn}
              onPress={() => setShowIntroBanner(false)}
            >
              <FontAwesome6 name="xmark" size={14} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
        )}

        {/* Live Ride Console */}
        <View style={styles.consoleGrid}>
          
          {/* Native MapView */}
          <View style={[styles.mapContainer, shadows.level1, { borderColor: colors.outlineVariant }]}>
            <MapView
              ref={mapRef}
              style={StyleSheet.absoluteFillObject}
              showsUserLocation={!isRecording}
              showsMyLocationButton={!isRecording}
              initialRegion={{
                latitude: currentLocation?.latitude || 14.5995,
                longitude: currentLocation?.longitude || 120.9842,
                latitudeDelta: 0.015,
                longitudeDelta: 0.015,
              }}
            >
              {path.length > 0 && (
                <Polyline
                  coordinates={path}
                  strokeColor="#FF5722"
                  strokeWidth={6}
                />
              )}
              {path.length > 0 && (
                <Circle
                  center={path[0]}
                  radius={20}
                  fillColor="rgba(46, 125, 50, 0.8)"
                  strokeColor="#FFF"
                  strokeWidth={2}
                />
              )}
              {currentLocation && isRecording && (
                <Circle
                  center={currentLocation}
                  radius={15}
                  fillColor="rgba(255, 87, 34, 0.9)"
                  strokeColor="#FFF"
                  strokeWidth={2}
                />
              )}
            </MapView>
          </View>

          {/* Metrics Panel */}
          <View style={[styles.metricsContainer, { backgroundColor: colors.surface }, shadows.level1]}>
            <View style={styles.statsDisplay}>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: colors.onSurface }]}>
                  {distance.toFixed(2)}
                </Text>
                <Text style={[styles.statTitle, { color: colors.onSurfaceVariant }]}>Distance (km)</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: colors.onSurface }]}>
                  {formatElapsedTime(elapsedTime)}
                </Text>
                <Text style={[styles.statTitle, { color: colors.onSurfaceVariant }]}>Duration</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: colors.onSurface }]}>
                  {currentSpeed.toFixed(1)}
                </Text>
                <Text style={[styles.statTitle, { color: colors.onSurfaceVariant }]}>Speed (km/h)</Text>
              </View>
            </View>

            {/* Tracking Controls */}
            <View style={styles.controlRow}>
              {!isRecording ? (
                <TouchableOpacity 
                  style={[styles.actionButton, styles.startBtn, shadows.level2]} 
                  onPress={handleStartRide}
                >
                  <FontAwesome6 name="play" size={18} color="#FFF" />
                  <Text style={styles.actionBtnText}>Start Ride</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ flexDirection: 'row', gap: 12, flex: 1 }}>
                  <TouchableOpacity 
                    style={[styles.actionButton, isPaused ? styles.resumeBtn : styles.pauseBtn, { flex: 1 }]} 
                    onPress={handlePauseResumeRide}
                  >
                    <FontAwesome6 name={isPaused ? "play" : "pause"} size={16} color="#FFF" />
                    <Text style={styles.actionBtnText}>{isPaused ? "Resume" : "Pause"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.stopBtn, { flex: 1 }]} 
                    onPress={handleStopRide}
                  >
                    <FontAwesome6 name="stop" size={16} color="#FFF" />
                    <Text style={styles.actionBtnText}>Finish</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Recent Rides List */}
        <Text style={[styles.sectionTitle, { color: colors.onSurface, marginTop: 24 }]}>Recent Ride Activity</Text>
        {history.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: colors.surface }, shadows.level1]}>
            <FontAwesome6 name="route" size={40} color={`${colors.onSurfaceVariant}44`} style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>No rides recorded yet. Click Start Ride above to begin!</Text>
          </View>
        ) : (
          <View style={styles.ridesList}>
            {history.map((ride) => (
              <TouchableOpacity 
                key={ride.id} 
                style={[styles.rideCard, { backgroundColor: colors.surface }, shadows.level1]}
                onPress={() => {
                  setSelectedRide(ride);
                  animateToRideBoundaries(ride.path);
                }}
              >
                <View style={styles.rideCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rideCardTitle, { color: colors.onSurface }]} numberOfLines={1}>
                      {ride.title}
                    </Text>
                    <Text style={[styles.rideCardDate, { color: colors.onSurfaceVariant }]}>
                      {new Date(ride.timestamp).toLocaleDateString()} at {new Date(ride.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => handleDeleteRide(ride.id)} 
                    style={styles.deleteRideBtn}
                  >
                    <FontAwesome6 name="trash-can" size={14} color={colors.error} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.rideCardStats}>
                  <View style={styles.rideMiniStat}>
                    <Text style={[styles.miniStatValue, { color: colors.primary }]}>{ride.distance.toFixed(2)} km</Text>
                    <Text style={[styles.miniStatLabel, { color: colors.onSurfaceVariant }]}>Distance</Text>
                  </View>
                  <View style={styles.rideMiniStat}>
                    <Text style={[styles.miniStatValue, { color: colors.onSurface }]}>{formatDurationText(ride.duration)}</Text>
                    <Text style={[styles.miniStatLabel, { color: colors.onSurfaceVariant }]}>Duration</Text>
                  </View>
                  <View style={styles.rideMiniStat}>
                    <Text style={[styles.miniStatValue, { color: colors.onSurface }]}>{ride.avgSpeed} km/h</Text>
                    <Text style={[styles.miniStatLabel, { color: colors.onSurfaceVariant }]}>Avg Speed</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Weather & Riding Gear */}
        <Text style={[styles.sectionTitle, { color: colors.onSurface, marginTop: 24 }]}>Weather & Riding Gear</Text>
        <View style={[styles.weatherCardWidget, { backgroundColor: colors.surface, marginBottom: 16 }, shadows.level1]}>
          <View style={styles.weatherCardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <FontAwesome6 name={weatherData ? weatherData.icon : "cloud-sun"} size={18} color={colors.primary} />
              <Text style={[styles.weatherCardTitleText, { color: colors.onSurface }]} numberOfLines={1}>
                {weatherData 
                  ? `${weatherData.location} • ${weatherData.temperature}°C, ${weatherData.description}` 
                  : "Checking Weather & Gear..."}
              </Text>
            </View>
            <View style={styles.weatherActions}>
              <TouchableOpacity 
                style={[styles.iconBtn, { backgroundColor: colors.surfaceContainerHigh }]} 
                onPress={() => setShowWeatherSearch(!showWeatherSearch)}
              >
                <FontAwesome6 name="location-dot" size={14} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.iconBtn, { backgroundColor: colors.surfaceContainerHigh }]} 
                onPress={loadWeatherData}
                disabled={weatherLoading}
              >
                {weatherLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <FontAwesome6 name="rotate" size={12} color={colors.primary} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {showWeatherSearch && (
            <View style={[styles.searchBar, { borderColor: colors.outlineVariant, marginTop: 12 }]}>
              <TextInput
                style={[styles.searchInput, { color: colors.onSurface }]}
                placeholder="Enter city manually…"
                placeholderTextColor={`${colors.onSurfaceVariant}99`}
                value={weatherCity}
                onChangeText={setWeatherCity}
                onSubmitEditing={handleManualWeatherSearch}
              />
              <TouchableOpacity 
                style={[styles.searchSubmitBtn, { backgroundColor: colors.primary }]}
                onPress={handleManualWeatherSearch}
              >
                <FontAwesome6 name="arrow-right" size={14} color={colors.onPrimary} />
              </TouchableOpacity>
            </View>
          )}

          {weatherError && (
            <View style={[styles.errorCard, { backgroundColor: colors.errorContainer, marginTop: 12 }]}>
              <Text style={{ color: colors.onErrorContainer, fontSize: 13 }}>{weatherError}</Text>
            </View>
          )}

          {weatherData && (
            <View>
              {/* Weather Metrics Box */}
              <View style={[styles.expandedWeatherDetails, { backgroundColor: weatherTheme.bg, borderColor: weatherTheme.borderColor, borderWidth: 1 }]}>
                <View style={styles.weatherDetailItem}>
                  <Text style={[styles.weatherDetailVal, { color: weatherTheme.text }]}>{weatherData.feelsLike}°C</Text>
                  <Text style={[styles.weatherDetailLbl, { color: weatherTheme.label }]}>Feels Like</Text>
                </View>
                <View style={styles.weatherDetailItem}>
                  <Text style={[styles.weatherDetailVal, { color: weatherTheme.text }]}>{weatherData.windSpeed} km/h</Text>
                  <Text style={[styles.weatherDetailLbl, { color: weatherTheme.label }]}>Wind</Text>
                </View>
                <View style={styles.weatherDetailItem}>
                  <Text style={[styles.weatherDetailVal, { color: weatherTheme.text }]}>{weatherData.humidity}%</Text>
                  <Text style={[styles.weatherDetailLbl, { color: weatherTheme.label }]}>Humidity</Text>
                </View>
              </View>

              {/* Divider */}
              <View style={[styles.widgetDivider, { backgroundColor: colors.outlineVariant }]} />

              {/* Riding Gear List */}
              <Text style={[styles.gearSectionSubheading, { color: colors.onSurface }]}>Recommended Riding Gear Checklist</Text>
              <View style={styles.gearListVertical}>
                {gearRecommendations.map((item, index) => (
                  <View 
                    key={index} 
                    style={[
                      styles.gearRowItem, 
                      { backgroundColor: colors.surfaceContainer, borderLeftColor: getPriorityColor(item.priority) }
                    ]}
                  >
                    <View style={[styles.gearIconContainer, { backgroundColor: `${item.color}15` }]}>
                      <FontAwesome6 name={item.icon} size={15} color={item.color} />
                    </View>
                    <View style={styles.gearTextContainer}>
                      <View style={styles.gearMetaRow}>
                        <Text style={[styles.gearItemName, { color: colors.onSurface }]}>{item.item}</Text>
                        <View style={[styles.priorityBadge, { backgroundColor: getPriorityBg(item.priority) }]}>
                          <Text style={[styles.priorityBadgeText, { color: getPriorityTextColor(item.priority) }]}>
                            {item.priority.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.gearReasonText, { color: colors.onSurfaceVariant }]}>{item.reason}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

      </ScrollView>

      {/* Save Ride Modal Dialog */}
      <Modal
        visible={showSaveModal}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.onSurface }]}>Save Ride Summary</Text>
            
            <View style={[styles.modalStatsSummary, { backgroundColor: colors.surfaceContainer }]}>
              <View style={styles.modalStatCol}>
                <Text style={[styles.modalStatVal, { color: colors.primary }]}>{distance.toFixed(2)} km</Text>
                <Text style={{ fontSize: 10, color: colors.onSurfaceVariant }}>Distance</Text>
              </View>
              <View style={styles.modalStatCol}>
                <Text style={[styles.modalStatVal, { color: colors.onSurface }]}>{formatElapsedTime(elapsedTime)}</Text>
                <Text style={{ fontSize: 10, color: colors.onSurfaceVariant }}>Time</Text>
              </View>
            </View>

            <Text style={[styles.modalLabel, { color: colors.onSurface }]}>Name your ride</Text>
            <TextInput
              style={[styles.modalInput, { borderColor: colors.outlineVariant, color: colors.onSurface, backgroundColor: colors.surfaceContainer }]}
              value={rideTitle}
              onChangeText={setRideTitle}
              placeholder="e.g. Afternoon Ride, Sunday Cruise"
              placeholderTextColor={`${colors.onSurfaceVariant}99`}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: colors.secondaryContainer }]}
                onPress={() => setShowSaveModal(false)}
              >
                <Text style={{ color: colors.onSecondaryContainer, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveRide}
              >
                <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>Save Ride</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Past Ride Detail Modal */}
      {selectedRide && (
        <Modal
          visible={true}
          transparent
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.detailModalCard, { backgroundColor: colors.background }]}>
              {/* Modal Header */}
              <View style={[styles.detailModalHeader, { backgroundColor: colors.surface }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.detailModalTitle, { color: colors.onSurface }]} numberOfLines={1}>
                    {selectedRide.title}
                  </Text>
                  <Text style={[styles.detailModalSub, { color: colors.onSurfaceVariant }]}>
                    {new Date(selectedRide.timestamp).toLocaleDateString()} • {new Date(selectedRide.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={[styles.closeModalBtn, { backgroundColor: colors.surfaceContainer }]}
                  onPress={() => setSelectedRide(null)}
                >
                  <FontAwesome6 name="xmark" size={16} color={colors.onSurface} />
                </TouchableOpacity>
              </View>

              {/* Modal Map */}
              <View style={[styles.detailModalMap, { borderColor: colors.outlineVariant }]}>
                <MapView
                  ref={detailMapRef}
                  style={StyleSheet.absoluteFillObject}
                  initialRegion={{
                    latitude: selectedRide.path[0]?.latitude || 14.5995,
                    longitude: selectedRide.path[0]?.longitude || 120.9842,
                    latitudeDelta: 0.015,
                    longitudeDelta: 0.015,
                  }}
                >
                  {selectedRide.path.length > 0 && (
                    <Polyline
                      coordinates={selectedRide.path}
                      strokeColor="#FF5722"
                      strokeWidth={6}
                    />
                  )}
                  {selectedRide.path.length > 0 && (
                    <Circle
                      center={selectedRide.path[0]}
                      radius={25}
                      fillColor="rgba(46, 125, 50, 0.8)"
                      strokeColor="#FFF"
                      strokeWidth={2}
                    />
                  )}
                  {selectedRide.path.length > 0 && (
                    <Circle
                      center={selectedRide.path[selectedRide.path.length - 1]}
                      radius={25}
                      fillColor="rgba(255, 87, 34, 0.9)"
                      strokeColor="#FFF"
                      strokeWidth={2}
                    />
                  )}
                </MapView>
              </View>

              {/* Modal Stats */}
              <View style={[styles.detailModalStats, { backgroundColor: colors.surface }]}>
                <View style={styles.detailStatBox}>
                  <Text style={[styles.detailStatVal, { color: colors.primary }]}>{selectedRide.distance.toFixed(2)} km</Text>
                  <Text style={[styles.detailStatLabel, { color: colors.onSurfaceVariant }]}>Distance</Text>
                </View>
                <View style={styles.detailStatBox}>
                  <Text style={[styles.detailStatVal, { color: colors.onSurface }]}>{formatDurationText(selectedRide.duration)}</Text>
                  <Text style={[styles.detailStatLabel, { color: colors.onSurfaceVariant }]}>Duration</Text>
                </View>
                <View style={styles.detailStatBox}>
                  <Text style={[styles.detailStatVal, { color: colors.onSurface }]}>{selectedRide.avgSpeed} km/h</Text>
                  <Text style={[styles.detailStatLabel, { color: colors.onSurfaceVariant }]}>Avg Speed</Text>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 96,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: theme.typography.sizes.eyebrow,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: theme.typography.sizes.titleLarge,
    fontWeight: '800',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  profileCircleText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  weatherCardWidget: {
    borderRadius: theme.shapes.large,
    padding: 16,
    marginTop: 12,
  },
  weatherCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weatherCardTitleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  weatherActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: theme.shapes.small,
    height: 48,
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 4,
  },
  searchSubmitBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCard: {
    padding: 10,
    borderRadius: theme.shapes.small,
    marginBottom: 8,
  },
  infoBanner: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: theme.shapes.medium,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  infoBannerContent: {
    flex: 1,
    marginRight: 12,
  },
  infoBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  infoBannerDescription: {
    fontSize: 11,
    lineHeight: 15,
  },
  infoBannerCloseBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedWeatherDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: theme.shapes.medium,
  },
  weatherDetailItem: {
    alignItems: 'center',
    flex: 1,
  },
  weatherDetailVal: {
    fontSize: 14,
    fontWeight: '700',
  },
  weatherDetailLbl: {
    fontSize: 10,
    marginTop: 2,
  },
  widgetDivider: {
    height: 1,
    marginVertical: 16,
  },
  gearSectionSubheading: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gearListVertical: {
    gap: 8,
  },
  gearRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: theme.shapes.medium,
    borderLeftWidth: 4,
  },
  gearIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  gearTextContainer: {
    flex: 1,
  },
  gearMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  gearItemName: {
    fontSize: 13,
    fontWeight: '700',
  },
  priorityBadge: {
    paddingVertical: 1,
    paddingHorizontal: 5,
    borderRadius: 4,
  },
  priorityBadgeText: {
    fontSize: 8,
    fontWeight: '800',
  },
  gearReasonText: {
    fontSize: 11,
    lineHeight: 14,
  },
  consoleGrid: {
    flexDirection: 'column',
    gap: 16,
  },
  mapContainer: {
    height: 280,
    borderRadius: theme.shapes.large,
    borderWidth: 1,
    overflow: 'hidden',
  },
  metricsContainer: {
    borderRadius: theme.shapes.large,
    padding: 18,
  },
  statsDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  statTitle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  controlRow: {
    flexDirection: 'row',
  },
  actionButton: {
    height: 48,
    borderRadius: theme.shapes.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startBtn: {
    backgroundColor: '#FF5722',
    flex: 1,
  },
  pauseBtn: {
    backgroundColor: '#F57C00',
  },
  resumeBtn: {
    backgroundColor: '#4CAF50',
  },
  stopBtn: {
    backgroundColor: '#D32F2F',
  },
  actionBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.titleMedium,
    fontWeight: '700',
    marginBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
    borderRadius: theme.shapes.large,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  ridesList: {
    gap: 12,
  },
  rideCard: {
    padding: 14,
    borderRadius: theme.shapes.large,
  },
  rideCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  rideCardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  rideCardDate: {
    fontSize: 11,
    marginTop: 2,
  },
  deleteRideBtn: {
    padding: 12,
  },
  rideCardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 10,
  },
  rideMiniStat: {
    alignItems: 'center',
    flex: 1,
  },
  miniStatValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  miniStatLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: theme.shapes.large,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalStatsSummary: {
    flexDirection: 'row',
    borderRadius: theme.shapes.medium,
    padding: 12,
    marginBottom: 16,
  },
  modalStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  modalStatVal: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: theme.shapes.small,
    height: 40,
    paddingHorizontal: 10,
    fontSize: 14,
    marginBottom: 20,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: theme.shapes.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailModalCard: {
    width: '100%',
    height: '90%',
    maxHeight: 700,
    maxWidth: 480,
    borderRadius: theme.shapes.large,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  detailModalHeader: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  detailModalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  detailModalSub: {
    fontSize: 11,
    marginTop: 2,
  },
  closeModalBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailModalMap: {
    flex: 1,
    borderBottomWidth: 1,
  },
  detailModalStats: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  detailStatBox: {
    flex: 1,
    alignItems: 'center',
  },
  detailStatVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  detailStatLabel: {
    fontSize: 10,
    marginTop: 2,
  }
});

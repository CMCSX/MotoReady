import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { weather } from '../modules/weather';
import { gearLogic } from '../modules/gearLogic';
import { db } from '../modules/storage';
import { theme } from '../styles/theme';

export default function HomeScreen({ isDarkMode, navigation }) {
  const currentTheme = isDarkMode ? theme.dark : theme.light;
  const colors = currentTheme.colors;
  const shadows = currentTheme.shadows;

  const iframeRef = useRef(null);
  const watchIdRef = useRef(null);
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
  
  // Save Dialog State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [rideTitle, setRideTitle] = useState('');

  // Past Ride Detail Modal State
  const [selectedRide, setSelectedRide] = useState(null);
  const detailIframeRef = useRef(null);

  // Leaflet Map srcDoc HTML
  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style>
        html, body, #map {
          height: 100%;
          margin: 0;
          padding: 0;
          background: #f0f0f5;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script>
        var map = L.map('map', { zoomControl: false }).setView([14.5995, 120.9842], 15);
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap'
        }).addTo(map);

        var activePolyline = null;
        var startMarker = null;
        var currentMarker = null;

        window.addEventListener('message', function(event) {
          const data = event.data;
          if (!data) return;

          if (data.type === 'updatePath') {
            const path = data.path;
            if (!path || path.length === 0) {
              if (activePolyline) { map.removeLayer(activePolyline); activePolyline = null; }
              if (startMarker) { map.removeLayer(startMarker); startMarker = null; }
              if (currentMarker) { map.removeLayer(currentMarker); currentMarker = null; }
              return;
            }

            const latlngs = path.map(c => [c.latitude, c.longitude]);

            if (activePolyline) {
              activePolyline.setLatLngs(latlngs);
            } else {
              activePolyline = L.polyline(latlngs, { color: '#FF5722', weight: 6, opacity: 0.9 }).addTo(map);
            }

            if (latlngs.length > 0) {
              const startPt = latlngs[0];
              const latestPt = latlngs[latlngs.length - 1];

              if (!startMarker) {
                startMarker = L.circleMarker(startPt, {
                  radius: 8,
                  fillColor: '#2E7D32',
                  color: '#FFFFFF',
                  weight: 3,
                  fillOpacity: 1
                }).addTo(map).bindPopup('Start Point');
              }

              if (!currentMarker) {
                currentMarker = L.circleMarker(latestPt, {
                  radius: 8,
                  fillColor: '#FF5722',
                  color: '#FFFFFF',
                  weight: 3,
                  fillOpacity: 1
                }).addTo(map).bindPopup('Current Location');
              } else {
                currentMarker.setLatLng(latestPt);
              }

              map.setView(latestPt);
            }
          } else if (data.type === 'centerMap') {
            const center = data.center;
            if (center) {
              map.setView([center.latitude, center.longitude], 16);
              if (!currentMarker) {
                currentMarker = L.circleMarker([center.latitude, center.longitude], {
                  radius: 8,
                  fillColor: '#FF5722',
                  color: '#FFFFFF',
                  weight: 3,
                  fillOpacity: 1
                }).addTo(map);
              } else {
                currentMarker.setLatLng([center.latitude, center.longitude]);
              }
            }
          }
        });
      </script>
    </body>
    </html>
  `;

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

  // GPS Tracking Logic
  const startGPSWatch = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    // Centering map initially
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (iframeRef.current && iframeRef.current.contentWindow) {
          iframeRef.current.contentWindow.postMessage({
            type: 'centerMap',
            center: { latitude, longitude }
          }, '*');
        }
      },
      (err) => console.log('Init GPS Error', err)
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed } = position.coords;
        const newCoord = { latitude, longitude, timestamp: Date.now() };

        // Convert speed from m/s to km/h
        const speedKmH = speed ? speed * 3.6 : 0;
        setCurrentSpeed(speedKmH);

        setPath((prevPath) => {
          const updatedPath = [...prevPath, newCoord];
          
          // Calculate cumulative distance
          if (prevPath.length > 0) {
            const last = prevPath[prevPath.length - 1];
            const distAdded = getDistance(last.latitude, last.longitude, latitude, longitude);
            setDistance((prevDist) => prevDist + distAdded);
          }

          // Send updated path coordinates to Leaflet iframe
          if (iframeRef.current && iframeRef.current.contentWindow) {
            iframeRef.current.contentWindow.postMessage({
              type: 'updatePath',
              path: updatedPath
            }, '*');
          }

          return updatedPath;
        });
      },
      (err) => console.log('Watch Position Error', err),
      { enableHighAccuracy: true, distanceFilter: 2 }
    );
  };

  const stopGPSWatch = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
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

  // Simulation logic for quick testing
  const simulateGPSTrack = () => {
    if (!isRecording || isPaused) return;

    // Default coordinate near starting point
    let baseLat = path.length > 0 ? path[path.length - 1].latitude : 14.5995;
    let baseLon = path.length > 0 ? path[path.length - 1].longitude : 120.9842;

    // Generate random small movement
    const latDelta = (Math.random() - 0.5) * 0.0015;
    const lonDelta = (Math.random() - 0.5) * 0.0015;
    const newLat = baseLat + latDelta;
    const newLon = baseLon + lonDelta;

    const newCoord = { latitude: newLat, longitude: newLon, timestamp: Date.now() };
    setCurrentSpeed(25 + Math.random() * 15); // simulated speed: 25-40 km/h

    setPath((prevPath) => {
      const updatedPath = [...prevPath, newCoord];
      if (prevPath.length > 0) {
        const last = prevPath[prevPath.length - 1];
        const distAdded = getDistance(last.latitude, last.longitude, newLat, newLon);
        setDistance((prevDist) => prevDist + distAdded);
      }

      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage({
          type: 'updatePath',
          path: updatedPath
        }, '*');
      }
      return updatedPath;
    });
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
      // Resume
      setIsPaused(false);
      startGPSWatch();
      startTimer();
    } else {
      // Pause
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
    const durationMins = elapsedTime / 60;
    const avgSpeed = durationMins > 0 ? (distance / (elapsedTime / 3600)) : 0;
    
    await db.addRide(rideTitle, distance.toFixed(2), elapsedTime, avgSpeed.toFixed(1), path);
    
    // Reset state
    setIsRecording(false);
    setIsPaused(false);
    setPath([]);
    setDistance(0);
    setElapsedTime(0);
    setShowSaveModal(false);
    loadRidesHistory();

    // Clear iframe map drawing
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'updatePath', path: [] }, '*');
    }
  };

  const handleDeleteRide = async (id) => {
    const confirmDelete = window.confirm("Delete this ride record permanently?");
    if (confirmDelete) {
      await db.deleteRide(id);
      loadRidesHistory();
    }
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

  // When past ride modal is shown, pass coordinates to the secondary iframe
  useEffect(() => {
    if (selectedRide && detailIframeRef.current) {
      // Small timeout to allow iframe loading
      const timer = setTimeout(() => {
        if (detailIframeRef.current && detailIframeRef.current.contentWindow) {
          detailIframeRef.current.contentWindow.postMessage({
            type: 'updatePath',
            path: selectedRide.path
          }, '*');
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [selectedRide]);

  const weatherTheme = getWeatherTheme(weatherData);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>MotoReady</Text>
            <Text style={[styles.title, { color: colors.onSurface }]}>Ride Dashboard</Text>
          </View>
          <View style={styles.headerRight}>
            {isRecording && !isPaused && (
              <TouchableOpacity 
                style={[styles.simGpsBtn, { backgroundColor: colors.secondaryContainer }]}
                onPress={simulateGPSTrack}
              >
                <FontAwesome6 name="route" size={14} color={colors.onSecondaryContainer} />
                <Text style={[styles.simGpsBtnText, { color: colors.onSecondaryContainer }]}>Sim GPS</Text>
              </TouchableOpacity>
            )}
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
          
          {/* Map Column */}
          <View style={[styles.mapContainer, shadows.level1, { borderColor: colors.outlineVariant }]}>
            <iframe
              ref={iframeRef}
              srcDoc={mapHtml}
              style={{ width: '100%', height: '100%', border: 0 }}
              title="Ride Map"
            />
          </View>

          {/* Metrics Column */}
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
                onPress={() => setSelectedRide(ride)}
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
                <iframe
                  ref={detailIframeRef}
                  srcDoc={mapHtml}
                  style={{ width: '100%', height: '100%', border: 0 }}
                  title="Past Ride Path"
                />
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

    </View>
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
    fontWeight: '800',
    marginTop: 2,
  },
  simGpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: theme.shapes.full,
    gap: 6,
  },
  simGpsBtnText: {
    fontSize: 12,
    fontWeight: '700',
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
    height: 36,
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
    fontSize: theme.typography.sizes.bodyLarge,
    fontWeight: '700',
  },
  infoBannerDescription: {
    fontSize: theme.typography.sizes.bodyMedium,
    lineHeight: 18,
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
    fontSize: theme.typography.sizes.bodyLarge,
    fontWeight: '700',
  },
  weatherDetailLbl: {
    fontSize: 12,
    marginTop: 2,
  },
  gearCardWidget: {
    borderRadius: theme.shapes.large,
    padding: 16,
    marginTop: 16,
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
    fontSize: theme.typography.sizes.bodyLarge,
    fontWeight: '700',
  },
  priorityBadge: {
    paddingVertical: 1,
    paddingHorizontal: 5,
    borderRadius: 4,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  gearReasonText: {
    fontSize: theme.typography.sizes.bodyMedium,
    lineHeight: 18,
  },
  priorityTagText: {
    fontSize: 9,
    fontWeight: '800',
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
    fontSize: 12,
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
    fontSize: theme.typography.sizes.bodyMedium,
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
    fontSize: theme.typography.sizes.bodyLarge,
    fontWeight: '700',
  },
  rideCardDate: {
    fontSize: 12,
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
    fontSize: 12,
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
    fontSize: theme.typography.sizes.titleMedium,
    fontWeight: '700',
  },
  detailModalSub: {
    fontSize: 12,
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
    fontSize: 12,
    marginTop: 2,
  }
});

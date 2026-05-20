import AsyncStorage from '@react-native-async-storage/async-storage';

const PARKING_KEY = 'motoready_parking_locations';
const WEATHER_KEY_PREFIX = 'motoready_weather_';

class MotoReadyStorage {
  /**
   * Initialize storage
   */
  async init() {
    try {
      console.log('✅ Local storage initialized');
      return true;
    } catch (error) {
      console.error('❌ Storage initialization failed:', error);
      return false;
    }
  }

  /**
   * Add parking location
   */
  async addParkingLocation(latitude, longitude, photoData = null, notes = '') {
    try {
      const existingStr = await AsyncStorage.getItem(PARKING_KEY);
      const locations = existingStr ? JSON.parse(existingStr) : [];
      
      const newParking = {
        id: `parking_${Date.now()}`,
        type: 'parking',
        latitude,
        longitude,
        photoData, // Local file URI (file://...) from ImagePicker
        notes,
        timestamp: new Date().toISOString()
      };

      locations.unshift(newParking); // Add newest first
      await AsyncStorage.setItem(PARKING_KEY, JSON.stringify(locations));
      return newParking;
    } catch (error) {
      console.error('Error saving parking location:', error);
      throw error;
    }
  }

  /**
   * Get all parking locations
   */
  async getParkingLocations() {
    try {
      const existingStr = await AsyncStorage.getItem(PARKING_KEY);
      return existingStr ? JSON.parse(existingStr) : [];
    } catch (error) {
      console.error('Error getting parking locations:', error);
      return [];
    }
  }

  /**
   * Delete parking location
   */
  async deleteParkingLocation(id) {
    try {
      const existingStr = await AsyncStorage.getItem(PARKING_KEY);
      if (!existingStr) return false;
      
      const locations = JSON.parse(existingStr);
      const filtered = locations.filter(item => item.id !== id);
      
      await AsyncStorage.setItem(PARKING_KEY, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error deleting parking location:', error);
      return false;
    }
  }

  /**
   * Cache weather data
   */
  async cacheWeatherData(location, latitude, longitude, weatherData) {
    try {
      const key = `${WEATHER_KEY_PREFIX}${location.toLowerCase().trim()}`;
      const cache = {
        id: `weather_${location}_${Date.now()}`,
        type: 'weather',
        location,
        latitude,
        longitude,
        temperature: weatherData.temperature,
        feels_like: weatherData.feelsLike,
        description: weatherData.description,
        humidity: weatherData.humidity,
        wind_speed: weatherData.windSpeed,
        rain_probability: weatherData.rainProbability || 0,
        icon: weatherData.icon,
        timestamp: new Date().toISOString()
      };

      await AsyncStorage.setItem(key, JSON.stringify(cache));
      return cache;
    } catch (error) {
      console.error('Error caching weather data:', error);
      return null;
    }
  }

  /**
   * Get latest cached weather
   */
  async getLatestWeather(location) {
    try {
      const key = `${WEATHER_KEY_PREFIX}${location.toLowerCase().trim()}`;
      const cachedStr = await AsyncStorage.getItem(key);
      if (!cachedStr) return null;

      const cached = JSON.parse(cachedStr);
      // Check if cache is older than 2 hours
      const cacheTime = new Date(cached.timestamp).getTime();
      const now = Date.now();
      if (now - cacheTime > 2 * 60 * 60 * 1000) {
        // Stale cache
        return null;
      }
      return cached;
    } catch (error) {
      console.error('Error reading cached weather:', error);
      return null;
    }
  }

  /**
   * Add a tracked ride
   */
  async addRide(title, distance, duration, avgSpeed, path) {
    try {
      const existingStr = await AsyncStorage.getItem('motoready_rides');
      const rides = existingStr ? JSON.parse(existingStr) : [];
      
      const newRide = {
        id: `ride_${Date.now()}`,
        type: 'ride',
        title: title || `Ride on ${new Date().toLocaleDateString()}`,
        distance: parseFloat(distance) || 0,
        duration: parseInt(duration) || 0,
        avgSpeed: parseFloat(avgSpeed) || 0,
        path: path || [],
        timestamp: new Date().toISOString()
      };

      rides.unshift(newRide);
      await AsyncStorage.setItem('motoready_rides', JSON.stringify(rides));
      return newRide;
    } catch (error) {
      console.error('Error saving ride:', error);
      throw error;
    }
  }

  /**
   * Get all tracked rides
   */
  async getRides() {
    try {
      const existingStr = await AsyncStorage.getItem('motoready_rides');
      return existingStr ? JSON.parse(existingStr) : [];
    } catch (error) {
      console.error('Error getting rides:', error);
      return [];
    }
  }

  /**
   * Delete a ride
   */
  async deleteRide(id) {
    try {
      const existingStr = await AsyncStorage.getItem('motoready_rides');
      if (!existingStr) return false;
      
      const rides = JSON.parse(existingStr);
      const filtered = rides.filter(item => item.id !== id);
      
      await AsyncStorage.setItem('motoready_rides', JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error deleting ride:', error);
      return false;
    }
  }

  /**
   * Get user profile
   */
  async getProfile() {
    try {
      const existingStr = await AsyncStorage.getItem('motoready_user_profile');
      if (existingStr) {
        return JSON.parse(existingStr);
      }
      return {
        fullName: 'Moto Rider',
        email: 'rider@motoready.com',
        bikeModel: 'Yamaha MT-07',
        experienceYears: '3',
        emergencyContactName: 'John Doe',
        emergencyContactPhone: '+1-555-0199',
        bloodType: 'O+',
        profileImage: null,
      };
    } catch (error) {
      console.error('Error getting profile:', error);
      return null;
    }
  }

  /**
   * Save user profile
   */
  async saveProfile(profileData) {
    try {
      await AsyncStorage.setItem('motoready_user_profile', JSON.stringify(profileData));
      return true;
    } catch (error) {
      console.error('Error saving profile:', error);
      return false;
    }
  }

  /**
   * Clear all storage (Reset settings, tickets, parkings)
   */
  async clearAllData() {
    try {
      await AsyncStorage.clear();
      console.log('✅ Storage cleared successfully');
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      return false;
    }
  }
}

export const db = new MotoReadyStorage();

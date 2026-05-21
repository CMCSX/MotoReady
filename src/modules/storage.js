import AsyncStorage from '@react-native-async-storage/async-storage';

const WEATHER_KEY_PREFIX = 'motoready_weather_';
const PARKING_KEY = 'motoready_parking_locations';
const RIDES_KEY = 'motoready_rides';
const PROFILE_KEY = 'motoready_profile';

class MotoReadyStorage {
  // Temporary isolation key for database scoping. Easily upgradeable to Auth UID later!
  getUserId() {
    return 'default_user';
  }

  /**
   * Initialize storage
   */
  async init() {
    try {
      console.log('📦 Local storage (AsyncStorage) initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Storage initialization failed:', error);
      return false;
    }
  }

  /**
   * Add parking location to AsyncStorage
   */
  async addParkingLocation(latitude, longitude, photoData = null, notes = '') {
    try {
      const timestamp = new Date().toISOString();
      const newParkingData = {
        id: `parking_${Date.now()}`,
        type: 'parking',
        latitude,
        longitude,
        photoData, // Local file URI (file://...) from ImagePicker
        notes,
        timestamp
      };

      const existingDataStr = await AsyncStorage.getItem(PARKING_KEY);
      const locations = existingDataStr ? JSON.parse(existingDataStr) : [];
      locations.unshift(newParkingData); // Add to beginning
      await AsyncStorage.setItem(PARKING_KEY, JSON.stringify(locations));
      
      return newParkingData;
    } catch (error) {
      console.error('Error saving parking location to local storage:', error);
      throw error;
    }
  }

  /**
   * Get all parking locations from AsyncStorage
   */
  async getParkingLocations() {
    try {
      const existingDataStr = await AsyncStorage.getItem(PARKING_KEY);
      return existingDataStr ? JSON.parse(existingDataStr) : [];
    } catch (error) {
      console.error('Error getting parking locations from local storage:', error);
      return [];
    }
  }

  /**
   * Delete parking location from AsyncStorage
   */
  async deleteParkingLocation(id) {
    try {
      const existingDataStr = await AsyncStorage.getItem(PARKING_KEY);
      if (!existingDataStr) return false;
      
      let locations = JSON.parse(existingDataStr);
      locations = locations.filter(loc => loc.id !== id);
      await AsyncStorage.setItem(PARKING_KEY, JSON.stringify(locations));
      return true;
    } catch (error) {
      console.error('Error deleting parking location from local storage:', error);
      return false;
    }
  }

  /**
   * Cache weather data locally
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
      console.error('Error caching weather data locally:', error);
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
      console.error('Error reading cached weather locally:', error);
      return null;
    }
  }

  /**
   * Add a tracked ride to AsyncStorage
   */
  async addRide(title, distance, duration, avgSpeed, path) {
    try {
      const timestamp = new Date().toISOString();
      const newRideData = {
        id: `ride_${Date.now()}`,
        type: 'ride',
        title: title || `Ride on ${new Date().toLocaleDateString()}`,
        distance: parseFloat(distance) || 0,
        duration: parseInt(duration) || 0,
        avgSpeed: parseFloat(avgSpeed) || 0,
        path: path || [],
        timestamp
      };

      const existingDataStr = await AsyncStorage.getItem(RIDES_KEY);
      const rides = existingDataStr ? JSON.parse(existingDataStr) : [];
      rides.unshift(newRideData); // Add to beginning
      await AsyncStorage.setItem(RIDES_KEY, JSON.stringify(rides));
      
      return newRideData;
    } catch (error) {
      console.error('Error saving ride to local storage:', error);
      throw error;
    }
  }

  /**
   * Get all tracked rides from AsyncStorage
   */
  async getRides() {
    try {
      const existingDataStr = await AsyncStorage.getItem(RIDES_KEY);
      return existingDataStr ? JSON.parse(existingDataStr) : [];
    } catch (error) {
      console.error('Error getting rides from local storage:', error);
      return [];
    }
  }

  /**
   * Delete a ride from AsyncStorage
   */
  async deleteRide(id) {
    try {
      const existingDataStr = await AsyncStorage.getItem(RIDES_KEY);
      if (!existingDataStr) return false;
      
      let rides = JSON.parse(existingDataStr);
      rides = rides.filter(ride => ride.id !== id);
      await AsyncStorage.setItem(RIDES_KEY, JSON.stringify(rides));
      return true;
    } catch (error) {
      console.error('Error deleting ride from local storage:', error);
      return false;
    }
  }

  /**
   * Get user profile from AsyncStorage
   */
  async getProfile() {
    try {
      const cachedProfile = await AsyncStorage.getItem(PROFILE_KEY);
      if (cachedProfile) {
        return JSON.parse(cachedProfile);
      }
      
      // Default profile fallback
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
      console.error('Error getting profile from local storage:', error);
      return null;
    }
  }

  /**
   * Save user profile to AsyncStorage
   */
  async saveProfile(profileData) {
    try {
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profileData));
      return true;
    } catch (error) {
      console.error('Error saving profile to local storage:', error);
      return false;
    }
  }

  /**
   * Clear all storage (Reset local settings/weather/rides/parking)
   */
  async clearAllData() {
    try {
      // Clear local AsyncStorage
      await AsyncStorage.clear();
      console.log('✅ Local storage cleared');
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      return false;
    }
  }
}

export const db = new MotoReadyStorage();

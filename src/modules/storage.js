import AsyncStorage from '@react-native-async-storage/async-storage';
import { db as firestoreDb } from '../config/firebase';
import { 
  collection, doc, getDoc, setDoc, addDoc, getDocs, 
  deleteDoc, query, orderBy 
} from 'firebase/firestore';

const WEATHER_KEY_PREFIX = 'motoready_weather_';

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
      console.log('🔥 Cloud Firestore initialized with local persistent cache');
      return true;
    } catch (error) {
      console.error('❌ Storage initialization failed:', error);
      return false;
    }
  }

  /**
   * Add parking location to Firestore
   */
  async addParkingLocation(latitude, longitude, photoData = null, notes = '') {
    try {
      const userId = this.getUserId();
      const colRef = collection(firestoreDb, 'users', userId, 'parking_locations');
      const timestamp = new Date().toISOString();
      
      const newParkingData = {
        type: 'parking',
        latitude,
        longitude,
        photoData, // Local file URI (file://...) from ImagePicker
        notes,
        timestamp
      };

      const docRef = await addDoc(colRef, newParkingData);
      
      return {
        id: docRef.id,
        ...newParkingData
      };
    } catch (error) {
      console.error('Error saving parking location to Firestore:', error);
      throw error;
    }
  }

  /**
   * Get all parking locations from Firestore
   */
  async getParkingLocations() {
    try {
      const userId = this.getUserId();
      const colRef = collection(firestoreDb, 'users', userId, 'parking_locations');
      const q = query(colRef, orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const locations = [];
      querySnapshot.forEach((doc) => {
        locations.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return locations;
    } catch (error) {
      console.error('Error getting parking locations from Firestore:', error);
      return [];
    }
  }

  /**
   * Delete parking location from Firestore
   */
  async deleteParkingLocation(id) {
    try {
      const userId = this.getUserId();
      await deleteDoc(doc(firestoreDb, 'users', userId, 'parking_locations', id));
      return true;
    } catch (error) {
      console.error('Error deleting parking location from Firestore:', error);
      return false;
    }
  }

  /**
   * Cache weather data locally (Kept on AsyncStorage to save database costs)
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
   * Get latest cached weather (Kept on AsyncStorage to save database costs)
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
   * Add a tracked ride to Firestore
   */
  async addRide(title, distance, duration, avgSpeed, path) {
    try {
      const userId = this.getUserId();
      const colRef = collection(firestoreDb, 'users', userId, 'rides');
      const timestamp = new Date().toISOString();
      
      const newRideData = {
        type: 'ride',
        title: title || `Ride on ${new Date().toLocaleDateString()}`,
        distance: parseFloat(distance) || 0,
        duration: parseInt(duration) || 0,
        avgSpeed: parseFloat(avgSpeed) || 0,
        path: path || [],
        timestamp
      };

      const docRef = await addDoc(colRef, newRideData);
      
      return {
        id: docRef.id,
        ...newRideData
      };
    } catch (error) {
      console.error('Error saving ride to Firestore:', error);
      throw error;
    }
  }

  /**
   * Get all tracked rides from Firestore
   */
  async getRides() {
    try {
      const userId = this.getUserId();
      const colRef = collection(firestoreDb, 'users', userId, 'rides');
      const q = query(colRef, orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const rides = [];
      querySnapshot.forEach((doc) => {
        rides.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return rides;
    } catch (error) {
      console.error('Error getting rides from Firestore:', error);
      return [];
    }
  }

  /**
   * Delete a ride from Firestore
   */
  async deleteRide(id) {
    try {
      const userId = this.getUserId();
      await deleteDoc(doc(firestoreDb, 'users', userId, 'rides', id));
      return true;
    } catch (error) {
      console.error('Error deleting ride from Firestore:', error);
      return false;
    }
  }

  /**
   * Get user profile from Firestore
   */
  async getProfile() {
    try {
      const userId = this.getUserId();
      const docRef = doc(firestoreDb, 'users', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists() && docSnap.data().profile) {
        return docSnap.data().profile;
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
      console.error('Error getting profile from Firestore:', error);
      return null;
    }
  }

  /**
   * Save user profile to Firestore
   */
  async saveProfile(profileData) {
    try {
      const userId = this.getUserId();
      const docRef = doc(firestoreDb, 'users', userId);
      
      await setDoc(docRef, { profile: profileData }, { merge: true });
      return true;
    } catch (error) {
      console.error('Error saving profile to Firestore:', error);
      return false;
    }
  }

  /**
   * Clear all storage (Reset local settings/weather and Firestore records)
   */
  async clearAllData() {
    try {
      // 1. Clear local AsyncStorage
      await AsyncStorage.clear();
      console.log('✅ Local AsyncStorage cleared');

      // 2. Fetch and delete all subcollection documents under this user in Firestore
      const userId = this.getUserId();

      // Clear parking locations
      const parkingCol = collection(firestoreDb, 'users', userId, 'parking_locations');
      const parkingSnap = await getDocs(parkingCol);
      for (const d of parkingSnap.docs) {
        await deleteDoc(doc(firestoreDb, 'users', userId, 'parking_locations', d.id));
      }

      // Clear rides
      const ridesCol = collection(firestoreDb, 'users', userId, 'rides');
      const ridesSnap = await getDocs(ridesCol);
      for (const d of ridesSnap.docs) {
        await deleteDoc(doc(firestoreDb, 'users', userId, 'rides', d.id));
      }

      // Delete main user profile document
      await deleteDoc(doc(firestoreDb, 'users', userId));
      
      console.log('✅ Cloud Firestore storage cleared');
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      return false;
    }
  }
}

export const db = new MotoReadyStorage();


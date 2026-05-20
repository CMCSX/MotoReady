# 🚀 Connecting and Storing Data to Firebase Firestore in MotoReady

This guide covers how to connect, write, read, and delete data using Cloud Firestore in your React Native & React Native Web application.

Your project already has Firebase initialized and configured in `src/config/firebase.js` with **Persistent Offline Caching** enabled. This means your app will work flawlessly offline (e.g., when a rider is underground or has low signal) and automatically sync data when a connection is restored!

---

## 1. The Core Firebase Instance (`src/config/firebase.js`)

You already have the Firestore database instance exported in [firebase.js](file:///c:/Users/SPM/Downloads/MotoReady/src/config/firebase.js):

```javascript
import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "motoready.firebaseapp.com",
  projectId: "motoready",
  storageBucket: "motoready.firebasestorage.app",
  messagingSenderId: "476433119953",
  appId: "1:476433119953:web:2f83d68df8f9f7fc4aa3f0",
  measurementId: "G-0NVR3YPBE4"
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
    localCache: persistentLocalCache()
});

export { db };
```

---

## 2. Basic Firestore CRUD Operations (Modular SDK)

Firestore uses a flexible, document-oriented data model consisting of **Collections** and **Documents**.

Here is how you perform the four CRUD operations:

### 📥 A. Storing Data (Write/Create)

There are two primary ways to store data:
1. **`addDoc`**: Auto-generates a unique random document ID (great for Rides, Parking, etc.).
2. **`setDoc`**: Uses a specific custom document ID (perfect for user profile keys, e.g. using the user's UID or a fixed key).

```javascript
import { collection, addDoc, doc, setDoc } from "firebase/firestore";
import { db } from "../config/firebase";

// Option A: Save with a auto-generated ID (e.g. adding a new Ride)
const addRideToFirestore = async (rideData) => {
  try {
    const docRef = await addDoc(collection(db, "rides"), {
      ...rideData,
      timestamp: new Date().toISOString()
    });
    console.log("Ride saved with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error adding ride: ", error);
  }
};

// Option B: Save/Overwrite with a specific ID (e.g. User Profile)
const saveUserProfile = async (userId, profileData) => {
  try {
    const userDocRef = doc(db, "users", userId);
    await setDoc(userDocRef, profileData, { merge: true }); // 'merge: true' prevents overwriting other fields!
    console.log("Profile saved successfully");
  } catch (error) {
    console.error("Error saving profile: ", error);
  }
};
```

---

### 📤 B. Fetching Data (Read)

You can fetch a single document or query all documents inside a collection.

```javascript
import { doc, getDoc, collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../config/firebase";

// 1. Get a Single Document (e.g. Profile)
const getUserProfile = async (userId) => {
  const docRef = doc(db, "users", userId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    console.log("Profile Data:", docSnap.data());
    return docSnap.data();
  } else {
    console.log("No profile found!");
    return null;
  }
};

// 2. Fetch Multiple Documents (e.g. All Rides, ordered by date)
const getAllRides = async () => {
  try {
    const ridesRef = collection(db, "rides");
    const q = query(ridesRef, orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);
    
    const rides = [];
    querySnapshot.forEach((doc) => {
      rides.push({ id: doc.id, ...doc.data() });
    });
    return rides;
  } catch (error) {
    console.error("Error getting rides: ", error);
    return [];
  }
};
```

---

### 🔄 C. Updating Data (Update)

Use **`updateDoc`** when you want to update specific fields without wiping out the entire document.

```javascript
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";

const updateEmergencyContact = async (userId, contactName, contactPhone) => {
  const userRef = doc(db, "users", userId);

  await updateDoc(userRef, {
    emergencyContactName: contactName,
    emergencyContactPhone: contactPhone
  });
  console.log("Emergency contact updated!");
};
```

---

### ❌ D. Deleting Data (Delete)

Use **`deleteDoc`** to remove a document.

```javascript
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "../config/firebase";

const deleteRide = async (rideId) => {
  try {
    await deleteDoc(doc(db, "rides", rideId));
    console.log("Ride deleted!");
  } catch (error) {
    console.error("Error deleting ride: ", error);
  }
};
```

---

## 3. Realtime Updates (Optional & Highly Recommended!)

Instead of calling `getDocs` once, you can subscribe to active updates using **`onSnapshot`**. Your UI will update instantly across devices whenever data changes!

```javascript
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";

// Listen to rides collection in real-time
const subscribeToRides = (onRidesUpdated) => {
  const q = query(collection(db, "rides"), orderBy("timestamp", "desc"));
  
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const rides = [];
    querySnapshot.forEach((doc) => {
      rides.push({ id: doc.id, ...doc.data() });
    });
    onRidesUpdated(rides);
  });
  
  return unsubscribe; // Call unsubscribe() when component unmounts to stop listening!
};
```

---

## 4. How to Migrate your `storage.js` to Firestore

Below is a complete blueprint of how you can replace the local `AsyncStorage` in [storage.js](file:///c:/Users/SPM/Downloads/MotoReady/src/modules/storage.js) to leverage Firebase.

> [!NOTE]
> If you have user authentication active, you should replace `'default_user'` with the logged-in user's UID (e.g. `auth.currentUser.uid`) so each user gets their own separate data!

```javascript
import { db } from '../config/firebase';
import { 
  collection, doc, getDoc, setDoc, addDoc, getDocs, 
  deleteDoc, query, orderBy, limit 
} from 'firebase/firestore';

class MotoReadyFirestoreStorage {
  // We use a constant default user ID if auth is not yet integrated
  getUserId() {
    return 'default_user';
  }

  /**
   * Initialize Firestore connection
   */
  async init() {
    console.log('🔥 Cloud Firestore Storage Initialized with Local Cache');
    return true;
  }

  /**
   * Add parking location to Firestore
   */
  async addParkingLocation(latitude, longitude, photoData = null, notes = '') {
    try {
      const colRef = collection(db, 'users', this.getUserId(), 'parking_locations');
      const docRef = await addDoc(colRef, {
        latitude,
        longitude,
        photoData,
        notes,
        timestamp: new Date().toISOString()
      });
      return {
        id: docRef.id,
        latitude,
        longitude,
        photoData,
        notes,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error saving parking to Firestore:', error);
      throw error;
    }
  }

  /**
   * Get parking locations
   */
  async getParkingLocations() {
    try {
      const colRef = collection(db, 'users', this.getUserId(), 'parking_locations');
      const q = query(colRef, orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      
      const locations = [];
      snap.forEach(doc => {
        locations.push({ id: doc.id, ...doc.data() });
      });
      return locations;
    } catch (error) {
      console.error('Error getting parking from Firestore:', error);
      return [];
    }
  }

  /**
   * Delete parking location
   */
  async deleteParkingLocation(id) {
    try {
      await deleteDoc(doc(db, 'users', this.getUserId(), 'parking_locations', id));
      return true;
    } catch (error) {
      console.error('Error deleting parking from Firestore:', error);
      return false;
    }
  }

  /**
   * Add a tracked ride to Firestore
   */
  async addRide(title, distance, duration, avgSpeed, path) {
    try {
      const colRef = collection(db, 'users', this.getUserId(), 'rides');
      const data = {
        title: title || `Ride on ${new Date().toLocaleDateString()}`,
        distance: parseFloat(distance) || 0,
        duration: parseInt(duration) || 0,
        avgSpeed: parseFloat(avgSpeed) || 0,
        path: path || [],
        timestamp: new Date().toISOString()
      };
      const docRef = await addDoc(colRef, data);
      return { id: docRef.id, ...data };
    } catch (error) {
      console.error('Error saving ride to Firestore:', error);
      throw error;
    }
  }

  /**
   * Get all tracked rides
   */
  async getRides() {
    try {
      const colRef = collection(db, 'users', this.getUserId(), 'rides');
      const q = query(colRef, orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      
      const rides = [];
      snap.forEach(doc => {
        rides.push({ id: doc.id, ...doc.data() });
      });
      return rides;
    } catch (error) {
      console.error('Error getting rides from Firestore:', error);
      return [];
    }
  }

  /**
   * Delete a ride
   */
  async deleteRide(id) {
    try {
      await deleteDoc(doc(db, 'users', this.getUserId(), 'rides', id));
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
      const docRef = doc(db, 'users', this.getUserId());
      const snap = await getDoc(docRef);
      
      if (snap.exists() && snap.data().profile) {
        return snap.data().profile;
      }
      
      // Default fallback
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
      const docRef = doc(db, 'users', this.getUserId());
      await setDoc(docRef, { profile: profileData }, { merge: true });
      return true;
    } catch (error) {
      console.error('Error saving profile to Firestore:', error);
      return false;
    }
  }
}

export const dbStorage = new MotoReadyFirestoreStorage();
```

---

## 5. Next Steps

If you want to migrate your app from local storage to Firestore right now, we can do it together! Just let me know:
1. Would you like me to replace `src/modules/storage.js` with the Firebase Firestore implementation shown above?
2. If you would like to keep local storage as a fallback, we can also write a dual storage provider.

Happy Riding! 🏍️💨

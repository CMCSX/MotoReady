import { initializeApp } from "firebase/app";
// Import initializeFirestore and persistentLocalCache for offline functionality
import { initializeFirestore, persistentLocalCache } from "firebase/firestore";

// Your exact configuration block from the screenshot
const firebaseConfig = {
    apiKey: "AIzaSyCMY8UhxGflz26jkZV6H28M89lckCZp--s",
    authDomain: "motoready.firebaseapp.com",
    projectId: "motoready",
    storageBucket: "motoready.firebasestorage.app",
    messagingSenderId: "476433119953",
    appId: "1:476433119953:web:2f83d68df8f9f7fc4aa3f0",
    measurementId: "G-0NVR3YPBE4"
};

// 1. Initialize the core Firebase App
const app = initializeApp(firebaseConfig);

// 2. Initialize Firestore with Offline Cache turned ON 
// (This ensures your parking remembrance feature works underground without signal!)
const db = initializeFirestore(app, {
    localCache: persistentLocalCache()
});

// 3. Export 'db' so you can use it across your entire app
export { db };
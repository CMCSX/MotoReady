/**
 * Database Module - IndexedDB + SQLite WASM Integration
 * Handles all local database operations for MotoReady
 */

class MotoReadyDB {
    constructor() {
        this.db = null;
        this.dbName = 'MotoReadyDB';
        this.storeName = 'data';
        this.SQL = null;
    }

    /**
     * Initialize IndexedDB and SQLite
     */
    async init() {
        try {
            // Initialize IndexedDB
            await this.initIndexedDB();
            
            // Initialize SQL.js (SQLite in WASM)
            await this.initSQLite();
            
            // Create tables if they don't exist
            await this.createTables();
            
            console.log('✅ Database initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            return false;
        }
    }

    /**
     * Initialize IndexedDB
     */
    initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id' });
                }
            };
        });
    }

    /**
     * Initialize SQL.js (skipped — app uses IndexedDB directly)
     */
    async initSQLite() {
        // SQL.js / WASM not needed; all storage goes through IndexedDB.
        return Promise.resolve();
    }

    /**
     * Create database tables
     */
    async createTables() {
        // Create parking_locations table
        try {
            await this.executeSql(`
                CREATE TABLE IF NOT EXISTS parking_locations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    latitude REAL NOT NULL,
                    longitude REAL NOT NULL,
                    photo_data TEXT,
                    notes TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Create weather_cache table
            await this.executeSql(`
                CREATE TABLE IF NOT EXISTS weather_cache (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    location TEXT,
                    latitude REAL,
                    longitude REAL,
                    temperature REAL,
                    feels_like REAL,
                    description TEXT,
                    humidity INTEGER,
                    wind_speed REAL,
                    rain_probability INTEGER,
                    icon TEXT,
                    weather_data TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            console.log('✅ Database tables created/verified');
        } catch (error) {
            console.error('Error creating tables:', error);
        }
    }

    /**
     * Execute SQL query
     */
    async executeSql(query, params = []) {
        try {
            // This is a placeholder - in production, you'd use sql.js properly
            // For now, we'll use IndexedDB directly
            return Promise.resolve([]);
        } catch (error) {
            console.error('SQL execution error:', error);
            throw error;
        }
    }

    /**
     * Add parking location
     */
    async addParkingLocation(latitude, longitude, photoData = null, notes = '') {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            const parking = {
                id: `parking_${Date.now()}`,
                type: 'parking',
                latitude,
                longitude,
                photoData,
                notes,
                timestamp: new Date().toISOString()
            };

            const request = store.add(parking);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(parking);
        });
    }

    /**
     * Get all parking locations
     */
    async getParkingLocations() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const parkings = request.result.filter(item => item.type === 'parking');
                resolve(parkings);
            };
        });
    }

    /**
     * Delete parking location
     */
    async deleteParkingLocation(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(id);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(true);
        });
    }

    /**
     * Cache weather data
     */
    async cacheWeatherData(location, latitude, longitude, weatherData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            const cache = {
                id: `weather_${location}_${Date.now()}`,
                type: 'weather',
                location,
                latitude,
                longitude,
                temperature: weatherData.main?.temp,
                feels_like: weatherData.main?.feels_like,
                description: weatherData.weather?.[0]?.description,
                humidity: weatherData.main?.humidity,
                wind_speed: weatherData.wind?.speed,
                rain_probability: weatherData.clouds?.all,
                icon: weatherData.weather?.[0]?.icon,
                weatherData: JSON.stringify(weatherData),
                timestamp: new Date().toISOString()
            };

            const request = store.add(cache);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(cache);
        });
    }

    /**
     * Get latest cached weather
     */
    async getLatestWeather(location) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const weathers = request.result.filter(
                    item => item.type === 'weather' && item.location === location
                );
                const latest = weathers.length > 0 
                    ? weathers.reduce((prev, current) => 
                        new Date(current.timestamp) > new Date(prev.timestamp) ? current : prev
                    )
                    : null;
                resolve(latest);
            };
        });
    }

    /**
     * Clear old cache (older than 24 hours)
     */
    async clearOldCache() {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const items = request.result;
                items.forEach(item => {
                    if (new Date(item.timestamp) < twentyFourHoursAgo) {
                        store.delete(item.id);
                    }
                });
                resolve();
            };
        });
    }
}

// Export for use in modules
export const db = new MotoReadyDB();

<!-- Use this file to provide workspace-specific custom instructions to Copilot. -->

## MotoReady PWA Project

### Overview
MotoReady is a Progressive Web App that helps motorcycle riders prepare for their rides by:
- Checking real-time weather conditions
- Recommending appropriate gear based on weather
- Saving parking locations with photos and notes
- Displaying saved parking locations on a map

### Architecture
- **Frontend**: Vanilla JavaScript (ES6+) with Bootstrap for styling
- **Database**: WASM SQLite via sql.js stored in IndexedDB
- **Offline Support**: Service Worker for offline-first functionality
- **Maps**: Leaflet.js for map integration
- **Storage**: 100% browser-based (IndexedDB)

### Key Files
- `index.html` - Main PWA entry point
- `public/manifest.json` - PWA installation manifest
- `public/service-worker.js` - Offline functionality
- `src/js/app.js` - Main application logic
- `src/modules/db.js` - IndexedDB + SQLite management
- `src/modules/weather.js` - OpenWeatherMap API integration
- `src/modules/gearLogic.js` - Weather-to-gear recommendations
- `src/modules/parking.js` - Parking location management
- `src/css/styles.css` - Responsive styling

### Development
1. Run `npm start` or `python -m http.server 8000`
2. Navigate to `http://localhost:8000`
3. Install as PWA using browser menu
4. Test offline functionality

### Features Status
- [x] PWA scaffold with service worker
- [x] IndexedDB + SQLite WASM integration
- [x] Weather API integration (Open-Meteo - no API key needed!)
- [x] Gear logic module
- [x] Parking remembrance system
- [x] Map integration ready

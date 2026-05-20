# MotoReady - Motorcycle Rider PWA

A Progressive Web App designed to help motorcycle riders prepare for their rides with weather checks, gear recommendations, and parking location tracking.

## Features

### 🌤️ Weather Check
- Real-time weather conditions via OpenWeatherMap API
- Automatic location detection (with permission)
- Weather caching for offline access
- Last known weather displayed when offline

### 🛣️ Gear Logic
- Intelligent gear recommendations based on temperature and conditions
- Smart recommendations:
  - Rain gear suggestions (Rain > 20%)
  - Temperature-based clothing recommendations
  - Visibility-based safety gear suggestions
- Runs completely locally (no server calls)

### 📍 Parking Remembrance
- Save bike's parking location with geolocation
- Attach photo, notes, and timestamp
- Offline storage with full local database backup
- View saved locations on interactive map

### 🗺️ Find My Bike
- Interactive map showing all saved parking locations
- Click to view parking details (photo, notes, timestamp)
- Distance and direction information
- Works offline with cached location data

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), Bootstrap 5
- **Database**: SQLite via WASM (sql.js) + IndexedDB
- **Offline**: Service Worker for progressive enhancement
- **Maps**: Leaflet.js
- **Storage**: 100% browser-based, IndexedDB backend
- **APIs**: OpenWeatherMap (weather), Geolocation API

## Installation & Setup

### Prerequisites
- Modern browser with Service Worker support (Chrome, Firefox, Edge, Safari 12+)
- Python 3 (for local development server)

### Quick Start

1. **Clone/Download Project**
   ```bash
   cd MotoReady
   ```

2. **Start Development Server**
   ```bash
   npm start
   ```
   Or with Python:
   ```bash
   python -m http.server 8000
   ```

3. **Access PWA**
   - Navigate to `http://localhost:8000`
   - Install as PWA: Browser menu → Install app (or similar)

### Configuration

#### Weather API (Open-Meteo)
MotoReady uses **Open-Meteo**, a free weather API that requires **no API key**!
- Visit [open-meteo.com](https://open-meteo.com) to learn more
- No signup required, completely free
- Worldwide coverage with high accuracy
- No rate limiting for reasonable use

## Project Structure

```
MotoReady/
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── service-worker.js      # Offline functionality
│   └── icons/                 # App icons (192x192, 512x512)
├── src/
│   ├── js/
│   │   └── app.js            # Main application
│   ├── modules/
│   │   ├── db.js             # IndexedDB + SQLite setup
│   │   ├── weather.js        # Weather API integration
│   │   ├── gearLogic.js      # Gear recommendations
│   │   └── parking.js        # Parking location management
│   └── css/
│       └── styles.css        # Responsive styling
├── index.html                 # Main entry point
├── package.json               # Dependencies
└── README.md                  # This file
```

## Offline Functionality

MotoReady is designed to work 100% offline:

- ✅ Weather data cached for later viewing
- ✅ Parking locations stored locally
- ✅ All calculations run in-browser
- ✅ Database persists in browser storage
- ✅ Syncs when connection returns

## Database Schema

### parking_locations Table
```sql
CREATE TABLE parking_locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  latitude REAL,
  longitude REAL,
  photo_data TEXT,
  notes TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### weather_cache Table
```sql
CREATE TABLE weather_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location TEXT,
  latitude REAL,
  longitude REAL,
  weather_data TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

## Usage Guide

### Check Weather & Get Gear Recommendations
1. Open app → Go to "Weather & Gear" tab
2. App auto-detects location (or enter manual)
3. View current weather and recommended gear
4. Data caches automatically

### Save Parking Location
1. Go to "Park My Bike" tab
2. Tap "Capture Location"
3. Optionally: Add photo and notes
4. Save - location stored locally

### Find Saved Locations
1. Go to "Find My Bike" tab
2. View interactive map with all parking spots
3. Click marker for details
4. All data accessible offline

## Browser Support

- ✅ Chrome/Chromium 40+
- ✅ Firefox 44+
- ✅ Edge 15+
- ✅ Safari 12+
- ✅ iOS Safari 12+
- ✅ Android Chrome

## Known Limitations

- Maps require online connection for live tile updates (cached when possible)
- Weather API requires online connection for current data
- Geolocation must be granted in browser permissions

## Future Enhancements

- [ ] Ride history tracking
- [ ] Route planning with weather overlays
- [ ] Multi-user cloud sync option
- [ ] Maintenance reminders
- [ ] Motorcycle profile customization

## License

MIT License - Feel free to use and modify for personal or commercial projects

## Support

For issues or feature requests, create an issue in the repository.

---

**MotoReady**: Ride prepared, ride safe! 🏍️

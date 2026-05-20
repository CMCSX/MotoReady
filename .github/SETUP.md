<!-- Configuration for GitHub Copilot in MotoReady workspace -->

# MotoReady PWA Configuration

## Project Setup Complete ✅

Your PWA is fully scaffolded and ready for development.

### What's Included

- ✅ **Offline-First Architecture** - Service Worker for 100% offline capability
- ✅ **Local Database** - IndexedDB with SQLite WASM integration (sql.js)
- ✅ **Weather Integration** - OpenWeatherMap API with smart caching
- ✅ **Gear Logic** - Intelligent weather-to-gear recommendations
- ✅ **Parking Tracker** - GPS location saving with photos
- ✅ **Interactive Maps** - Leaflet.js map visualization
- ✅ **Responsive Design** - Mobile, tablet, and desktop optimized
- ✅ **PWA Ready** - Installable with manifest.json

### Next Steps

1. **No Setup Needed!** ✅
   - MotoReady uses Open-Meteo (free, no API key required)
   - Ready to use immediately!

2. **Start Development** (1 minute)
   - Press `Ctrl+Shift+B` in VS Code
   - Or run: `npm start` or `python -m http.server 8000`
   - Navigate to: `http://localhost:8000`

3. **Test Features** (5 minutes)
   - Weather & Gear: Check weather and get gear recommendations
   - Park My Bike: Save your parking location
   - Find My Bike: View saved locations on a map

4. **Install as PWA** (optional)
   - Click the "Install" button in the app
   - Test offline mode: DevTools → Network → Offline

### Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+) with Bootstrap 5
- **Database**: IndexedDB + SQL.js (SQLite in WebAssembly)
- **Weather**: Open-Meteo API (free, no key required)
- **Offline**: Service Worker (network-first strategy)
- **Maps**: Leaflet.js
- **Build**: No build step required (runs directly)
- **Hosting**: Any static web server

### Development Commands

```bash
# Start development server
npm start

# Or with Python
python -m http.server 8000

# View in browser
# http://localhost:8000
```

### File Structure

```
src/
  ├── js/app.js                 # Main application controller
  ├── modules/
  │   ├── db.js                 # Database management
  │   ├── weather.js            # Weather API client
  │   ├── gearLogic.js          # Gear recommendations
  │   └── parking.js            # Parking location manager
  └── css/styles.css            # Responsive styling

public/
  ├── service-worker.js         # Offline support
  ├── manifest.json             # PWA manifest
  └── icons/                    # App icons (add 192x192 and 512x512)

index.html                       # Main entry point
```

### Key Features

#### 🌤️ Weather & Gear
- Real-time weather from OpenWeatherMap
- Smart gear recommendations based on:
  - Temperature (0°C to 30°C+ ranges)
  - Precipitation chance
  - Wind speed
  - Humidity
- Offline caching of last known weather
- 24-hour cache management

#### 📍 Parking Remembrance
- GPS-based location capture
- Photo attachment (converts to base64)
- Custom notes and timestamps
- Haversine distance calculations
- One-click map links to location

#### 🗺️ Find My Bike
- Interactive Leaflet.js map
- All parking locations with markers
- Photo and notes in popup
- Distance calculation from current position
- Offline marker display

#### 💾 Offline Support
- Service Worker caches app shell
- IndexedDB for persistent storage
- Network-first API strategy
- Automatic fallback to cache
- Works 100% offline after first visit

### Configuration

#### Get OpenWeatherMap API Key
1. Visit https://openweathermap.org/api
2. Sign up for free account
3. Copy API key from dashboard
4. Paste in `src/modules/weather.js` (line 8)

#### Customize Icons
Add your motorcycle app icons to `public/icons/`:
- `icon-192x192.png` (192×192 pixels)
- `icon-512x512.png` (512×512 pixels)
- Optional maskable variants for PWA

#### Update App Manifest
Edit `public/manifest.json`:
- Change `short_name` and `name`
- Update `theme_color` and `background_color`
- Add your custom screenshots

### Browser Support

- ✅ Chrome 40+
- ✅ Firefox 44+
- ✅ Edge 15+
- ✅ Safari 12+
- ✅ iOS Safari 12+
- ✅ Android Chrome

### Debugging

1. **Check Console**: F12 → Console
2. **View Storage**: F12 → Application → IndexedDB/Cache
3. **Service Worker**: F12 → Application → Service Workers
4. **Network**: F12 → Network (watch API calls)
5. **Responsive**: F12 → Toggle device toolbar

### Performance Tips

- Service Worker caches on first visit
- Weather data cached for 24 hours
- Photos stored as base64 in IndexedDB
- Lazy-load maps only when tab is active
- Optimize PNG icons with tools like TinyPNG

### Deployment

Ready to deploy to any static host:
- **Vercel**: Push to git, auto-deploys
- **Netlify**: Drop folder or git push
- **GitHub Pages**: Enable Pages in settings
- **Firebase Hosting**: Use Firebase CLI
- **Any Web Server**: Just serve the files

Remember: HTTPS is required for PWA features!

### Common Issues

| Issue | Solution |
|-------|----------|
| "Geolocation denied" | Allow linternet connection (Open-Meteo requires online) |
| "Service Worker not registering" | Use HTTPS or localhost |
| "Maps not showing" | Check internet connection for tiles |
| "App not installing" | Ensure HTTPS or serve on localhost |
| "Invalid weather code" | API endpoint may have changed - check Open-Meteo docs|
| "App not installing" | Ensure HTTPS or serve on localhost |

### Support & Documentation

- See `README.md` for full feature documentation
- See `QUICKSTART.md` for setup guide
- Check console logs (F12) for detailed debug info
- All modules have JSDoc comments

---

**Status**: ✅ Ready for Development
**Last Updated**: 2024

Need help? Refer to the included documentation files!

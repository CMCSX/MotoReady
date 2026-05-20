# Quick Start Guide

## 1️⃣ No API Key Setup Needed! ✅

MotoReady uses **Open-Meteo**, a completely free weather API with:
- ✅ No API key required
- ✅ No signup needed
- ✅ Worldwide coverage
- ✅ High accuracy
- ✅ No rate limits for typical use

You're all set to go! Just run the server.

## 2️⃣ Start Development Server

### Option A: Using npm
```bash
npm start
```

### Option B: Using Python
```bash
python -m http.server 8000
```

### Option C: Using VS Code Task
- Press `Ctrl+Shift+B` (or `Cmd+Shift+B` on Mac)
- Select "Start Dev Server"

## 3️⃣ Access the App

Open your browser and navigate to:
```
http://localhost:8000
```

## 4️⃣ Install as PWA (Optional)

1. Click the "Install" button in the app (top right)
2. Or use your browser menu:
   - **Chrome/Edge**: Menu → Install MotoReady
   - **Firefox**: (PWA support limited)
   - **Safari/iOS**: Share → Add to Home Screen

## 5️⃣ Test Features

### Weather & Gear
- Click "Allow" when prompted for location
- See weather and gear recommendations

### Park My Bike
- Click "Capture Location" to save current GPS position
- Add notes and optional photo
- Click "Save Parking"

### Find My Bike
- View all saved parking locations on interactive map
- Click markers for details
- Delete old parkings as needed

## ⚡ Offline Testing

1. Open DevTools (F12)
2. Go to Network tab
3. Check "Offline"
4. The app continues to work with cached data!

## 🐛 Troubleshooting

### "Geolocation not available"
- Make sure location services are enabled in your browser
- Try a different browser (Chromium-based browsers work best)
- Check that you allowed location permission

### "Weather not updating"
- Verify your OpenWeatherMap API key is correct
- Check internet connection
- Wait a moment, API calls take a few seconds
- Check browser console (F12) for errors

### Map not showing
- Offline mode only shows cached tile data
- Enable internet connection to see live maps
- Marker clustering might hide some pins - zoom in

### Service Worker issues
- Clear browser cache
- Uninstall the app
- Do a hard refresh (Ctrl+Shift+R)
- Check DevTools → Application → Service Workers

## 📱 Mobile Testing

### iOS (Safari)
1. Open Safari
2. Navigate to `http://localhost:8000`
3. Tap Share → Add to Home Screen
4. Works offline with full functionality

### Android (Chrome)
1. Open Chrome
2. Navigate to `http://localhost:8000`
3. Tap menu → Install app
4. Full offline support

## 🔧 Development Tips

- **Console Logs**: Check browser console (F12) for debug messages
- **Storage**: View saved data in DevTools → Application → IndexedDB
- **Service Worker**: Check DevTools → Application → Service Workers
- **Network**: Monitor API calls in DevTools → Network tab
- **Responsive**: Test on different screen sizes (DevTools → Toggle device toolbar)

## 📝 Project Structure

```
MotoReady/
├── src/
│   ├── js/
│   │   └── app.js              # Main app controller
│   ├── modules/
│   │   ├── db.js               # Database (IndexedDB)
│   │   ├── weather.js          # Weather API
│   │   ├── gearLogic.js        # Gear recommendations
│   │   └── parking.js          # Parking management
│   └── css/
│       └── styles.css          # Responsive styling
├── public/
│   ├── manifest.json           # PWA manifest
│   ├── service-worker.js       # Offline support
│   └── icons/                  # App icons
├── index.html                  # Main HTML
└── package.json                # Dependencies
```

## 🚀 Next Steps

- Get your OpenWeatherMap API key (5 min)
- Run the dev server
- Test the three main features
- Install as PWA
- Test offline mode

Enjoy! 🏍️

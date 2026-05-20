/**
 * MotoReady PWA - Main Application
 * Orchestrates all modules and handles UI interactions
 */

import { db } from '../modules/db.js';
import { weather } from '../modules/weather.js';
import { gearLogic } from '../modules/gearLogic.js';
import { parking } from '../modules/parking.js';

class MotoReadyApp {
    constructor() {
        this.currentWeatherData = null;
        this.currentLocation = null;
        this.deferredPrompt = null;
        this.currentPage = 'home';

        // Full map
        this.fullMap = null;
        this.userLocationMarker = null;
        this.searchMarker = null;
        this.poiMarkers = [];
        this.allNearbyPlaces = [];

        // Tickets & payment
        this.pendingBooking = null;
        this.qrTimerInterval = null;
    }

    /**
     * Initialize the application
     */
    async init() {
        console.log('🏍️ MotoReady Initializing...');

        try {
            // Register service worker
            await this.registerServiceWorker();

            // Initialize database
            await db.init();

            // Load dark mode preference
            this.loadThemePreference();

            // Setup event listeners
            this.setupEventListeners();

            // Setup install prompt
            this.setupInstallPrompt();

            // Monitor online/offline status
            this.monitorConnectivity();

            // Load initial page
            this.switchPage('home');

            console.log('✅ MotoReady Ready!');
        } catch (error) {
            console.error('❌ Initialization error:', error);
            this.showError('Failed to initialize app. Please refresh.');
        }
    }

    /**
     * Register Service Worker
     */
    async registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            console.warn('Service Workers not supported');
            return;
        }

        try {
            const registration = await navigator.serviceWorker.register('./public/service-worker.js');
            console.log('✅ Service Worker registered:', registration);
        } catch (error) {
            console.error('❌ Service Worker registration failed:', error);
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Bottom navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = btn.dataset.page;
                this.switchPage(page);
            });
        });

        // Weather & Gear
        document.getElementById('refreshWeatherBtn')?.addEventListener('click', () => this.forceReloadWeather());

        // Manual Location button and search bar
        const manualLocBtn = document.getElementById('manualLocationBtn');
        const locSearchBar = document.getElementById('locationSearchBar');
        const locSearchInput = document.getElementById('locationSearchInput');
        const locSearchSubmit = document.getElementById('locationSearchSubmitBtn');

        manualLocBtn?.addEventListener('click', () => {
            if (locSearchBar) {
                const isHidden = locSearchBar.style.display === 'none';
                locSearchBar.style.display = isHidden ? 'flex' : 'none';
                manualLocBtn.classList.toggle('active', isHidden);
                if (isHidden && locSearchInput) {
                    locSearchInput.focus();
                }
            }
        });

        const handleManualSearch = () => this.submitManualLocationSearch();
        locSearchSubmit?.addEventListener('click', handleManualSearch);
        locSearchInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleManualSearch();
        });

        // Park My Bike
        document.getElementById('captureLocationBtn')?.addEventListener('click', () => this.captureLocation());
        document.getElementById('saveParkBtn')?.addEventListener('click', () => this.saveParking());
        document.getElementById('parkPhoto')?.addEventListener('change', (e) => this.handlePhotoSelect(e));

        // Parking tabs
        // Use Bootstrap's built-in tab functionality.
        // We listen for the 'shown.bs.tab' event to load the map.
        const findTabButton = document.getElementById('find-tab');
        if (findTabButton) {
            findTabButton.addEventListener('shown.bs.tab', () => this.loadParkingMap());
        }

        // Full Map page
        document.getElementById('mapLocateBtn')?.addEventListener('click', () => this.centerFullMapOnUser());
        document.getElementById('mapSearchBtn')?.addEventListener('click', () => this.searchOnMap());
        document.getElementById('mapSearchInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.searchOnMap();
        });
        document.querySelectorAll('.map-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('.map-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                this.filterMapCategory(chip.dataset.category);
            });
        });

        // Tickets & Payment page
        document.getElementById('calculateBtn')?.addEventListener('click', () => this.calculateBooking());
        document.querySelectorAll('.payment-method-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchPaymentMethod(btn.dataset.method));
        });
        document.getElementById('payCardBtn')?.addEventListener('click', () => this.processCardPayment());
        document.getElementById('confirmQRPayBtn')?.addEventListener('click', () => this.confirmQRPayment());
        document.getElementById('refreshQRBtn')?.addEventListener('click', () => this.generateQRCode());
        document.getElementById('payUPIBtn')?.addEventListener('click', () => this.processUPIPayment());
        document.getElementById('viewActiveTicketBtn')?.addEventListener('click', () => this.viewActiveTicket());

        // Card input live formatting
        document.getElementById('cardNumber')?.addEventListener('input', (e) => this.formatCardNumber(e));
        document.getElementById('cardName')?.addEventListener('input', (e) => {
            document.getElementById('ccNameDisplay').textContent = e.target.value.toUpperCase() || 'YOUR NAME';
        });
        document.getElementById('cardExpiry')?.addEventListener('input', (e) => this.formatCardExpiry(e));
        // Settings
        document.getElementById('darkModeToggle')?.addEventListener('change', (e) => {
            this.toggleDarkMode(e.target.checked);
        });

        document.getElementById('clearDataBtn')?.addEventListener('click', () => {
            this.clearAllData();
        });
    }

    /**
     * Switch between pages
     */
    switchPage(page) {
        // Hide all pages
        document.querySelectorAll('.page-content').forEach(content => {
            content.classList.remove('active');
        });

        // Remove active class from nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Show selected page
        const pageMap = {
            'home':     'homePage',
            'parking':  'parkingPage',
            'map':      'mapPage',
            'tickets':  'ticketsPage',
            'settings': 'settingsPage'
        };

        const contentId = pageMap[page];
        const content = document.getElementById(contentId);
        if (content) {
            content.classList.add('active');
        }

        // Activate button
        document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

        // Update page title
        const titles = {
            'home':     'MotoReady',
            'parking':  'Parking',
            'map':      'Map',
            'tickets':  'Tickets',
            'settings': 'Settings'
        };
        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) {
            pageTitle.textContent = titles[page] || 'MotoReady';
        }

        this.currentPage = page;

        // Load data for specific pages
        if (page === 'home') {
            this.loadWeather();
        } else if (page === 'parking') {
            this.loadParkingMap();
        } else if (page === 'map') {
            this.loadFullMap();
        } else if (page === 'tickets') {
            this.initTicketsPage();
        }
    }

    /**
     * Load and display weather
     */
    async loadWeather() {
        const status = document.getElementById('weatherStatus');
        const weatherData = document.getElementById('weatherWeatherData');

        // If the city-search prompt is already visible, don't re-run
        if (status.querySelector('.city-search-prompt')) return;

        // If weather is already displayed, just refresh silently
        if (weatherData.style.display === 'block' && this.currentWeatherData) {
            return;
        }

        try {
            status.style.display = 'block';
            status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Detecting your location…';
            weatherData.style.display = 'none';

            const weatherRaw = await weather.getWeather();
            this.currentWeatherData = weather.formatWeatherData(weatherRaw);

            this.displayWeather(this.currentWeatherData);
            const recommendations = gearLogic.getGearRecommendations(this.currentWeatherData);
            this.displayGearRecommendations(recommendations);

            status.style.display = 'none';
            weatherData.style.display = 'block';
        } catch (error) {
            console.error('Weather loading error:', error);

            if (error.message === 'LOCATION_UNAVAILABLE') {
                this.showLocationSearchPrompt();
            } else {
                status.innerHTML = `
                    <div class="location-error-box">
                        <i class="fas fa-triangle-exclamation"></i>
                        <p>${error.message}</p>
                        <button class="btn btn-primary btn-sm mt-2" onclick="app.forceReloadWeather()">
                            <i class="fas fa-rotate-right me-1"></i> Try Again
                        </button>
                    </div>`;
            }
        }
    }

    /**
     * Force a fresh weather load (clears cached state first)
     */
    forceReloadWeather() {
        this.currentWeatherData = null;
        const weatherData = document.getElementById('weatherWeatherData');
        if (weatherData) weatherData.style.display = 'none';
        this.loadWeather();
    }

    /**
     * Show an inline city-search prompt when GPS is unavailable
     */
    showLocationSearchPrompt() {
        const status = document.getElementById('weatherStatus');
        status.style.display = 'block';
        status.innerHTML = `
            <div class="city-search-prompt">
                <div class="city-search-icon">
                    <i class="fas fa-location-dot"></i>
                </div>
                <p class="city-search-title">Location unavailable</p>
                <p class="city-search-sub">Enter your city to get weather &amp; gear recommendations</p>
                <div class="city-search-row">
                    <input
                        type="text"
                        id="citySearchInput"
                        class="city-search-input"
                        placeholder="e.g. New York, London, Tokyo…"
                        autocomplete="off"
                        inputmode="search"
                    >
                    <button class="city-search-btn" id="citySearchBtn" aria-label="Search">
                        <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
                <p class="city-search-hint" id="citySearchHint"></p>
            </div>`;

        const input = document.getElementById('citySearchInput');
        const btn   = document.getElementById('citySearchBtn');

        const doSearch = () => this.searchCityWeather();
        btn.addEventListener('click', doSearch);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });

        // Auto-focus on desktop; skip on mobile to avoid keyboard jump
        if (window.innerWidth > 480) input.focus();
    }

    /**
     * Fetch weather for the city the user typed
     */
    async searchCityWeather() {
        const input = document.getElementById('citySearchInput');
        const hint  = document.getElementById('citySearchHint');
        const btn   = document.getElementById('citySearchBtn');
        const city  = input?.value?.trim();

        if (!city) {
            if (hint) { hint.textContent = 'Please enter a city name.'; hint.style.color = 'var(--md-error)'; }
            return;
        }

        // Loading state
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        if (hint) { hint.textContent = `Searching for "${city}"…`; hint.style.color = 'var(--md-secondary-text)'; }

        try {
            const weatherRaw = await weather.getWeatherForCity(city);
            this.currentWeatherData = weather.formatWeatherData(weatherRaw);

            this.displayWeather(this.currentWeatherData);
            const recommendations = gearLogic.getGearRecommendations(this.currentWeatherData);
            this.displayGearRecommendations(recommendations);

            // Hide prompt, show weather
            const statusEl = document.getElementById('weatherStatus');
            if (statusEl) statusEl.style.display = 'none';
            const weatherDataEl = document.getElementById('weatherWeatherData');
            if (weatherDataEl) weatherDataEl.style.display = 'block';
        } catch (err) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-arrow-right"></i>';
            if (hint) { hint.textContent = err.message; hint.style.color = 'var(--md-error)'; }
        }
    }

    /**
     * Fetch weather for the city entered in the manual location search bar
     */
    async submitManualLocationSearch() {
        const input = document.getElementById('locationSearchInput');
        const btn   = document.getElementById('locationSearchSubmitBtn');
        const bar   = document.getElementById('locationSearchBar');
        const toggleBtn = document.getElementById('manualLocationBtn');
        const city  = input?.value?.trim();

        if (!city) {
            this.showError('Please enter a city name');
            return;
        }

        // Loading state
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        try {
            const weatherRaw = await weather.getWeatherForCity(city);
            this.currentWeatherData = weather.formatWeatherData(weatherRaw);

            this.displayWeather(this.currentWeatherData);
            const recommendations = gearLogic.getGearRecommendations(this.currentWeatherData);
            this.displayGearRecommendations(recommendations);

            // Hide search bar & reset button state
            if (bar) bar.style.display = 'none';
            toggleBtn?.classList.remove('active');
            input.value = '';

            // Hide location error / loading prompt if it's currently showing
            const statusEl = document.getElementById('weatherStatus');
            if (statusEl) statusEl.style.display = 'none';
            const weatherDataEl = document.getElementById('weatherWeatherData');
            if (weatherDataEl) weatherDataEl.style.display = 'block';

            this.showSuccess(`Location set to ${this.currentWeatherData.location}`);
        } catch (err) {
            this.showError(err.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-arrow-right"></i>';
        }
    }

    /**
     * Display weather data
     */
    displayWeather(data) {
        document.getElementById('weatherLocation').textContent = data.location || 'Your Location';
        document.getElementById('weatherTemp').textContent = data.temperature;
        document.getElementById('weatherDescription').textContent = data.description;
        document.getElementById('weatherWind').textContent = data.windSpeed;
        document.getElementById('weatherHumidity').textContent = data.humidity;
        document.getElementById('weatherFeels').textContent = data.feelsLike;
        document.getElementById('weatherUpdateTime').textContent = `Updated ${data.timestamp}`;

        const iconEl = document.getElementById('weatherIcon');
        iconEl.className = `fas ${weather.getFontAwesomeIcon(data.icon)} weather-icon-large`;
    }

    /**
     * Display gear recommendations
     */
    displayGearRecommendations(recommendations) {
        const container = document.getElementById('gearRecommendations');
        container.innerHTML = '';

        if (recommendations.length === 0) {
            container.innerHTML = '<p style="font-size:0.875rem;color:var(--md-secondary-text);margin:0;">No specific recommendations needed</p>';
            return;
        }

        const priorityConfig = {
            critical: { border: '#c62828', bg: 'rgba(198,40,40,0.08)', icon: 'rgba(198,40,40,0.12)', iconColor: '#c62828' },
            high:     { border: '#e65100', bg: 'rgba(230,81,0,0.08)',  icon: 'rgba(230,81,0,0.12)',  iconColor: '#e65100' },
            medium:   { border: '#1565c0', bg: 'rgba(21,101,192,0.08)', icon: 'rgba(21,101,192,0.12)', iconColor: '#1565c0' }
        };

        recommendations.forEach(rec => {
            const cfg = priorityConfig[rec.priority] || priorityConfig.medium;
            const name = rec.item.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

            const el = document.createElement('div');
            el.className = 'gear-item';
            el.style.borderLeftColor = cfg.border;
            el.style.background = cfg.bg;
            el.innerHTML = `
                <div class="gear-icon-wrap" style="background:${cfg.icon};">
                    <i class="fas ${rec.icon}" style="color:${cfg.iconColor};"></i>
                </div>
                <div class="gear-item-body">
                    <p class="gear-item-name">${name}</p>
                    <p class="gear-item-reason">${rec.reason}</p>
                </div>
                <span class="gear-priority-chip" style="color:${cfg.border};border-color:${cfg.border};background:${cfg.icon};">${rec.priority}</span>
            `;
            container.appendChild(el);
        });
    }

    /**
     * Capture parking location
     */
    async captureLocation() {
        const btn = document.getElementById('captureLocationBtn');
        const status = document.getElementById('parkStatus');

        try {
            btn.disabled = true;
            status.style.display = 'block';
            status.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i><span id="parkStatusText">Acquiring GPS — please wait…</span>';

            const location = await parking.getCurrentLocation();

            const accuracyLabel = location.accuracy <= 20  ? '🟢 High'
                                : location.accuracy <= 100 ? '🟡 Good'
                                :                            '🔴 Low';

            status.innerHTML = `✅ <span id="parkStatusText">Location captured (±${Math.round(location.accuracy)}m — ${accuracyLabel} accuracy)</span>`;

            // Update display
            document.getElementById('parkLat').textContent = location.latitude.toFixed(6);
            document.getElementById('parkLon').textContent = location.longitude.toFixed(6);
            document.getElementById('parkTime').textContent = `Captured: ${new Date().toLocaleTimeString()}`;

            // Show save button
            document.getElementById('saveParkBtn').style.display = 'inline-block';
            btn.disabled = false;

            setTimeout(() => {
                status.style.display = 'none';
            }, 3000);
        } catch (error) {
            console.error('Geolocation error:', error);
            status.innerHTML = `❌ <span id="parkStatusText">${error.message}</span>`;
            btn.disabled = false;
        }
    }

    /**
     * Handle photo selection
     */
    handlePhotoSelect(event) {
        const files = event.target.files;
        const preview = document.getElementById('photoPreview');
        preview.innerHTML = '';

        if (files.length === 0) return;

        const file = files[0];
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            preview.appendChild(img);
            
            // Store the image data
            window.selectedPhotoData = e.target.result;
        };

        reader.readAsDataURL(file);
    }

    /**
     * Save parking location
     */
    async saveParking() {
        const btn = document.getElementById('saveParkBtn');
        const notes = document.getElementById('parkNotes').value;
        const photoData = window.selectedPhotoData || null;

        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            const parking_record = await parking.saveParkingLocation(notes, photoData);

            // Success message
            this.showSuccess('✅ Parking location saved!');

            // Reset form
            document.getElementById('parkNotes').value = '';
            document.getElementById('parkPhoto').value = '';
            document.getElementById('photoPreview').innerHTML = '';
            window.selectedPhotoData = null;

            // Reset display
            document.getElementById('parkLat').textContent = 'Not captured';
            document.getElementById('parkLon').textContent = 'Not captured';
            document.getElementById('parkTime').textContent = '';
            btn.style.display = 'none';
            btn.innerHTML = '<i class="fas fa-save"></i> Save Parking';
            btn.disabled = false;
        } catch (error) {
            console.error('Save parking error:', error);
            this.showError(`Failed to save: ${error.message}`);
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Save Parking';
        }
    }

    /**
     * Load parking map
     */
    async loadParkingMap() {
        try {
            await parking.displayAllParkings('parkingMap');
            await this.displayParkingList();
        } catch (error) {
            console.error('Map loading error:', error);
            this.showError('Failed to load map');
        }
    }

    /**
     * Display parking list
     */
    async displayParkingList() {
        const list = document.getElementById('parkingList');
        const noParkings = document.getElementById('noParking');
        
        try {
            const parkings = await parking.getAllParkingLocations();

            if (parkings.length === 0) {
                list.innerHTML = '';
                noParkings.style.display = 'flex';
                return;
            }

            noParkings.style.display = 'none';
            list.innerHTML = '';

            parkings.forEach(p => {
                const formatted = parking.formatParkingData(p);
                const distance = parking.calculateDistance(
                    parking.currentLocation?.latitude || 0,
                    parking.currentLocation?.longitude || 0,
                    p.latitude,
                    p.longitude
                );

                const card = document.createElement('div');
                card.className = 'parking-card';
                card.innerHTML = `
                    ${p.photoData ? `<img src="${p.photoData}" class="parking-photo" alt="Parking photo">` : ''}
                    <div class="parking-card-inner">
                        <div class="parking-info">
                            <h6>${formatted.notes}</h6>
                            <p><i class="fas fa-clock"></i> ${formatted.timestamp}</p>
                            ${parking.currentLocation ? `<p><i class="fas fa-location-arrow"></i> ${distance} km away</p>` : ''}
                            <p><i class="fas fa-map-marker-alt"></i> ${formatted.latitude.toFixed(5)}, ${formatted.longitude.toFixed(5)}</p>
                        </div>
                        <div class="parking-actions">
                            <button class="btn btn-primary" onclick="window.open('${parking.generateMapLink(p.latitude, p.longitude)}', '_blank')">
                                <i class="fas fa-map"></i> Navigate
                            </button>
                            <button class="btn btn-outline-danger" onclick="app.deleteParking('${p.id}')">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                `;
                list.appendChild(card);
            });
        } catch (error) {
            console.error('Error displaying parking list:', error);
        }
    }

    /**
     * Delete parking location
     */
    async deleteParking(id) {
        if (!confirm('Delete this parking location?')) return;

        try {
            await parking.deleteParkingLocation(id);
            this.showSuccess('✅ Parking location deleted');
            await this.loadParkingMap();
        } catch (error) {
            this.showError('Failed to delete parking location');
        }
    }

    /**
     * Toggle dark mode
     */
    toggleDarkMode(enabled) {
        if (enabled) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('darkMode', 'true');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('darkMode', 'false');
        }
    }

    /**
     * Load theme preference
     */
    loadThemePreference() {
        const darkMode = localStorage.getItem('darkMode') === 'true';
        const toggle = document.getElementById('darkModeToggle');
        
        if (darkMode) {
            document.body.classList.add('dark-mode');
            if (toggle) toggle.checked = true;
        }
    }

    /**
     * Clear all data
     */
    async clearAllData() {
        if (!confirm('Are you sure you want to clear all data? This cannot be undone.')) return;

        try {
            // Clear IndexedDB
            const parkings = await parking.getAllParkingLocations();
            for (const p of parkings) {
                await parking.deleteParkingLocation(p.id);
            }

            localStorage.clear();
            this.showSuccess('✅ All data cleared!');
            
            // Reload page
            setTimeout(() => location.reload(), 1500);
        } catch (error) {
            this.showError('Failed to clear data');
        }
    }

    /**
     * Monitor online/offline status
     */
    monitorConnectivity() {
        const indicator = document.getElementById('offlineIndicator');

        const updateStatus = () => {
            if (!indicator) return;
            
            if (navigator.onLine) {
                indicator.style.display = 'none';
                console.log('✅ Online');
            } else {
                indicator.style.display = 'block';
                console.log('⚠️ Offline - Using cached data');
            }
        };

        window.addEventListener('online', updateStatus);
        window.addEventListener('offline', updateStatus);
        updateStatus();
    }

    /**
     * Setup install prompt
     */
    setupInstallPrompt() {
        // PWA installation is handled by the browser
        console.log('PWA ready to install');
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    /**
     * Show error message
     */
    showError(message) {
        this.showAlert(message, 'danger');
    }

    /**
     * Show alert message
     */
    showAlert(message, type = 'info') {
        const iconMap = { success: 'fa-circle-check', danger: 'fa-circle-xmark', info: 'fa-circle-info', warning: 'fa-triangle-exclamation' };
        const colorMap = { success: '#00c896', danger: '#ef5350', info: '#3b82f6', warning: '#ffb300' };

        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed; top: 80px; left: 50%; transform: translateX(-50%) translateY(-10px);
            z-index: 9999; background: white; color: #1a1a2e;
            padding: 0.85rem 1.25rem; border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.18);
            display: flex; align-items: center; gap: 0.6rem;
            font-size: 0.875rem; font-weight: 600;
            border-left: 4px solid ${colorMap[type] || colorMap.info};
            min-width: 240px; max-width: calc(100vw - 40px);
            opacity: 0; transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
        `;
        toast.innerHTML = `<i class="fas ${iconMap[type] || iconMap.info}" style="color:${colorMap[type]};font-size:1rem;flex-shrink:0;"></i><span>${message}</span>`;
        document.body.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) translateY(0)';
        });

        // Animate out
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(-10px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ─────────────────────────────────────────────
    //  FULL MAP
    // ─────────────────────────────────────────────

    /**
     * Initialize and display the full map
     */
    loadFullMap() {
        if (this.fullMap) {
            // Already initialized — just invalidate size in case container was hidden
            setTimeout(() => this.fullMap.invalidateSize(), 100);
            return;
        }

        const mapEl = document.getElementById('fullMap');
        if (!mapEl) return;

        this.fullMap = L.map('fullMap').setView([40.7128, -74.006], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(this.fullMap);

        // Try to center on user
        this.centerFullMapOnUser(false);
    }

    /**
     * Center the full map on the user's current location
     */
    centerFullMapOnUser(showToast = true) {
        if (!navigator.geolocation) return;

        const ACCURACY_THRESHOLD = 100;
        const MAX_WAIT_MS        = 12000;
        let bestPosition         = null;
        let watchId              = null;
        let timeoutId            = null;

        const finish = (position) => {
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
            if (timeoutId !== null) clearTimeout(timeoutId);

            const { latitude, longitude } = position.coords;
            if (this.fullMap) {
                this.fullMap.setView([latitude, longitude], 16);

                if (this.userLocationMarker) this.userLocationMarker.remove();

                this.userLocationMarker = L.circleMarker([latitude, longitude], {
                    radius: 10,
                    fillColor: '#ff5722',
                    color: '#fff',
                    weight: 3,
                    opacity: 1,
                    fillOpacity: 0.9
                }).addTo(this.fullMap).bindPopup(
                    `You are here<br><small>±${Math.round(position.coords.accuracy)}m</small>`
                );

                this.loadNearbyPlaces(latitude, longitude);
                if (showToast) this.showSuccess(`📍 Location found (±${Math.round(position.coords.accuracy)}m)`);
            }
        };

        watchId = navigator.geolocation.watchPosition(
            (pos) => {
                if (!bestPosition || pos.coords.accuracy < bestPosition.coords.accuracy) {
                    bestPosition = pos;
                }
                if (pos.coords.accuracy <= ACCURACY_THRESHOLD) {
                    finish(pos);
                }
            },
            () => {
                if (bestPosition) finish(bestPosition);
                else if (showToast) this.showError('Could not get your location');
            },
            { enableHighAccuracy: true, timeout: MAX_WAIT_MS, maximumAge: 0 }
        );

        timeoutId = setTimeout(() => {
            if (bestPosition) finish(bestPosition);
            else if (showToast) this.showError('Location timed out');
        }, MAX_WAIT_MS);
    }

    /**
     * Search for a location on the full map using Nominatim
     */
    async searchOnMap() {
        const query = document.getElementById('mapSearchInput')?.value?.trim();
        if (!query) return;

        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
                { headers: { 'Accept-Language': 'en' } }
            );
            const results = await res.json();

            if (!results.length) {
                this.showError('No results found');
                return;
            }

            const first = results[0];
            const lat = parseFloat(first.lat);
            const lon = parseFloat(first.lon);

            this.fullMap.setView([lat, lon], 15);

            if (this.searchMarker) this.searchMarker.remove();
            this.searchMarker = L.marker([lat, lon])
                .addTo(this.fullMap)
                .bindPopup(`<strong>${first.display_name}</strong>`)
                .openPopup();

            this.loadNearbyPlaces(lat, lon);
        } catch (err) {
            console.error('Map search error:', err);
            this.showError('Search failed. Check your connection.');
        }
    }

    /**
     * Load nearby places (mock data for demo)
     */
    loadNearbyPlaces(lat, lon) {
        const list = document.getElementById('nearbyPlacesList');
        if (!list) return;

        // Clear existing map POI markers
        if (this.poiMarkers) {
            this.poiMarkers.forEach(m => m.remove());
        }
        this.poiMarkers = [];

        const mockPlaces = [
            { name: 'Central Parking Garage', type: 'parking', dist: '0.2 km', icon: 'fa-square-parking', color: '#1565c0', lat: lat + 0.002, lon: lon + 0.001 },
            { name: 'Shell Fuel Station',      type: 'fuel',    dist: '0.4 km', icon: 'fa-gas-pump',       color: '#e65100', lat: lat - 0.001, lon: lon + 0.003 },
            { name: 'The Burger Joint',        type: 'food',    dist: '0.5 km', icon: 'fa-utensils',       color: '#2e7d32', lat: lat + 0.003, lon: lon - 0.002 },
            { name: 'QuickFix Moto Repair',    type: 'repair',  dist: '0.8 km', icon: 'fa-wrench',         color: '#6a1b9a', lat: lat - 0.003, lon: lon - 0.001 },
            { name: 'Riverside Parking',       type: 'parking', dist: '1.1 km', icon: 'fa-square-parking', color: '#1565c0', lat: lat + 0.005, lon: lon + 0.004 },
        ];

        this.allNearbyPlaces = mockPlaces;
        this.renderNearbyPlaces(mockPlaces, lat, lon);
    }

    renderNearbyPlaces(places, userLat, userLon) {
        const list = document.getElementById('nearbyPlacesList');
        if (!list) return;

        list.innerHTML = '';

        if (!places.length) {
            list.innerHTML = `<div class="nearby-placeholder"><i class="fas fa-circle-xmark"></i><p>No places found</p></div>`;
            return;
        }

        places.forEach(place => {
            // Add map marker
            if (this.fullMap) {
                const marker = L.circleMarker([place.lat, place.lon], {
                    radius: 8,
                    fillColor: place.color,
                    color: '#fff',
                    weight: 2,
                    fillOpacity: 0.85
                }).addTo(this.fullMap).bindPopup(`<strong>${place.name}</strong><br><small>${place.type}</small>`);
                this.poiMarkers.push(marker);
            }

            const item = document.createElement('div');
            item.className = 'nearby-item';
            item.innerHTML = `
                <div class="nearby-icon" style="background:${place.color}20;color:${place.color}">
                    <i class="fas ${place.icon}"></i>
                </div>
                <div class="nearby-info">
                    <p class="nearby-name">${place.name}</p>
                    <p class="nearby-meta"><i class="fas fa-location-arrow"></i> ${place.dist}</p>
                </div>
                <button class="nearby-nav-btn" onclick="window.open('https://www.google.com/maps/?q=${place.lat},${place.lon}','_blank')" aria-label="Navigate">
                    <i class="fas fa-diamond-turn-right"></i>
                </button>
            `;
            list.appendChild(item);
        });
    }

    filterMapCategory(category) {
        if (!this.allNearbyPlaces) return;
        const filtered = category === 'all'
            ? this.allNearbyPlaces
            : this.allNearbyPlaces.filter(p => p.type === category);

        // Re-render list and markers
        if (this.poiMarkers) this.poiMarkers.forEach(m => m.remove());
        this.poiMarkers = [];

        const center = this.fullMap?.getCenter();
        this.renderNearbyPlaces(filtered, center?.lat || 0, center?.lng || 0);
    }

    // ─────────────────────────────────────────────
    //  TICKETS & PAYMENT
    // ─────────────────────────────────────────────

    initTicketsPage() {
        this.renderTicketsList();
        this.updateActiveTicketBanner();

        // Set default date/time
        const now = new Date();
        const timeStr = now.toTimeString().slice(0, 5);
        const startInput = document.getElementById('startTime');
        if (startInput && !startInput.value) startInput.value = timeStr;

        const bookingDate = document.getElementById('bookingDate');
        if (bookingDate) bookingDate.textContent = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    calculateBooking() {
        const lot = document.getElementById('lotSelect').value;
        const duration = parseInt(document.getElementById('durationSelect').value);
        const vehicle = document.getElementById('vehicleNumber').value.trim();

        if (!lot) { this.showError('Please select a parking lot'); return; }
        if (!vehicle) { this.showError('Please enter your vehicle number'); return; }

        const lotData = {
            'lot-a': { name: 'Lot A — Downtown Central', addr: 'Downtown Central, Main St', rate: 2 },
            'lot-b': { name: 'Lot B — Riverside Plaza',  addr: 'Riverside Plaza, River Rd', rate: 1.5 },
            'lot-c': { name: 'Lot C — Airport Express',  addr: 'Airport Express, Terminal 1', rate: 3 },
            'lot-d': { name: 'Lot D — Mall Parking',     addr: 'City Mall, Shopping Ave', rate: 1 },
        };

        const selected = lotData[lot];
        const amount = (selected.rate * duration).toFixed(2);

        document.getElementById('bookingLotName').textContent = selected.name;
        document.getElementById('bookingLotAddr').textContent = selected.addr;
        document.getElementById('bookingDuration').textContent = `${duration} hr${duration > 1 ? 's' : ''}`;
        document.getElementById('bookingAmount').textContent = `$${amount}`;
        document.getElementById('cardPayAmount').textContent = `$${amount}`;
        document.getElementById('qrAmountDisplay').textContent = `$${amount}`;
        document.getElementById('upiAmountDisplay').textContent = `$${amount}`;

        // Store pending booking
        this.pendingBooking = {
            lot, lotName: selected.name, lotAddr: selected.addr,
            duration, vehicle, amount: parseFloat(amount),
            startTime: document.getElementById('startTime').value,
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        };

        const paySection = document.getElementById('paymentSection');
        paySection.style.display = 'block';
        paySection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Generate QR for QR tab
        this.generateQRCode();
    }

    switchPaymentMethod(method) {
        document.querySelectorAll('.payment-method-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`[data-method="${method}"]`)?.classList.add('active');

        document.getElementById('cardPaymentForm').style.display = method === 'card' ? 'block' : 'none';
        document.getElementById('qrPaymentForm').style.display  = method === 'qr'   ? 'block' : 'none';
        document.getElementById('upiPaymentForm').style.display = method === 'upi'  ? 'block' : 'none';

        if (method === 'qr') this.startQRTimer();
    }

    formatCardNumber(e) {
        let val = e.target.value.replace(/\D/g, '').slice(0, 16);
        val = val.replace(/(.{4})/g, '$1 ').trim();
        e.target.value = val;

        const display = val || '•••• •••• •••• ••••';
        document.getElementById('ccNumberDisplay').textContent = display.padEnd(19, '•').replace(/\d(?=.{5})/g, '•');

        // Detect card brand
        const raw = val.replace(/\s/g, '');
        const brandIcon = document.getElementById('ccBrandIcon');
        if (/^4/.test(raw)) { brandIcon.className = 'fab fa-cc-visa cc-brand'; }
        else if (/^5[1-5]/.test(raw)) { brandIcon.className = 'fab fa-cc-mastercard cc-brand'; }
        else if (/^3[47]/.test(raw)) { brandIcon.className = 'fab fa-cc-amex cc-brand'; }
        else { brandIcon.className = 'fas fa-credit-card cc-brand'; }
    }

    formatCardExpiry(e) {
        let val = e.target.value.replace(/\D/g, '').slice(0, 4);
        if (val.length >= 3) val = val.slice(0, 2) + '/' + val.slice(2);
        e.target.value = val;
        document.getElementById('ccExpiryDisplay').textContent = val || 'MM/YY';
    }

    processCardPayment() {
        const num    = document.getElementById('cardNumber').value.replace(/\s/g, '');
        const name   = document.getElementById('cardName').value.trim();
        const expiry = document.getElementById('cardExpiry').value;
        const cvv    = document.getElementById('cardCVV').value;

        if (num.length < 16)  { this.showError('Enter a valid 16-digit card number'); return; }
        if (!name)            { this.showError('Enter the cardholder name'); return; }
        if (expiry.length < 5){ this.showError('Enter a valid expiry date'); return; }
        if (cvv.length < 3)   { this.showError('Enter a valid CVV'); return; }

        this.completePayment('card');
    }

    generateQRCode() {
        const canvas = document.getElementById('qrCanvas');
        const placeholder = document.querySelector('.qr-placeholder');
        if (!canvas) return;

        const ref = 'MR-' + Math.random().toString(36).slice(2, 8).toUpperCase();
        document.getElementById('qrRefDisplay').textContent = `Ref: ${ref}`;

        // Draw a simple QR-like pattern on canvas (visual mock)
        const ctx = canvas.getContext('2d');
        const size = 200;
        ctx.clearRect(0, 0, size, size);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);

        const cellSize = 8;
        const cols = Math.floor(size / cellSize);
        ctx.fillStyle = '#1a1a2e';

        // Seed-based pseudo-random for consistent pattern
        let seed = ref.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        const rand = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0xffffffff; };

        for (let r = 0; r < cols; r++) {
            for (let c = 0; c < cols; c++) {
                if (rand() > 0.5) {
                    ctx.fillRect(c * cellSize, r * cellSize, cellSize - 1, cellSize - 1);
                }
            }
        }

        // Draw finder patterns (corners)
        const drawFinder = (x, y) => {
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(x, y, 7 * cellSize, 7 * cellSize);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x + cellSize, y + cellSize, 5 * cellSize, 5 * cellSize);
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(x + 2 * cellSize, y + 2 * cellSize, 3 * cellSize, 3 * cellSize);
        };
        drawFinder(0, 0);
        drawFinder((cols - 7) * cellSize, 0);
        drawFinder(0, (cols - 7) * cellSize);

        canvas.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';

        this.startQRTimer();
    }

    startQRTimer() {
        if (this.qrTimerInterval) clearInterval(this.qrTimerInterval);
        let seconds = 300; // 5 minutes
        const fill = document.getElementById('qrTimerFill');
        const text = document.getElementById('qrExpiresText');

        const tick = () => {
            seconds--;
            const pct = (seconds / 300) * 100;
            if (fill) fill.style.width = pct + '%';
            const m = Math.floor(seconds / 60);
            const s = seconds % 60;
            if (text) text.innerHTML = `QR expires in <strong>${m}:${String(s).padStart(2, '0')}</strong>`;
            if (seconds <= 0) {
                clearInterval(this.qrTimerInterval);
                if (text) text.innerHTML = '<strong style="color:var(--md-error)">QR expired — please refresh</strong>';
                if (fill) fill.style.background = 'var(--md-error)';
            }
        };
        tick();
        this.qrTimerInterval = setInterval(tick, 1000);
    }

    confirmQRPayment() {
        this.completePayment('qr');
    }

    processUPIPayment() {
        const upiId = document.getElementById('upiId').value.trim();
        if (!upiId || !upiId.includes('@')) { this.showError('Enter a valid UPI ID (e.g. name@upi)'); return; }
        this.completePayment('upi');
    }

    completePayment(method) {
        if (!this.pendingBooking) { this.showError('No booking to pay for'); return; }

        const ticketNumber = '#' + Math.floor(10000 + Math.random() * 90000);
        const ticket = {
            id: Date.now().toString(),
            ticketNumber,
            ...this.pendingBooking,
            method,
            paidAt: new Date().toISOString(),
            status: 'active'
        };

        // Save to localStorage
        const tickets = this.getSavedTickets();
        tickets.unshift(ticket);
        localStorage.setItem('mr_tickets', JSON.stringify(tickets));

        this.pendingBooking = null;

        // Hide payment section, reset form
        document.getElementById('paymentSection').style.display = 'none';
        document.getElementById('lotSelect').value = '';
        document.getElementById('vehicleNumber').value = '';
        document.getElementById('bookingLotName').textContent = 'Select a Parking Lot';
        document.getElementById('bookingLotAddr').textContent = 'Choose from the Map page';
        document.getElementById('bookingDuration').textContent = '--';
        document.getElementById('bookingAmount').textContent = '--';

        if (this.qrTimerInterval) clearInterval(this.qrTimerInterval);

        this.showSuccess(`✅ Payment confirmed! Ticket ${ticketNumber}`);
        this.updateActiveTicketBanner();

        // Switch to My Tickets tab
        setTimeout(() => {
            const ticketsTabBtn = document.getElementById('tickets-tab');
            if (ticketsTabBtn) {
                bootstrap.Tab.getOrCreateInstance(ticketsTabBtn).show();
                this.renderTicketsList();
            }
        }, 1200);
    }

    getSavedTickets() {
        try {
            return JSON.parse(localStorage.getItem('mr_tickets') || '[]');
        } catch { return []; }
    }

    renderTicketsList() {
        const list = document.getElementById('ticketsList');
        const noMsg = document.getElementById('noTicketsMsg');
        if (!list) return;

        const tickets = this.getSavedTickets();

        if (!tickets.length) {
            if (noMsg) noMsg.style.display = 'flex';
            return;
        }

        if (noMsg) noMsg.style.display = 'none';

        // Remove old ticket cards (keep noMsg)
        list.querySelectorAll('.ticket-card').forEach(el => el.remove());

        tickets.forEach(t => {
            const methodIcon = { card: 'fa-credit-card', qr: 'fa-qrcode', upi: 'fa-mobile-screen-button' }[t.method] || 'fa-wallet';
            const statusClass = t.status === 'active' ? 'active' : 'expired';
            const card = document.createElement('div');
            card.className = 'ticket-card';
            card.innerHTML = `
                <div class="ticket-card-header">
                    <div>
                        <p class="ticket-card-lot">${t.lotName}</p>
                        <p class="ticket-card-addr">${t.lotAddr}</p>
                    </div>
                    <span class="ticket-status-chip ${statusClass}">${t.status}</span>
                </div>
                <div class="ticket-card-body">
                    <div class="ticket-detail">
                        <i class="fas fa-calendar-day"></i>
                        <span>${t.date}</span>
                    </div>
                    <div class="ticket-detail">
                        <i class="fas fa-clock"></i>
                        <span>${t.startTime} · ${t.duration}hr${t.duration > 1 ? 's' : ''}</span>
                    </div>
                    <div class="ticket-detail">
                        <i class="fas fa-car"></i>
                        <span>${t.vehicle}</span>
                    </div>
                    <div class="ticket-detail">
                        <i class="fas ${methodIcon}"></i>
                        <span>$${t.amount.toFixed(2)} via ${t.method.toUpperCase()}</span>
                    </div>
                </div>
                <div class="ticket-card-footer">
                    <span class="ticket-number">${t.ticketNumber}</span>
                    <button class="btn btn-outline-danger" style="padding:6px 12px;font-size:0.75rem;" onclick="app.deleteTicket('${t.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            list.appendChild(card);
        });
    }

    deleteTicket(id) {
        if (!confirm('Delete this ticket?')) return;
        const tickets = this.getSavedTickets().filter(t => t.id !== id);
        localStorage.setItem('mr_tickets', JSON.stringify(tickets));
        this.renderTicketsList();
        this.updateActiveTicketBanner();
    }

    updateActiveTicketBanner() {
        const banner = document.getElementById('activeTicketBanner');
        if (!banner) return;

        const tickets = this.getSavedTickets();
        const active = tickets.find(t => t.status === 'active');

        if (!active) {
            banner.style.display = 'none';
            return;
        }

        banner.style.display = 'flex';
        document.getElementById('ticketBannerTitle').textContent = active.lotName;
        document.getElementById('ticketBannerSub').textContent = `${active.vehicle} · ${active.duration}hr${active.duration > 1 ? 's' : ''}`;
        document.getElementById('ticketTimerDisplay').textContent = active.startTime || '--:--';
    }

    viewActiveTicket() {
        const ticketsTabBtn = document.getElementById('tickets-tab');
        if (ticketsTabBtn) {
            bootstrap.Tab.getOrCreateInstance(ticketsTabBtn).show();
            this.renderTicketsList();
        }
    }
}

// Initialize app when DOM is ready
const app = new MotoReadyApp();

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

// Make app available globally for onclick handlers
window.app = app;

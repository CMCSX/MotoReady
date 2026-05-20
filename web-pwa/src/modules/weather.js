/**
 * Weather Module - Open-Meteo API Integration
 * Fetches weather data and provides caching for offline access
 * Uses Open-Meteo (free, no API key required)
 */

import { db } from './db.js';

const API_BASE = 'https://api.open-meteo.com/v1/forecast';

class WeatherModule {
    constructor() {
        this.currentLocation = null;
        this.currentWeather = null;
    }

    /**
     * Get user's current position with high accuracy.
     *
     * Strategy:
     *  1. Start a watchPosition with enableHighAccuracy so the device
     *     progressively refines the fix (cell → WiFi → GPS).
     *  2. Accept the first fix that is ≤ 100 m accurate, OR the best fix
     *     seen after 10 seconds, whichever comes first.
     *  3. Fall back to a single low-accuracy fix if the device doesn't
     *     support high-accuracy or times out entirely.
     */
    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported by this browser'));
                return;
            }

            const ACCURACY_THRESHOLD = 100; // metres — good enough for weather
            const MAX_WAIT_MS        = 12000; // wait up to 12 s for a good fix
            let bestPosition         = null;
            let watchId              = null;
            let timeoutId            = null;

            const finish = (position) => {
                if (watchId !== null) navigator.geolocation.clearWatch(watchId);
                if (timeoutId !== null) clearTimeout(timeoutId);
                watchId  = null;
                timeoutId = null;

                const { latitude, longitude, accuracy } = position.coords;
                console.log(`📍 Location fix: ${latitude.toFixed(5)}, ${longitude.toFixed(5)} ±${Math.round(accuracy)}m`);
                this.currentLocation = { latitude, longitude, accuracy };
                resolve(this.currentLocation);
            };

            const onSuccess = (position) => {
                // Keep the most accurate fix seen so far
                if (!bestPosition || position.coords.accuracy < bestPosition.coords.accuracy) {
                    bestPosition = position;
                }

                // Accept immediately if accurate enough
                if (position.coords.accuracy <= ACCURACY_THRESHOLD) {
                    finish(position);
                }
            };

            const onError = (error) => {
                // If we already have a rough fix, use it rather than failing
                if (bestPosition) {
                    console.warn('⚠️ High-accuracy timed out, using best available fix');
                    finish(bestPosition);
                    return;
                }

                // Last resort: try a single low-accuracy fix
                console.warn('⚠️ High-accuracy failed, falling back to low-accuracy:', error.message);
                navigator.geolocation.getCurrentPosition(
                    resolve,
                    (fallbackErr) => {
                        // Signal to the caller that we need manual input
                        const err = new Error('LOCATION_UNAVAILABLE');
                        err.code = fallbackErr.code; // 1 = denied, 2 = unavailable, 3 = timeout
                        reject(err);
                    },
                    { timeout: 8000, maximumAge: 30000, enableHighAccuracy: false }
                );
            };

            // Start watching — device will refine from coarse → fine
            watchId = navigator.geolocation.watchPosition(onSuccess, onError, {
                enableHighAccuracy: true,
                timeout: MAX_WAIT_MS,
                maximumAge: 0          // always request a fresh fix
            });

            // Hard deadline: use best fix seen so far after MAX_WAIT_MS
            timeoutId = setTimeout(() => {
                if (bestPosition) {
                    console.warn('⏱️ Location timeout — using best fix so far');
                    finish(bestPosition);
                } else {
                    const err = new Error('LOCATION_UNAVAILABLE');
                    err.code = 3;
                    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
                    reject(err);
                }
            }, MAX_WAIT_MS);
        });
    }

    /**
     * Reverse-geocode coordinates to a human-readable city name
     * using the free Nominatim API (no key required).
     */
    async reverseGeocode(latitude, longitude) {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`;
            const res = await fetch(url, {
                headers: { 'Accept-Language': 'en' }
            });
            if (!res.ok) throw new Error(`Nominatim ${res.status}`);
            const data = await res.json();

            // Pick the most useful name: city > town > village > county > state
            const a = data.address || {};
            return (
                a.city       ||
                a.town       ||
                a.village    ||
                a.suburb     ||
                a.county     ||
                a.state      ||
                data.display_name?.split(',')[0] ||
                'Unknown'
            );
        } catch (err) {
            console.warn('Reverse geocode failed:', err.message);
            return 'Unknown';
        }
    }

    /**
     * Fetch weather from Open-Meteo API (free, no API key needed)
     */
    async fetchWeatherFromAPI(latitude, longitude, overrideName = null) {
        try {
            const url = new URL(API_BASE);
            url.searchParams.append('latitude', latitude);
            url.searchParams.append('longitude', longitude);
            url.searchParams.append('current', [
                'temperature_2m',
                'relative_humidity_2m',
                'apparent_temperature',
                'weather_code',
                'wind_speed_10m'
            ].join(','));
            url.searchParams.append('temperature_unit', 'celsius');
            url.searchParams.append('wind_speed_unit', 'kmh');
            url.searchParams.append('timezone', 'auto');

            // If a name was passed in (manual city search), skip reverse geocoding
            const [weatherRes, locationName] = await Promise.all([
                fetch(url.toString()),
                overrideName ? Promise.resolve(overrideName) : this.reverseGeocode(latitude, longitude)
            ]);

            if (!weatherRes.ok) throw new Error(`API error: ${weatherRes.status}`);

            const data = await weatherRes.json();
            const transformed = this.transformOpenMeteoData(data, latitude, longitude, locationName);

            // Cache the result
            await db.cacheWeatherData(
                `${latitude.toFixed(2)},${longitude.toFixed(2)}`,
                latitude,
                longitude,
                transformed
            );

            this.currentWeather = transformed;
            return transformed;
        } catch (error) {
            console.error('Weather fetch error:', error);
            throw error;
        }
    }

    /**
     * Transform Open-Meteo API response to our internal format
     */
    transformOpenMeteoData(data, latitude, longitude, locationName = 'Unknown') {
        const current = data.current;
        const weatherDescription = this.getWeatherDescription(current.weather_code);
        const weatherIcon        = this.getWeatherIcon(current.weather_code);

        return {
            name: locationName,
            coord: { lat: latitude, lon: longitude },
            weather: [{ icon: weatherIcon, description: weatherDescription }],
            main: {
                temp:      current.temperature_2m,
                feels_like: current.apparent_temperature,
                humidity:  current.relative_humidity_2m
            },
            wind:   { speed: current.wind_speed_10m },
            clouds: { all: this.estimateCloudCover(current.weather_code) }
        };
    }

    /**
     * Get weather description from WMO weather code
     */
    getWeatherDescription(code) {
        const descriptions = {
            0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
            45: 'Foggy', 48: 'Rime fog',
            51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
            61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
            71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow', 77: 'Snow grains',
            80: 'Slight showers', 81: 'Moderate showers', 82: 'Violent showers',
            85: 'Slight snow showers', 86: 'Heavy snow showers',
            95: 'Thunderstorm', 96: 'Thunderstorm + hail', 99: 'Thunderstorm + heavy hail'
        };
        return descriptions[code] || 'Unknown';
    }

    /**
     * Map WMO weather code to icon string
     */
    getWeatherIcon(code) {
        if (code === 0)                        return '01d';
        if (code === 1 || code === 2)          return '02d';
        if (code === 3)                        return '04d';
        if (code === 45 || code === 48)        return '50d';
        if (code >= 51 && code <= 55)          return '09d';
        if (code >= 61 && code <= 65)          return '10d';
        if (code >= 71 && code <= 77)          return '13d';
        if (code >= 80 && code <= 82)          return '10d';
        if (code >= 85 && code <= 86)          return '13d';
        if (code >= 95 && code <= 99)          return '11d';
        return '04d';
    }

    /**
     * Estimate cloud cover percentage from WMO code
     */
    estimateCloudCover(code) {
        if (code === 0)  return 0;
        if (code === 1)  return 25;
        if (code === 2)  return 50;
        if (code === 3)  return 90;
        if (code === 45 || code === 48) return 70;
        if (code >= 51)  return 85;
        return 50;
    }

    /**
     * Get weather — tries live API first, falls back to cache
     */
    async getWeather() {
        try {
            const location = await this.getCurrentPosition();

            try {
                return await this.fetchWeatherFromAPI(location.latitude, location.longitude);
            } catch (apiError) {
                console.warn('API unavailable, checking cache:', apiError.message);
                const cached = await db.getLatestWeather(
                    `${location.latitude.toFixed(2)},${location.longitude.toFixed(2)}`
                );
                if (cached?.weatherData) {
                    return JSON.parse(cached.weatherData);
                }
                throw new Error('No cached weather available and API is unreachable.');
            }
        } catch (error) {
            console.error('getWeather error:', error);
            throw error;
        }
    }

    /**
     * Geocode a city name to coordinates via Nominatim, then fetch weather.
     * Called when GPS is unavailable and the user types a city manually.
     */
    async getWeatherForCity(cityName) {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&limit=1&addressdetails=1`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
        if (!res.ok) throw new Error('City search failed. Check your connection.');

        const results = await res.json();
        if (!results.length) throw new Error(`Could not find "${cityName}". Try a different city name.`);

        const { lat, lon, address } = results[0];
        const latitude  = parseFloat(lat);
        const longitude = parseFloat(lon);

        // Build a clean display name from address parts
        const a = address || {};
        const displayName = a.city || a.town || a.village || a.county || cityName;

        this.currentLocation = { latitude, longitude, accuracy: null };
        return this.fetchWeatherFromAPI(latitude, longitude, displayName);
    }

    /**
     * Format raw weather data for display
     */
    formatWeatherData(data) {
        if (!data) return null;
        return {
            location:    data.name || 'Unknown',
            temperature: Math.round(data.main?.temp    ?? 0),
            feelsLike:   Math.round(data.main?.feels_like ?? 0),
            humidity:    data.main?.humidity ?? 0,
            description: data.weather?.[0]?.description || 'Clear',
            windSpeed:   (data.wind?.speed ?? 0).toFixed(1),
            rainChance:  data.clouds?.all ?? 0,
            icon:        data.weather?.[0]?.icon || '01d',
            latitude:    data.coord?.lat,
            longitude:   data.coord?.lon,
            timestamp:   new Date().toLocaleTimeString()
        };
    }

    /**
     * Map icon code to Font Awesome class
     */
    getFontAwesomeIcon(iconCode) {
        const iconMap = {
            '01d': 'fa-sun',        '01n': 'fa-moon',
            '02d': 'fa-cloud-sun',  '02n': 'fa-cloud-moon',
            '03d': 'fa-cloud',      '03n': 'fa-cloud',
            '04d': 'fa-cloud',      '04n': 'fa-cloud',
            '09d': 'fa-cloud-rain', '09n': 'fa-cloud-rain',
            '10d': 'fa-cloud-rain', '10n': 'fa-cloud-rain',
            '11d': 'fa-bolt',       '11n': 'fa-bolt',
            '13d': 'fa-snowflake',  '13n': 'fa-snowflake',
            '50d': 'fa-smog',       '50n': 'fa-smog'
        };
        return iconMap[iconCode] || 'fa-cloud';
    }
}

export const weather = new WeatherModule();

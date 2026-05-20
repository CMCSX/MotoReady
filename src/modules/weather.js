import * as Location from 'expo-location';
import { db } from './storage';

const API_BASE = 'https://api.open-meteo.com/v1/forecast';

class WeatherModule {
  constructor() {
    this.currentLocation = null;
    this.currentWeather = null;
  }

  /**
   * Request location permission and get current coordinates
   */
  async getCurrentPosition() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('PERMISSION_DENIED');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      this.currentLocation = { latitude, longitude };
      return this.currentLocation;
    } catch (error) {
      console.warn('Geolocation failed:', error.message);
      throw new Error('LOCATION_UNAVAILABLE');
    }
  }

  /**
   * Reverse-geocode coordinates to a city name using OpenStreetMap's Nominatim
   */
  async reverseGeocode(latitude, longitude) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'MotoReadyMobile/1.0', 'Accept-Language': 'en' }
      });
      if (!res.ok) throw new Error(`Nominatim error: ${res.status}`);
      const data = await res.json();

      const a = data.address || {};
      return (
        a.city ||
        a.town ||
        a.village ||
        a.suburb ||
        a.county ||
        a.state ||
        data.display_name?.split(',')[0] ||
        'Unknown'
      );
    } catch (err) {
      console.warn('Reverse geocode failed:', err.message);
      return 'Unknown';
    }
  }

  /**
   * Fetch weather from Open-Meteo API
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

      const [weatherRes, locationName] = await Promise.all([
        fetch(url.toString()),
        overrideName ? Promise.resolve(overrideName) : this.reverseGeocode(latitude, longitude)
      ]);

      if (!weatherRes.ok) throw new Error(`API error: ${weatherRes.status}`);

      const data = await weatherRes.json();
      const formatted = this.transformOpenMeteoData(data, latitude, longitude, locationName);

      // Cache it
      await db.cacheWeatherData(locationName, latitude, longitude, formatted);

      this.currentWeather = formatted;
      return formatted;
    } catch (error) {
      console.error('Weather fetch error:', error);
      throw error;
    }
  }

  /**
   * Transform API response to format
   */
  transformOpenMeteoData(data, latitude, longitude, locationName = 'Unknown') {
    const current = data.current;
    const weatherDescription = this.getWeatherDescription(current.weather_code);
    const weatherIcon = this.getWeatherIcon(current.weather_code);

    return {
      location: locationName,
      temperature: Math.round(current.temperature_2m),
      feelsLike: Math.round(current.apparent_temperature),
      humidity: current.relative_humidity_2m,
      description: weatherDescription,
      windSpeed: current.wind_speed_10m.toFixed(1),
      rainChance: this.estimateCloudCover(current.weather_code), // use cloud cover as proxy for rain probability in recommendations
      icon: weatherIcon,
      latitude,
      longitude,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  }

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

  getWeatherIcon(code) {
    if (code === 0) return 'sun';
    if (code === 1 || code === 2) return 'cloud-sun';
    if (code === 3) return 'cloud';
    if (code === 45 || code === 48) return 'smog';
    if (code >= 51 && code <= 55) return 'cloud-rain';
    if (code >= 61 && code <= 65) return 'cloud-showers-heavy';
    if (code >= 71 && code <= 77) return 'snowflake';
    if (code >= 80 && code <= 82) return 'cloud-rain';
    if (code >= 85 && code <= 86) return 'snowflake';
    if (code >= 95 && code <= 99) return 'cloud-bolt';
    return 'cloud';
  }

  estimateCloudCover(code) {
    if (code === 0) return 0;
    if (code === 1) return 25;
    if (code === 2) return 50;
    if (code === 3) return 90;
    if (code === 45 || code === 48) return 70;
    if (code >= 51) return 85;
    return 50;
  }

  /**
   * Fetch weather based on current location
   */
  async getWeather() {
    try {
      const location = await this.getCurrentPosition();
      return await this.fetchWeatherFromAPI(location.latitude, location.longitude);
    } catch (error) {
      console.error('getWeather error:', error);
      throw error;
    }
  }

  /**
   * Geocode a city name and fetch its weather
   */
  async getWeatherForCity(cityName) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&limit=1&addressdetails=1`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'MotoReadyMobile/1.0', 'Accept-Language': 'en' }
      });
      if (!res.ok) throw new Error('City search failed.');

      const results = await res.json();
      if (!results.length) throw new Error(`Could not find "${cityName}".`);

      const { lat, lon, address } = results[0];
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lon);

      const a = address || {};
      const displayName = a.city || a.town || a.village || a.county || cityName;

      this.currentLocation = { latitude, longitude };
      return await this.fetchWeatherFromAPI(latitude, longitude, displayName);
    } catch (err) {
      console.error('getWeatherForCity error:', err);
      throw err;
    }
  }
}

export const weather = new WeatherModule();

/**
 * Parking Module - Parking Location Management
 * Handles saving, retrieving, and displaying parking locations
 */

import { db } from './db.js';

class ParkingModule {
    constructor() {
        this.currentLocation = null;
        this.map = null;
        this.markers = [];
    }

    /**
     * Get current GPS location with high accuracy.
     * Uses watchPosition to progressively refine the fix,
     * accepting the first reading ≤ 20 m or the best after 15 s.
     */
    getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }

            const ACCURACY_THRESHOLD = 20;  // metres — tight for parking
            const MAX_WAIT_MS        = 15000;
            let bestPosition         = null;
            let watchId              = null;
            let timeoutId            = null;

            const finish = (position) => {
                if (watchId !== null) navigator.geolocation.clearWatch(watchId);
                if (timeoutId !== null) clearTimeout(timeoutId);
                watchId   = null;
                timeoutId = null;

                const { latitude, longitude, accuracy } = position.coords;
                console.log(`📍 Parking fix: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} ±${Math.round(accuracy)}m`);
                this.currentLocation = { latitude, longitude, accuracy };
                resolve(this.currentLocation);
            };

            const onSuccess = (position) => {
                if (!bestPosition || position.coords.accuracy < bestPosition.coords.accuracy) {
                    bestPosition = position;
                }
                if (position.coords.accuracy <= ACCURACY_THRESHOLD) {
                    finish(position);
                }
            };

            const onError = (error) => {
                if (bestPosition) {
                    console.warn('⚠️ GPS timeout — using best available fix');
                    finish(bestPosition);
                    return;
                }
                reject(new Error(
                    error.code === 1
                        ? 'Location permission denied. Please allow location access.'
                        : 'Could not get GPS location. Make sure GPS is enabled.'
                ));
            };

            watchId = navigator.geolocation.watchPosition(onSuccess, onError, {
                enableHighAccuracy: true,
                timeout: MAX_WAIT_MS,
                maximumAge: 0
            });

            timeoutId = setTimeout(() => {
                if (bestPosition) {
                    console.warn('⏱️ Parking location timeout — using best fix');
                    finish(bestPosition);
                } else {
                    onError({ code: 3, message: 'Timeout' });
                }
            }, MAX_WAIT_MS);
        });
    }

    /**
     * Save parking location
     */
    async saveParkingLocation(notes = '', photoData = null) {
        try {
            if (!this.currentLocation) {
                throw new Error('No location captured');
            }

            const parking = await db.addParkingLocation(
                this.currentLocation.latitude,
                this.currentLocation.longitude,
                photoData,
                notes
            );

            console.log('✅ Parking location saved:', parking);
            return parking;
        } catch (error) {
            console.error('Error saving parking:', error);
            throw error;
        }
    }

    /**
     * Get all parking locations
     */
    async getAllParkingLocations() {
        try {
            const locations = await db.getParkingLocations();
            return locations.sort((a, b) => 
                new Date(b.timestamp) - new Date(a.timestamp)
            );
        } catch (error) {
            console.error('Error getting parking locations:', error);
            return [];
        }
    }

    /**
     * Delete parking location
     */
    async deleteParkingLocation(id) {
        try {
            await db.deleteParkingLocation(id);
            console.log('✅ Parking location deleted');
            return true;
        } catch (error) {
            console.error('Error deleting parking:', error);
            throw error;
        }
    }

    /**
     * Calculate distance between two points (Haversine formula)
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return (R * c).toFixed(2);
    }

    /**
     * Initialize map
     */
    initializeMap(mapElementId) {
        try {
            this.map = L.map(mapElementId).setView([0, 0], 13);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(this.map);

            console.log('✅ Map initialized');
            return this.map;
        } catch (error) {
            console.error('Error initializing map:', error);
            throw error;
        }
    }

    /**
     * Add parking marker to map
     */
    addMarkerToMap(parking, isCurrentLocation = false) {
        try {
            if (!this.map) {
                console.warn('Map not initialized');
                return;
            }

            const marker = L.marker(
                [parking.latitude, parking.longitude],
                {
                    title: parking.notes || 'Parking Location',
                    icon: L.icon({
                        iconUrl: isCurrentLocation 
                            ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png'
                            : 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41]
                    })
                }
            ).addTo(this.map);

            const date = new Date(parking.timestamp).toLocaleString();
            const popupContent = `
                <div style="width: 200px;">
                    ${parking.photoData ? `<img src="${parking.photoData}" style="width: 100%; border-radius: 4px; margin-bottom: 8px;">` : ''}
                    <p><strong>${parking.notes || 'Parking Location'}</strong></p>
                    <p><small>${date}</small></p>
                    <p><small>${parking.latitude.toFixed(4)}, ${parking.longitude.toFixed(4)}</small></p>
                </div>
            `;

            marker.bindPopup(popupContent);
            this.markers.push(marker);

            return marker;
        } catch (error) {
            console.error('Error adding marker:', error);
        }
    }

    /**
     * Display all parking locations on map
     */
    async displayAllParkings(mapElementId) {
        try {
            if (!this.map) {
                this.initializeMap(mapElementId);
            }

            // Clear existing markers
            this.markers.forEach(marker => marker.remove());
            this.markers = [];

            // Get all parkings
            const parkings = await this.getAllParkingLocations();

            if (parkings.length === 0) {
                // Default to a central location
                this.map.setView([40, 0], 2);
                return;
            }

            // Add markers
            parkings.forEach((parking, index) => {
                this.addMarkerToMap(parking, index === 0);
            });

            // Fit map to all markers
            if (this.markers.length > 0) {
                const group = new L.featureGroup(this.markers);
                this.map.fitBounds(group.getBounds(), { padding: [50, 50] });
            }
        } catch (error) {
            console.error('Error displaying parkings:', error);
        }
    }

    /**
     * Format parking data for display
     */
    formatParkingData(parking) {
        const date = new Date(parking.timestamp);
        return {
            id: parking.id,
            latitude: parking.latitude,
            longitude: parking.longitude,
            notes: parking.notes || 'No notes',
            photoData: parking.photoData,
            timestamp: date.toLocaleString(),
            date: date.toLocaleDateString(),
            time: date.toLocaleTimeString()
        };
    }

    /**
     * Generate shareable location link
     */
    generateMapLink(latitude, longitude) {
        return `https://www.google.com/maps/?q=${latitude},${longitude}`;
    }
}

export const parking = new ParkingModule();

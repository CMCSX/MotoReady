/**
 * Gear Logic Module - Weather-to-Gear Recommendations
 * Generates intelligent gear suggestions based on weather conditions
 */

class GearLogicModule {
    constructor() {
        this.gearDatabase = {
            'jacket': {
                icon: 'fa-vest',
                color: '#ff6b35'
            },
            'rain-gear': {
                icon: 'fa-umbrella',
                color: '#3498db'
            },
            'gloves': {
                icon: 'fa-hands',
                color: '#e74c3c'
            },
            'helmet': {
                icon: 'fa-helmet-safety',
                color: '#95a5a6'
            },
            'boots': {
                icon: 'fa-shoe-prints',
                color: '#2c3e50'
            },
            'thermal': {
                icon: 'fa-shirt',
                color: '#f39c12'
            },
            'light-clothing': {
                icon: 'fa-tshirt',
                color: '#ecf0f1'
            },
            'sunscreen': {
                icon: 'fa-sun',
                color: '#f1c40f'
            },
            'visibility-vest': {
                icon: 'fa-vest-patches',
                color: '#e67e22'
            }
        };
    }

    /**
     * Generate gear recommendations based on weather
     */
    getGearRecommendations(weatherData) {
        if (!weatherData) return [];

        const temp = weatherData.temperature || weatherData.temp;
        const feelsLike = weatherData.feelsLike || weatherData.feels_like;
        const rainChance = weatherData.rainChance || weatherData.clouds?.all || 0;
        const humidity = weatherData.humidity || 0;
        const description = (weatherData.description || '').toLowerCase();
        const windSpeed = parseFloat(weatherData.windSpeed || 0);

        const recommendations = [];

        // Helmet - Always required
        recommendations.push({
            item: 'helmet',
            priority: 'critical',
            reason: 'Safety essential',
            icon: this.gearDatabase['helmet'].icon
        });

        // Temperature-based recommendations
        if (temp <= 0) {
            recommendations.push({
                item: 'thermal',
                priority: 'critical',
                reason: `Freezing (${temp}°C) - Heavy thermal protection needed`,
                icon: this.gearDatabase['thermal'].icon
            });
            recommendations.push({
                item: 'jacket',
                priority: 'critical',
                reason: 'Insulated winter jacket required',
                icon: this.gearDatabase['jacket'].icon
            });
            recommendations.push({
                item: 'gloves',
                priority: 'critical',
                reason: 'Insulated gloves to prevent frostbite',
                icon: this.gearDatabase['gloves'].icon
            });
            recommendations.push({
                item: 'boots',
                priority: 'critical',
                reason: 'Waterproof, insulated boots',
                icon: this.gearDatabase['boots'].icon
            });
        } else if (temp <= 10) {
            recommendations.push({
                item: 'thermal',
                priority: 'high',
                reason: `Cold (${temp}°C) - Thermal layers recommended`,
                icon: this.gearDatabase['thermal'].icon
            });
            recommendations.push({
                item: 'jacket',
                priority: 'high',
                reason: 'Heavy jacket needed',
                icon: this.gearDatabase['jacket'].icon
            });
            recommendations.push({
                item: 'gloves',
                priority: 'high',
                reason: 'Insulated gloves needed',
                icon: this.gearDatabase['gloves'].icon
            });
        } else if (temp <= 15) {
            recommendations.push({
                item: 'jacket',
                priority: 'high',
                reason: `Cool (${temp}°C) - Layer up`,
                icon: this.gearDatabase['jacket'].icon
            });
            recommendations.push({
                item: 'gloves',
                priority: 'medium',
                reason: 'Gloves recommended for comfort',
                icon: this.gearDatabase['gloves'].icon
            });
        } else if (temp <= 25) {
            recommendations.push({
                item: 'jacket',
                priority: 'medium',
                reason: `Mild (${temp}°C) - Light jacket for protection`,
                icon: this.gearDatabase['jacket'].icon
            });
        } else if (temp > 25) {
            recommendations.push({
                item: 'light-clothing',
                priority: 'medium',
                reason: `Warm (${temp}°C) - Light, breathable clothing`,
                icon: this.gearDatabase['light-clothing'].icon
            });
            recommendations.push({
                item: 'sunscreen',
                priority: 'medium',
                reason: 'Apply sunscreen - exposed skin at risk',
                icon: this.gearDatabase['sunscreen'].icon
            });
        }

        // Rain recommendations
        if (rainChance > 20) {
            recommendations.push({
                item: 'rain-gear',
                priority: rainChance > 50 ? 'critical' : 'high',
                reason: `${rainChance}% chance of rain - Waterproof protection`,
                icon: this.gearDatabase['rain-gear'].icon
            });
        }

        // Wind considerations
        if (windSpeed > 40) {
            recommendations.push({
                item: 'visibility-vest',
                priority: 'high',
                reason: `Strong wind (${windSpeed} km/h) - High-visibility gear`,
                icon: this.gearDatabase['visibility-vest'].icon
            });
        }

        // Humidity warning
        if (humidity > 80 && description.includes('rain')) {
            recommendations.push({
                item: 'rain-gear',
                priority: 'critical',
                reason: 'Very humid + rainy - Waterproofing critical',
                icon: this.gearDatabase['rain-gear'].icon
            });
        }

        // Deduplication - keep highest priority version
        const uniqueItems = new Map();
        const priorityOrder = { critical: 3, high: 2, medium: 1 };

        recommendations.forEach(rec => {
            const existing = uniqueItems.get(rec.item);
            if (!existing || priorityOrder[rec.priority] > priorityOrder[existing.priority]) {
                uniqueItems.set(rec.item, rec);
            }
        });

        // Convert to array and sort by priority
        return Array.from(uniqueItems.values()).sort((a, b) => {
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
    }

    /**
     * Get gear summary
     */
    getGearSummary(weatherData) {
        const recommendations = this.getGearRecommendations(weatherData);
        const critical = recommendations.filter(r => r.priority === 'critical');
        
        if (critical.length === 0) {
            return 'Standard riding gear recommended';
        }

        return `⚠️ ${critical.length} critical item(s) required`;
    }

    /**
     * Get detailed gear explanation
     */
    getDetailedExplanation(weatherData) {
        const temp = weatherData.temperature || 0;
        const rainChance = weatherData.rainChance || 0;
        const humidity = weatherData.humidity || 0;

        let explanation = `
📋 Gear Recommendation Analysis:

🌡️ Temperature: ${temp}°C
💧 Rain Chance: ${rainChance}%
💨 Humidity: ${humidity}%

`;

        if (temp <= 0) {
            explanation += '🥶 EXTREME COLD: This is serious freezing territory. Full thermal protection is mandatory.';
        } else if (temp <= 10) {
            explanation += '❄️ COLD: Bundle up with layers. Your exposed skin will suffer in these temps.';
        } else if (temp <= 15) {
            explanation += '🧊 COOL: Light layers and light protective gear.';
        } else if (temp <= 25) {
            explanation += '😊 MILD: Perfect riding weather. Minimal gear needed.';
        } else {
            explanation += '☀️ HOT: Breathable, light-colored clothing. Stay hydrated.';
        }

        if (rainChance > 50) {
            explanation += '\n🌧️ HIGH RAIN RISK: Waterproof gear is essential. Check your rain gear.';
        } else if (rainChance > 20) {
            explanation += '\n🌦️ MODERATE RAIN RISK: Have rain gear ready just in case.';
        }

        return explanation;
    }
}

export const gearLogic = new GearLogicModule();

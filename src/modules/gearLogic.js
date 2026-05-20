class GearLogicModule {
  constructor() {
    this.gearDatabase = {
      'jacket': { icon: 'vest', color: '#FF6B35' },
      'rain-gear': { icon: 'umbrella', color: '#3498DB' },
      'gloves': { icon: 'hands', color: '#E74C3C' },
      'helmet': { icon: 'helmet-safety', color: '#95A5A6' },
      'boots': { icon: 'shoe-prints', color: '#2C3E50' },
      'thermal': { icon: 'shirt', color: '#F39C12' },
      'light-clothing': { icon: 'shirt', color: '#ECF0F1' },
      'sunscreen': { icon: 'sun', color: '#F1C40F' },
      'visibility-vest': { icon: 'vest', color: '#E67E22' }
    };
  }

  /**
   * Generate gear recommendations based on weather
   */
  getGearRecommendations(weatherData) {
    if (!weatherData) return [];

    const temp = weatherData.temperature;
    const rainChance = weatherData.rainChance || 0;
    const humidity = weatherData.humidity || 0;
    const description = (weatherData.description || '').toLowerCase();
    const windSpeed = parseFloat(weatherData.windSpeed || 0);

    const recommendations = [];

    // Helmet - Always required
    recommendations.push({
      item: 'Helmet',
      priority: 'critical',
      reason: 'Safety essential',
      icon: this.gearDatabase['helmet'].icon,
      color: this.gearDatabase['helmet'].color
    });

    // Temperature-based recommendations
    if (temp <= 0) {
      recommendations.push({
        item: 'Thermal Layers',
        priority: 'critical',
        reason: `Freezing (${temp}°C) - Heavy thermal protection needed`,
        icon: this.gearDatabase['thermal'].icon,
        color: this.gearDatabase['thermal'].color
      });
      recommendations.push({
        item: 'Riding Jacket',
        priority: 'critical',
        reason: 'Insulated winter jacket required',
        icon: this.gearDatabase['jacket'].icon,
        color: this.gearDatabase['jacket'].color
      });
      recommendations.push({
        item: 'Riding Gloves',
        priority: 'critical',
        reason: 'Insulated gloves to prevent frostbite',
        icon: this.gearDatabase['gloves'].icon,
        color: this.gearDatabase['gloves'].color
      });
      recommendations.push({
        item: 'Riding Boots',
        priority: 'critical',
        reason: 'Waterproof, insulated boots',
        icon: this.gearDatabase['boots'].icon,
        color: this.gearDatabase['boots'].color
      });
    } else if (temp <= 10) {
      recommendations.push({
        item: 'Thermal Layers',
        priority: 'high',
        reason: `Cold (${temp}°C) - Thermal layers recommended`,
        icon: this.gearDatabase['thermal'].icon,
        color: this.gearDatabase['thermal'].color
      });
      recommendations.push({
        item: 'Riding Jacket',
        priority: 'high',
        reason: 'Heavy riding jacket needed',
        icon: this.gearDatabase['jacket'].icon,
        color: this.gearDatabase['jacket'].color
      });
      recommendations.push({
        item: 'Riding Gloves',
        priority: 'high',
        reason: 'Insulated gloves needed',
        icon: this.gearDatabase['gloves'].icon,
        color: this.gearDatabase['gloves'].color
      });
    } else if (temp <= 15) {
      recommendations.push({
        item: 'Riding Jacket',
        priority: 'high',
        reason: `Cool (${temp}°C) - Layer up`,
        icon: this.gearDatabase['jacket'].icon,
        color: this.gearDatabase['jacket'].color
      });
      recommendations.push({
        item: 'Riding Gloves',
        priority: 'medium',
        reason: 'Gloves recommended for comfort',
        icon: this.gearDatabase['gloves'].icon,
        color: this.gearDatabase['gloves'].color
      });
    } else if (temp <= 25) {
      recommendations.push({
        item: 'Riding Jacket',
        priority: 'medium',
        reason: `Mild (${temp}°C) - Light jacket for protection`,
        icon: this.gearDatabase['jacket'].icon,
        color: this.gearDatabase['jacket'].color
      });
    } else if (temp > 25) {
      recommendations.push({
        item: 'Light Clothing',
        priority: 'medium',
        reason: `Warm (${temp}°C) - Light, breathable clothing`,
        icon: this.gearDatabase['light-clothing'].icon,
        color: this.gearDatabase['light-clothing'].color
      });
      recommendations.push({
        item: 'Sunscreen',
        priority: 'medium',
        reason: 'Apply sunscreen - exposed skin at risk',
        icon: this.gearDatabase['sunscreen'].icon,
        color: this.gearDatabase['sunscreen'].color
      });
    }

    // Rain recommendations
    if (rainChance > 20) {
      recommendations.push({
        item: 'Rain Gear',
        priority: rainChance > 50 ? 'critical' : 'high',
        reason: `${rainChance}% chance of rain - Waterproof protection`,
        icon: this.gearDatabase['rain-gear'].icon,
        color: this.gearDatabase['rain-gear'].color
      });
    }

    // Wind considerations
    if (windSpeed > 40) {
      recommendations.push({
        item: 'Visibility Vest',
        priority: 'high',
        reason: `Strong wind (${windSpeed} km/h) - High-visibility gear`,
        icon: this.gearDatabase['visibility-vest'].icon,
        color: this.gearDatabase['visibility-vest'].color
      });
    }

    // Humidity warning
    if (humidity > 80 && description.includes('rain')) {
      recommendations.push({
        item: 'Rain Gear',
        priority: 'critical',
        reason: 'Very humid + rainy - Waterproofing critical',
        icon: this.gearDatabase['rain-gear'].icon,
        color: this.gearDatabase['rain-gear'].color
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
}

export const gearLogic = new GearLogicModule();

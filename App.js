import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FontAwesome6 } from '@expo/vector-icons';

// Theme & Screens
import { theme } from './src/styles/theme';
import HomeScreen from './src/screens/HomeScreen';
import ParkingScreen from './src/screens/ParkingScreen';
import MapScreen from './src/screens/MapScreen';
import TicketsScreen from './src/screens/TicketsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Tab = createBottomTabNavigator();

function CustomTabBar({ state, descriptors, navigation, isDarkMode }) {
  const currentTheme = isDarkMode ? theme.dark : theme.light;
  const colors = currentTheme.colors;
  const shadows = currentTheme.shadows;

  return (
    <View style={[
      styles.tabBarContainer, 
      shadows.level3, 
      { 
        backgroundColor: colors.secondaryContainer, 
        borderColor: colors.outlineVariant 
      }
    ]}>
      {state.routes.map((route, index) => {
        if (route.name === 'Profile') return null;
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate({ name: route.name, merge: true });
          }
        };

        let iconName;
        if (route.name === 'Home') {
          iconName = 'house';
        } else if (route.name === 'Parking') {
          iconName = 'motorcycle';
        } else if (route.name === 'Map') {
          iconName = 'map';
        } else if (route.name === 'Tickets') {
          iconName = 'ticket';
        } else if (route.name === 'Settings') {
          iconName = 'gear';
        }

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={[
              styles.tabItem,
              isFocused && [
                styles.tabItemActive,
                { backgroundColor: colors.surface }
              ]
            ]}
            activeOpacity={0.8}
          >
            <FontAwesome6
              name={iconName}
              size={18}
              color={isFocused ? colors.primary : colors.onSecondaryContainer}
            />
            {isFocused && (
              <Text 
                numberOfLines={1} 
                style={[
                  styles.tabLabel, 
                  { 
                    color: colors.onSurface,
                    fontFamily: theme.typography.fontFamily 
                  }
                ]}
              >
                {label}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const currentTheme = isDarkMode ? theme.dark : theme.light;
  const colors = currentTheme.colors;

  return (
    <NavigationContainer>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} backgroundColor={colors.surface} />
        
        <Tab.Navigator
          tabBar={(props) => <CustomTabBar {...props} isDarkMode={isDarkMode} />}
          screenOptions={{ headerShown: false }}
        >
          <Tab.Screen name="Home">
            {(props) => <HomeScreen {...props} isDarkMode={isDarkMode} />}
          </Tab.Screen>
          
          <Tab.Screen name="Parking">
            {(props) => <ParkingScreen {...props} isDarkMode={isDarkMode} />}
          </Tab.Screen>
          
          <Tab.Screen name="Map">
            {(props) => <MapScreen {...props} isDarkMode={isDarkMode} />}
          </Tab.Screen>
          
          <Tab.Screen name="Tickets">
            {(props) => <TicketsScreen {...props} isDarkMode={isDarkMode} />}
          </Tab.Screen>
          
          <Tab.Screen name="Settings">
            {(props) => (
              <SettingsScreen 
                {...props} 
                isDarkMode={isDarkMode} 
                onToggleDarkMode={(val) => setIsDarkMode(val)}
                onClearDataComplete={() => {
                  // Reload or reset app state if needed
                }}
              />
            )}
          </Tab.Screen>
          
          <Tab.Screen name="Profile">
            {(props) => <ProfileScreen {...props} isDarkMode={isDarkMode} />}
          </Tab.Screen>
        </Tab.Navigator>
      </View>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBarContainer: {
    position: 'absolute',
    bottom: 36,
    left: 20,
    right: 20,
    height: 64,
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    borderWidth: 1,
  },
  tabItem: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 4,
    marginVertical: 8,
  },
  tabItemActive: {
    flex: 2.2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
  }
});

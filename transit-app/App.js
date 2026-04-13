import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from './src/screens/HomeScreen';
import LineSelectScreen from './src/screens/LineSelectScreen';
import StationSelectScreen from './src/screens/StationSelectScreen';
import MonitorScreen from './src/screens/MonitorScreen';

import { setupNotifications } from './src/utils/notifications';

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    setupNotifications();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#1A56DB" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: { backgroundColor: '#1A56DB' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '700', fontSize: 17 },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: '#F4F6FB' },
          }}
        >
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: '이번 이동 🚇' }}
          />
          <Stack.Screen
            name="LineSelect"
            component={LineSelectScreen}
            options={{ title: '노선 선택' }}
          />
          <Stack.Screen
            name="StationSelect"
            component={StationSelectScreen}
            options={({ route }) => ({
              title: route.params?.step === 'from' ? '탑승역 선택' : '하차역 선택',
            })}
          />
          <Stack.Screen
            name="Monitor"
            component={MonitorScreen}
            options={({ route }) => ({
              title: `${route.params?.route?.fromStation ?? ''} → ${route.params?.route?.toStation ?? ''}`,
              headerBackVisible: false,
              gestureEnabled: false,
            })}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

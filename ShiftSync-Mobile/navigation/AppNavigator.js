import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import axios from 'axios';

import { navigationRef } from './navigationRef';
import { getBaseUrl } from '../services/api';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import AttendanceScreen from '../screens/AttendanceScreenLive';
import PayrollScreen from '../screens/PayrollScreen';
import RequestScreen from '../screens/RequestScreen';
import AvailabilityScreen from '../screens/AvailabilityScreen';
import ProfileScreen from '../screens/ProfileScreenApi';
import ApiTestHubScreen from '../screens/ApiTestHubScreen';
import MarketplaceScreen from '../screens/MarketplaceScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// 5-tab stack (chỉ hiển thị sau khi Login)
function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} />
      <Tab.Screen name="Payroll" component={PayrollScreen} />
      <Tab.Screen name="Request" component={RequestScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Login');

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        const refreshToken = await AsyncStorage.getItem('refreshToken');

        if (token) {
          // Nếu là token demo, vào thẳng app
          if (token === 'demo-token') {
            setInitialRoute('MainTabs');
            setIsLoading(false);
            return;
          }

          // Thử refresh token ngầm khi khởi động để phiên luôn tươi mới
          if (refreshToken) {
            try {
              const refreshUrl = `${getBaseUrl()}/auth/refresh`;
              const res = await axios.post(refreshUrl, { refreshToken }, { timeout: 4000 });
              if (res.data?.accessToken) {
                const newAccessToken = res.data.accessToken;
                const newRefreshToken = res.data.refreshToken || refreshToken;
                await AsyncStorage.multiSet([
                  ['accessToken', newAccessToken],
                  ['refreshToken', newRefreshToken],
                ]);
                console.log('[Auth Startup] Tự động làm mới phiên và đăng nhập thành công!');
                setInitialRoute('MainTabs');
                setIsLoading(false);
                return;
              }
            } catch (refreshErr) {
              console.log('[Auth Startup] Refresh token thất bại:', refreshErr.message);
              // Nếu token đã hết hạn hoặc bị từ chối 401 trên server
              if (refreshErr.response?.status === 401) {
                await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userRole', 'userEmail']);
                setInitialRoute('Login');
                setIsLoading(false);
                return;
              }
            }
          }

          // Nếu có token nhưng mất mạng hoặc server chậm, vẫn giữ đăng nhập
          setInitialRoute('MainTabs');
        } else {
          setInitialRoute('Login');
        }
      } catch (err) {
        console.log('[Auth Startup] Lỗi khởi động:', err);
        setInitialRoute('Login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#EAF6EA', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#51A33D" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="Availability" component={AvailabilityScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Marketplace" component={MarketplaceScreen} />
        <Stack.Screen name="ApiTestHub" component={ApiTestHubScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

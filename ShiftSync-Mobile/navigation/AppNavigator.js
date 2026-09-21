import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import axios from 'axios';

import { navigationRef } from './navigationRef';
import { getBaseUrl } from '../services/api';

import LazyScreen from './LazyScreen';
import IOSDiagnosticScreen from '../screens/IOSDiagnosticScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const loadLogin = () => import('../screens/LoginScreen');
const loadDashboard = () => import('../screens/DashboardScreen');
const loadSchedule = () => import('../screens/ScheduleScreen');
const loadAttendance = () => import('../screens/AttendanceScreenLive');
const loadPayroll = () => import('../screens/PayrollScreen');
const loadRequest = () => import('../screens/RequestScreen');
const loadAvailability = () => import('../screens/AvailabilityScreen');
const loadProfile = () => import('../screens/ProfileScreenApi');
const loadApiTestHub = () => import('../screens/ApiTestHubScreen');
const loadMarketplace = () => import('../screens/MarketplaceScreen');

const lazy = (loader) => (props) => <LazyScreen loader={loader} {...props} />;
const LoginRoute = lazy(loadLogin);
const DashboardRoute = lazy(loadDashboard);
const ScheduleRoute = lazy(loadSchedule);
const AttendanceRoute = lazy(loadAttendance);
const PayrollRoute = lazy(loadPayroll);
const RequestRoute = lazy(loadRequest);
const AvailabilityRoute = lazy(loadAvailability);
const ProfileRoute = lazy(loadProfile);
const ApiTestHubRoute = lazy(loadApiTestHub);
const MarketplaceRoute = lazy(loadMarketplace);

// 5-tab stack (chỉ hiển thị sau khi Login)
function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
      <Tab.Screen name="Dashboard" component={DashboardRoute} />
      <Tab.Screen name="Schedule" component={ScheduleRoute} />
      <Tab.Screen name="Attendance" component={AttendanceRoute} />
      <Tab.Screen name="Payroll" component={PayrollRoute} />
      <Tab.Screen name="Request" component={RequestRoute} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const diagnosticMode = __DEV__ && Platform.OS === 'ios' && process.env.EXPO_PUBLIC_IOS_DIAGNOSTICS === '1';
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState(diagnosticMode ? 'Diagnostics' : 'Login');

  useEffect(() => {
    if (diagnosticMode) {
      setIsLoading(false);
      return undefined;
    }
    const checkAuthStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        const refreshToken = await AsyncStorage.getItem('refreshToken');

        if (token) {
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
  }, [diagnosticMode]);

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
        <Stack.Screen name="Login" component={LoginRoute} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="Availability" component={AvailabilityRoute} />
        <Stack.Screen name="Profile" component={ProfileRoute} />
        <Stack.Screen name="Marketplace" component={MarketplaceRoute} />
        <Stack.Screen name="ApiTestHub" component={ApiTestHubRoute} />
        <Stack.Screen name="Diagnostics" component={IOSDiagnosticScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

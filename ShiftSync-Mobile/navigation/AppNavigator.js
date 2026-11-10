import { colors as uiColors } from '../theme/koreanPalette';
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { navigationRef } from './navigationRef';

import LazyScreen from './LazyScreen';
import IOSDiagnosticScreen from '../screens/IOSDiagnosticScreen';
import { registerForPushNotificationsAsync } from '../services/pushNotificationHelper';

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
const loadNotification = () => import('../screens/NotificationScreen');
const loadMessaging = () => import('../screens/MessagingScreen');
const loadMore = () => import('../screens/MoreScreen');
const loadDeviceDiagnostics = () => import('../screens/DeviceDiagnosticScreen');
const loadIncidentReport = () => import('../screens/IncidentReportScreen');
const loadActivityTimeline = () => import('../screens/ActivityTimelineScreen');
const loadScheduleHistory = () => import('../screens/ScheduleHistoryScreen');
const loadHelpCenter = () => import('../screens/HelpCenterScreen');

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
const NotificationRoute = lazy(loadNotification);
const MessagingRoute = lazy(loadMessaging);
const MoreRoute = lazy(loadMore);
const DeviceDiagnosticRoute = lazy(loadDeviceDiagnostics);
const IncidentReportRoute = lazy(loadIncidentReport);
const ActivityTimelineRoute = lazy(loadActivityTimeline);
const ScheduleHistoryRoute = lazy(loadScheduleHistory);
const HelpCenterRoute = lazy(loadHelpCenter);

// 5-tab stack (chỉ hiển thị sau khi Login)
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
        lazy: true,
        detachInactiveScreens: true,
      }}
    >
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
        if (token) {
          // Authenticated API calls share one refresh flow; cached data remains usable offline.
          setInitialRoute('MainTabs');
          registerForPushNotificationsAsync().catch((e) => console.log('[Push Auto-login Error]:', e));
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
      <View style={{ flex: 1, backgroundColor: uiColors.surface, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={uiColors.primaryStrong} />
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
        <Stack.Screen name="Notification" component={NotificationRoute} />
        <Stack.Screen name="Messaging" component={MessagingRoute} />
        <Stack.Screen name="More" component={MoreRoute} />
        <Stack.Screen name="DeviceDiagnostics" component={DeviceDiagnosticRoute} />
        <Stack.Screen name="IncidentReport" component={IncidentReportRoute} />
        <Stack.Screen name="ActivityTimeline" component={ActivityTimelineRoute} />
        <Stack.Screen name="ScheduleHistory" component={ScheduleHistoryRoute} />
        <Stack.Screen name="HelpCenter" component={HelpCenterRoute} />
        <Stack.Screen name="ApiTestHub" component={ApiTestHubRoute} />
        <Stack.Screen name="Diagnostics" component={IOSDiagnosticScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

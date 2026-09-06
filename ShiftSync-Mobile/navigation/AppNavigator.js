import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import AttendanceScreen from '../screens/AttendanceScreenLive';
import PayrollScreen from '../screens/PayrollScreen';
import RequestScreen from '../screens/RequestScreen';
import AvailabilityScreen from '../screens/AvailabilityScreen';
import ProfileScreen from '../screens/ProfileScreenApi';

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
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="Availability" component={AvailabilityScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

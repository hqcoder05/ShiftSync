import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import PayrollScreen from '../screens/PayrollScreen';
import RequestScreen from '../screens/RequestScreen';
import AvailabilityScreen from '../screens/AvailabilityScreen';
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Nhóm 5-tab (chỉ vào được sau khi Login thành công)
function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} options={{ title: 'Lịch làm việc' }} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} options={{ title: 'Điểm danh' }} />
      <Tab.Screen name="Payroll" component={PayrollScreen} options={{ title: 'Phiếu lương' }} />
      <Tab.Screen name="Request" component={RequestScreen} options={{ title: 'Yêu cầu' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={AvailabilityScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Thêm vào Stack/Tab Navigator của Mobile
<Stack.Screen 
  name="Availability" 
  component={AvailabilityScreen} 
  options={{ title: 'Khai Báo Lịch Rảnh' }} 
/>
import { NavigationContainer } from '@react-navigation/native';
    import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
    import DashboardScreen from '../screens/DashboardScreen';
    import ScheduleScreen from '../screens/ScheduleScreen';
    import AttendanceScreen from '../screens/AttendanceScreen';
    import PayrollScreen from '../screens/PayrollScreen';
    import RequestScreen from '../screens/RequestScreen';

    const Tab = createBottomTabNavigator();

    export default function AppNavigator() {
      return (
        <NavigationContainer>
          <Tab.Navigator>
            <Tab.Screen name="Dashboard" component={DashboardScreen} />
            <Tab.Screen name="Schedule" component={ScheduleScreen} options={{ title: 'Lịch làm việc' }} />
            <Tab.Screen name="Attendance" component={AttendanceScreen} options={{ title: 'Điểm danh' }} />
            <Tab.Screen name="Payroll" component={PayrollScreen} options={{ title: 'Phiếu lương' }} />
            <Tab.Screen name="Request" component={RequestScreen} options={{ title: 'Yêu cầu' }} />
          </Tab.Navigator>
        </NavigationContainer>
      );
    }
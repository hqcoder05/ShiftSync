import React from 'react';
import { View, Pressable, Image, StyleSheet } from 'react-native';

import dashboardIcon from '../assets/shync.png';
import calendarIcon from '../assets/Calendar.png';
import reportsIcon from '../assets/icon-reports.png';

const navItems = [
  { screen: 'Dashboard', icon: dashboardIcon, label: 'Trang chủ' },
  { screen: 'Schedule', icon: calendarIcon, label: 'Lịch làm' },
  { screen: 'Request', icon: reportsIcon, label: 'Yêu cầu' },
];

export default function BottomNavbar({ navigation, activeRoute = 'Dashboard' }) {
  const handleNav = (destination) => {
    if (!navigation) return;
    if (activeRoute === destination) return;

    if (destination === 'Profile') {
      const parent = navigation.getParent?.();
      if (parent) {
        parent.navigate('Profile');
      } else {
        navigation.navigate('Profile');
      }
    } else if (destination === 'Availability') {
      const parent = navigation.getParent?.();
      if (parent) {
        parent.navigate('Availability');
      } else {
        navigation.navigate('Availability');
      }
    } else {
      // In main tab stack
      navigation.navigate(destination);
    }
  };

  return (
    <View style={styles.navbar}>
      {navItems.map(({ screen, icon }) => {
        const isActive = activeRoute === screen;
        return (
          <Pressable
            key={screen}
            style={[
              styles.navButton,
              isActive && styles.navButtonActive,
            ]}
            onPress={() => handleNav(screen)}
            hitSlop={8}
          >
            <Image
              source={icon}
              style={[
                styles.navIcon,
                screen === 'Request' && styles.navIconReports,
                isActive ? styles.navIconActive : styles.navIconInactive,
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  navbar: {
    position: 'absolute',
    height: 65,
    bottom: 18,
    left: 26,
    right: 26,
    borderRadius: 21,
    backgroundColor: '#383838',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 999,
  },
  navButton: {
    width: 58,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonActive: {
    backgroundColor: '#1E1E1E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  navIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  navIconReports: {
    width: 38,
    height: 38,
  },
  navIconActive: {
    tintColor: '#FFFFFF',
    transform: [{ scale: 1.05 }],
  },
  navIconInactive: {
    tintColor: 'rgba(255, 255, 255, 0.72)',
  },
});

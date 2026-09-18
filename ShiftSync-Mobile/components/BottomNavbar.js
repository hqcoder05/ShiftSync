import React from 'react';
import { View, Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const navItems = [
  { screen: 'Dashboard', iconName: 'home', iconOutline: 'home-outline', label: 'Trang chủ' },
  { screen: 'Schedule', iconName: 'calendar', iconOutline: 'calendar-outline', label: 'Lịch làm' },
  { screen: 'Request', iconName: 'document-text', iconOutline: 'document-text-outline', label: 'Yêu cầu' },
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
    } else if (destination === 'Marketplace') {
      const parent = navigation.getParent?.();
      if (parent) {
        parent.navigate('Marketplace');
      } else {
        navigation.navigate('Marketplace');
      }
    } else {
      // In main tab stack
      if (navigation.getParent?.()) {
        navigation.navigate(destination);
      } else {
        try {
          navigation.navigate('MainTabs', { screen: destination });
        } catch {
          navigation.navigate(destination);
        }
      }
    }
  };

  return (
    <View style={styles.navbar}>
      {navItems.map(({ screen, iconName, iconOutline, label }) => {
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
            <Ionicons
              name={isActive ? iconName : iconOutline}
              size={24}
              color={isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.65)'}
            />
            <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
              {label}
            </Text>
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
    borderRadius: 22,
    backgroundColor: '#1E293B',
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
    width: 68,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  navButtonActive: {
    backgroundColor: '#0F172A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  navLabel: {
    fontSize: 10.5,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.65)',
  },
  navLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});


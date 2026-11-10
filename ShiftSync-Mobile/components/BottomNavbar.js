import { ensureTouchTarget } from '../utils/touchTarget';
import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { subscribeMessagingUnread, getMessagingUnreadSnapshot } from '../services/messagingService';
import { AccessibilityInfo, Animated, View, Pressable, Text, StyleSheet } from 'react-native';
import NavigationIcon from './NavigationIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../i18n';
import { colors } from '../theme/appTheme';

const navItems = [
  { screen: 'Dashboard' },
  { screen: 'Schedule' },
  { screen: 'Attendance' },
  { screen: 'Messaging' },
  { screen: 'More' },
];

function NavigationTab({ screen, label, active, unread, onPress, reduceMotion }) {
  const contact = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduceMotion) {
      contact.stopAnimation();
      contact.setValue(1);
    }
  }, [reduceMotion, contact]);

  useEffect(() => () => contact.stopAnimation(), [contact]);
  const animateContact = (value) => {
    contact.stopAnimation();
    if (reduceMotion) { contact.setValue(1); return; }
    Animated.timing(contact, { toValue: value, duration: 110, useNativeDriver: true }).start();
  };

  return <Pressable
    accessibilityRole="tab"
    accessibilityLabel={label}
    accessibilityState={{ selected: active }} aria-selected={active}
    onPress={onPress}
    onPressIn={() => animateContact(0.94)}
    onPressOut={() => animateContact(1)}
    onHoverIn={() => animateContact(1.03)}
    onHoverOut={() => animateContact(1)}
    style={ensureTouchTarget(({ pressed, focused }) => [styles.navButton, focused && styles.navButtonFocused, pressed && styles.navButtonPressed])}
  >
    <View pointerEvents="none" style={styles.iconFrame}>
      <Animated.View style={{ transform: [{ scale: contact }] }}>
        <NavigationIcon screen={screen} active={active} size={25} />
      </Animated.View>
      {screen === 'Messaging' && unread > 0 && <View style={styles.unreadBadge} accessible={false}>
        <Text style={styles.unreadCount}>{unread > 99 ? '99+' : unread}</Text>
      </View>}
    </View>
    <Text numberOfLines={1} style={[styles.label, active && styles.labelActive]}>{label}</Text>
  </Pressable>;
}

export function useBottomNavbarPadding() {
  const insets = useSafeAreaInsets();
  return 84 + insets.bottom;
}

export default function BottomNavbar({ navigation, activeRoute = 'Dashboard' }) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const unreadMessages = useSyncExternalStore(subscribeMessagingUnread, getMessagingUnreadSnapshot, getMessagingUnreadSnapshot);
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => { if (mounted) setReduceMotion(enabled); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { mounted = false; subscription.remove(); };
  }, []);
  const activeTab = navItems.some((item) => item.screen === activeRoute) ? activeRoute : 'More';
  const handleNav = (destination) => {
    if (!navigation || activeRoute === destination) return;
    if (destination === 'More' || destination === 'Notification' || destination === 'Messaging') {
      const parent = navigation.getParent?.();
      (parent || navigation).navigate(destination, undefined, { pop: true });
    } else if (navigation.getState?.().routeNames?.includes(destination)) {
      navigation.navigate(destination);
    } else {
      navigation.navigate('MainTabs', { screen: destination }, { pop: true });
    }
  };

  return (
    <View style={[styles.navbar, { paddingBottom: insets.bottom + 4 }]}>
      {navItems.map(({ screen }) => <NavigationTab key={screen} screen={screen} label={t(screen)}
        active={activeTab === screen} unread={unreadMessages} onPress={() => handleNav(screen)} reduceMotion={reduceMotion} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  navbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 6,
    paddingHorizontal: 7,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    flexDirection: 'row',
    alignItems: 'stretch',
    elevation: 0,
    zIndex: 999,
  },
  navButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 60,
    marginHorizontal: 1,
    marginTop: 0,
    borderRadius: 10,
    paddingTop: 3,
    paddingBottom: 5,
    paddingHorizontal: 1,
    gap: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonFocused: { backgroundColor: colors.subtle },
  navButtonPressed: { backgroundColor: colors.subtle },
  iconFrame: { width: 34, height: 27, alignItems: 'center', justifyContent: 'center' },
  unreadBadge: {
    position: 'absolute', top: -4, right: -3, minWidth: 16, height: 16,
    paddingHorizontal: 4, borderRadius: 9, borderWidth: 1.5,
    borderColor: colors.surface, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  unreadCount: { color: colors.white, fontSize: 9, lineHeight: 12, fontWeight: '700' },
  label: { color: colors.muted, fontSize: 10.5, lineHeight: 14, fontWeight: '500', textAlign: 'center' },
  labelActive: { color: colors.primaryStrong, fontWeight: '700' },
});


import { colors as uiColors } from '../theme/koreanPalette';
import { createAppStyles } from '../theme/appTheme';
import { ensureTouchTarget } from '../utils/touchTarget';
import { formatVietnamTime, parseVietnamInstant, vietnamDateKey } from '../utils/vietnamTime';
import { cleanNotificationText } from '../utils/notificationText';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AnimatedNotificationIcon from '../components/AnimatedNotificationIcon';
import CompanionPeekCard from '../components/CompanionPeekCard';
import NotificationSettingsModal from '../components/NotificationSettingsModal';
import JoyBurst from '../components/JoyBurst';
import useActionGuard from '../utils/useActionGuard';
import { clearShiftReminders, requestReminderPermission } from '../services/localReminders';
import { getMyShifts } from '../services/shiftService';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomNavbar, { useBottomNavbarPadding } from '../components/BottomNavbar';
import {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  subscribeUnreadCount,
  getPreferences,
  updatePreferences,
} from '../services/notificationService';

export default function NotificationScreen({ navigation }) {
  const { runAction, busy } = useActionGuard();
  const bottomNavbarPadding = useBottomNavbarPadding();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const unreadRef = useRef(0);
  const toastTimer = useRef(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterTab, setFilterTab] = useState('UNREAD');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [preferences, setPreferences] = useState([]);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState(null);
  const settingsGeneration = useRef(0);
  const [celebration, setCelebration] = useState(0);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);
  useEffect(() => () => { clearTimeout(toastTimer.current); settingsGeneration.current += 1; }, []);

  const loadSettings = async () => {
    const request = ++settingsGeneration.current;
    setSettingsLoading(true);
    setSettingsError(null);
    try {
      const [response, local] = await Promise.allSettled([
        getPreferences(),
        (async () => { const email = await AsyncStorage.getItem('userEmail'); return email ? await AsyncStorage.getItem(`@reminders:${email}`) !== 'off' : null; })(),
      ]);
      if (request !== settingsGeneration.current) return;
      if (local.status === 'fulfilled' && typeof local.value === 'boolean') setRemindersEnabled(local.value);
      if (response.status !== 'fulfilled' || !Array.isArray(response.value?.data)) throw new Error('preferences');
      setPreferences(response.value.data);
    } catch {
      if (request === settingsGeneration.current) setSettingsError('Chưa tải được cài đặt. Kiểm tra kết nối và thử lại.');
    } finally { if (request === settingsGeneration.current) setSettingsLoading(false); }
  };
  const openSettings = () => { setSettingsVisible(true); loadSettings(); };
  const togglePreference = (item, enabled) => runAction(`preference:${item.notificationType}`, async () => {
    setSettingsError(null);
    try {
      await updatePreferences({ notificationType: item.notificationType, enabled });
      setPreferences((prev) => prev.map((value) => value.notificationType === item.notificationType ? { ...value, enabled } : value));
    } catch { setSettingsError('Chưa lưu được thay đổi. Cài đặt trước đó vẫn được giữ. Vui lòng thử lại.'); }
  });
  const toggleReminders = (enabled) => runAction('reminders', async () => {
    setSettingsError(null);
    try {
    if (enabled && !await requestReminderPermission()) {
      setSettingsError('Bật quyền thông báo cho ShiftSync trong cài đặt thiết bị để nhận nhắc ca.'); return;
    }
    const email = await AsyncStorage.getItem('userEmail');
    if (!email) return;
    await AsyncStorage.setItem(`@reminders:${email}`, enabled ? 'on' : 'off');
    setRemindersEnabled(enabled);
    if (enabled) await getMyShifts(); else await clearShiftReminders();
    } catch { setSettingsError('Chưa cập nhật được nhắc ca. Kiểm tra quyền thông báo và thử lại.'); }
  });

  const showToast = (title, message, type = 'success') => {
    setToastMessage({ title, message, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMessage(null), 3000);
  };

  const loadNotifications = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const [notifsRes, countRes] = await Promise.allSettled([
        getMyNotifications(),
        getUnreadNotificationCount(),
      ]);

      setLoadError(notifsRes.status !== 'fulfilled');
      if (notifsRes.status === 'fulfilled' && notifsRes.value?.data) {
        const list = Array.isArray(notifsRes.value.data) ? notifsRes.value.data : [];
        setNotifications(list);
      }
      if (countRes.status === 'fulfilled' && countRes.value?.data) {
        const count = Number(countRes.value.data.unreadCount || 0);
        setUnreadCount(count); unreadRef.current = count;
      } else if (notifsRes.status === 'fulfilled' && Array.isArray(notifsRes.value?.data)) {
        const count = notifsRes.value.data.filter(item => !item.isRead).length;
        setUnreadCount(count); unreadRef.current = count;
      }
    } catch (err) {
      setLoadError(true);
      console.log('Error loading notifications:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => subscribeUnreadCount((next) => {
    setUnreadCount(next);
    if (next !== unreadRef.current) loadNotifications(true);
    unreadRef.current = next;
  }), [loadNotifications]);

  useEffect(() => {
    loadNotifications();
    const unsub = navigation.addListener('focus', () => {
      loadNotifications(true);
    });
    return unsub;
  }, [navigation, loadNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications(true);
  };

  const handleMarkAllRead = () => runAction('mark-all', async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      unreadRef.current = 0;
      setFilterTab('ALL');
      setCelebration(value => value + 1);
      showToast('Thành công', 'Đã đánh dấu tất cả thông báo là đã đọc');
    } catch (err) {
      showToast('Lỗi', 'Không thể đánh dấu đã đọc. Vui lòng thử lại.', 'error');
    }
  });

  const handleItemPress = (item) => runAction(`read:${item.id}`, async () => {
    if (!item.isRead) {
      try {
        await markNotificationAsRead(item.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
        );
      } catch (err) {
        // silent fail
      }
    }

    // Deep navigation based on notification type or content
    const type = (item.type || '').toUpperCase();
    const title = (item.title || '').toLowerCase();
    const message = (item.message || '').toLowerCase();

    if (
      type.includes('SWAP') ||
      type.includes('LEAVE') ||
      type.includes('REQUEST') ||
      type.includes('ADJUSTMENT') ||
      title.includes('đổi ca') ||
      title.includes('nghỉ') ||
      message.includes('đổi ca')
    ) {
      navigation.navigate('MainTabs', { screen: 'Request' }, { pop: true });
    } else if (
      type.includes('SCHEDULE') ||
      type.includes('SHIFT') ||
      title.includes('lịch') ||
      title.includes('ca làm')
    ) {
      navigation.navigate('MainTabs', { screen: 'Schedule' }, { pop: true });
    } else if (type.includes('PAYROLL') || title.includes('lương')) {
      navigation.navigate('MainTabs', { screen: 'Payroll' }, { pop: true });
    }
  });

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = parseVietnamInstant(dateStr);
      if (!d) return '';
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
      if (diffSec < 60) return 'Vừa xong';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
      if (diffSec < 172800) return 'Hôm qua';
      return formatVietnamTime(d, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const notificationDate = (value) => {
    const key = value ? vietnamDateKey(value) : '';
    if (!key) return { day: '—', month: '', label: 'Chưa có thời gian' };
    const [, month, day] = key.split('-');
    return { day, month: `THG ${Number(month)}`, label: formatVietnamTime(value, { day: '2-digit', month: '2-digit', year: 'numeric' }) };
  };

  const getNotificationCategory = (type, title) => {
    const t = (type || '').toUpperCase();
    const heading = (title || '').toLowerCase();

    if (t.includes('SWAP') || heading.includes('đổi ca')) {
      return { text: uiColors.infoText, tag: 'Đổi ca', surface: uiColors.sky, stamp: '#D9E5F1' };
    }
    if (t.includes('SCHEDULE') || heading.includes('lịch làm')) {
      return { text: uiColors.successText, tag: 'Lịch làm', surface: uiColors.mint, stamp: '#D1E4D8' };
    }
    if (t.includes('REMINDER') || heading.includes('nhắc nhở')) {
      return { text: '#705B83', tag: 'Nhắc ca', surface: '#F1EDF7', stamp: '#E0D7EB' };
    }
    if (t.includes('PAYROLL') || heading.includes('lương')) {
      return { text: uiColors.warningText, tag: 'Phiếu lương', surface: uiColors.butter, stamp: '#EDDFBB' };
    }
    if (t.includes('LEAVE') || heading.includes('nghỉ')) {
      return { text: uiColors.primaryStrong, tag: 'Nghỉ phép', surface: uiColors.peach, stamp: '#F3D4C4' };
    }
    if (t.includes('REQUEST') || t.includes('ADJUSTMENT')) {
      return { text: uiColors.dangerText, tag: 'Yêu cầu', surface: uiColors.rose, stamp: '#EAD0D6' };
    }
    return { text: uiColors.secondary, tag: 'Hệ thống', surface: uiColors.subtle, stamp: '#E5E2DC' };
  };

  const filteredNotifications = notifications.filter((item) => {
    if (filterTab === 'UNREAD') return !item.isRead;
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={uiColors.canvas} />

      {/* Custom Toast */}
      {toastMessage && (
        <View style={styles.toastContainer}>
          <View
            style={[
              styles.toastBox,
              toastMessage.type === 'error' ? styles.toastError : styles.toastSuccess,
            ]}
          >
            <Text style={styles.toastIcon}>
              {toastMessage.type === 'error' ? '✕' : '✓'}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.toastTitle}>{toastMessage.title}</Text>
              <Text style={styles.toastBody}>{toastMessage.message}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={ensureTouchTarget(styles.backBtn)}
          accessibilityRole="button"
          accessibilityLabel="Đóng thông báo"
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
<Ionicons accessible={false} name="close-outline" size={29} color={uiColors.muted} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Thông báo</Text>
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cài đặt thông báo" onPress={openSettings} style={ensureTouchTarget(styles.settingsBtn)}><Ionicons name="settings-outline" size={22} color={uiColors.secondary} accessible={false} /></TouchableOpacity>
      </View>

      {(unreadCount > 0 || busy['mark-all']) && <View style={styles.markAllRow}>
        {unreadCount > 0 || busy['mark-all'] ? (
          <TouchableOpacity accessibilityRole="button"
            style={ensureTouchTarget(styles.markAllBtn)}
            onPress={handleMarkAllRead}
            disabled={!!busy['mark-all']}
            activeOpacity={0.8}
          >
            {busy['mark-all'] ? <ActivityIndicator size="small" color={uiColors.primaryStrong} /> : <Text style={styles.markAllText}>Đã đọc hết</Text>}
          </TouchableOpacity>
        ) : null}
      </View>}

      {/* Filter Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity accessibilityRole="button"
          style={ensureTouchTarget([styles.tabBtn, filterTab === 'ALL' && styles.tabBtnActive])}
          onPress={() => setFilterTab('ALL')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, filterTab === 'ALL' && styles.tabTextActive]}>
            Tất cả ({notifications.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button"
          style={ensureTouchTarget([styles.tabBtn, filterTab === 'UNREAD' && styles.tabBtnActive])}
          onPress={() => setFilterTab('UNREAD')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, filterTab === 'UNREAD' && styles.tabTextActive]}>
            Chưa đọc ({unreadCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notification List */}
      {loading ? (
        <View style={[styles.centerBox, { paddingBottom: bottomNavbarPadding }]}>
          <ActivityIndicator size="large" color={uiColors.primaryStrong} />
          <Text style={styles.loadingText}>Đang tải thông báo...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomNavbarPadding }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[uiColors.orange]}
              tintColor={uiColors.orange}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroOuter}>
            <JoyBurst key={celebration} run={celebration > 0 && !loadError} />
            <CompanionPeekCard
              testID="notification-companion-hero"
              kind="fox"
              animated={!settingsVisible}
              compact
              title={loadError ? 'Cùng kết nối lại nhé' : unreadCount > 0 ? 'Tin mới đang chờ bạn' : notifications.length ? 'Mọi tin mới đã được xem' : 'Luôn kết nối cùng đội ngũ'}
              body={loadError ? 'Kiểm tra mạng rồi thử tải lại để xem cập nhật mới nhất.' : unreadCount > 0 ? `${unreadCount} thông báo chưa đọc. Xem cập nhật về ca làm và đội ngũ của bạn.` : 'Lịch làm, yêu cầu và những cập nhật quan trọng sẽ ở ngay đây.'}
            >
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Tùy chỉnh thông báo" onPress={openSettings} style={ensureTouchTarget(styles.heroSettings)} activeOpacity={0.75}><Text style={styles.heroSettingsText}>Tùy chỉnh thông báo</Text><Text accessible={false} style={styles.heroSettingsArrow}>→</Text></TouchableOpacity>
            </CompanionPeekCard>
          </View>
          {!!filteredNotifications.length && <View style={styles.listHeading}><Text style={styles.listEyebrow}>{filterTab === 'UNREAD' ? 'CHƯA ĐỌC' : 'TẤT CẢ CẬP NHẬT'}</Text><Text style={styles.listCount}>{filteredNotifications.length} thông báo</Text></View>}
          {filteredNotifications.length === 0 ? (
            <View style={styles.emptyBox}>
              <AnimatedNotificationIcon variant="megaphone" size={72} />
              <Text style={styles.emptyTitle}>
                {loadError ? 'Chưa tải được thông báo' : filterTab === 'UNREAD' ? 'Bạn đã xem hết!' : 'Chưa có thông báo nào'}
              </Text>
              <Text style={styles.emptySubtitle}>
                Bạn sẽ nhận được thông báo khi có lịch làm việc, yêu cầu đổi ca hoặc cập nhật từ quản lý.
              </Text>
              {!loadError && notifications.length > 0 && filterTab === 'UNREAD' && <TouchableOpacity accessibilityRole="button" onPress={() => setFilterTab('ALL')} style={ensureTouchTarget({ padding: 16 })}><Text style={{ color: uiColors.muted, fontSize: 12 }}>Xem thông báo đã đọc</Text></TouchableOpacity>}
              {loadError && <TouchableOpacity accessibilityRole="button" onPress={() => loadNotifications(true)} style={ensureTouchTarget({ padding: 14 })}><Text style={{ color: uiColors.primaryStrong }}>Thử lại</Text></TouchableOpacity>}
            </View>
          ) : (
            filteredNotifications.map((item) => {
              const category = getNotificationCategory(item.type, item.title);
              const isUnread = !item.isRead;
              const date = notificationDate(item.createdAt);

              return (
                <TouchableOpacity accessibilityRole="button"
                  key={item.id}
                  testID={`notification-item-${item.id}`}
                  style={ensureTouchTarget([
                    styles.notifCard,
                    { backgroundColor: category.surface },
                    isUnread && styles.notifCardUnread,
                  ])}
                  onPress={() => handleItemPress(item)}
                  activeOpacity={0.85}
                >
                  <View accessible={false} style={[styles.dateStamp, { backgroundColor: category.stamp }]}>
                    <Text style={[styles.dateDay, { color: category.text }]}>{date.day}</Text>
                    {!!date.month && <Text style={[styles.dateMonth, { color: category.text }]}>{date.month}</Text>}
                  </View>
                  <View style={styles.notifBody}>
                    <View style={styles.notifHeaderRow}>
                      <View style={styles.tagWrap}>
                        <Text style={[styles.tagText, { color: category.text }]}>{category.tag}</Text>
                      </View>
                      <Text accessibilityLabel={date.label} style={styles.timeText}>{formatTimeAgo(item.createdAt)}</Text>
                    </View>

                    <Text style={[styles.notifTitle, isUnread && styles.notifTitleUnread]}>
                      {cleanNotificationText(item.title) || 'Thông báo mới'}
                    </Text>

                    <Text style={styles.notifMessage} numberOfLines={3}>
                      {cleanNotificationText(item.message)}
                    </Text>
                  </View>

                  {isUnread && <View style={styles.unreadDot} />}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      <NotificationSettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        preferences={preferences}
        remindersEnabled={remindersEnabled}
        onTogglePreference={togglePreference}
        onToggleReminders={toggleReminders}
        busy={busy}
        loading={settingsLoading}
        error={settingsError}
        onRetry={loadSettings}
      />
    </SafeAreaView>
  );
}

const styles = createAppStyles({
  heroOuter: { marginHorizontal: 16, marginTop: 18, marginBottom: 22, position: 'relative' },
  heroSettings: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, alignSelf: 'flex-start', minHeight: 48, marginTop: 10, paddingHorizontal: 13, borderRadius: 14, backgroundColor: uiColors.peach },
  heroSettingsText: { color: uiColors.primaryStrong, fontSize: 12, fontWeight: '600' }, heroSettingsArrow: { color: uiColors.primaryStrong, fontSize: 18 },
  listHeading: { paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, listEyebrow: { color: uiColors.secondary, fontSize: 10, fontWeight: '700', letterSpacing: 0.7 }, listCount: { fontSize: 10, color: uiColors.muted },
  safeArea: {
    flex: 1,
    backgroundColor: uiColors.canvas,
  },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    backgroundColor: uiColors.canvas,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: uiColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 20,
    fontWeight: '400',
    color: uiColors.ink,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '600',
    color: uiColors.ink,
  },
  headerBadge: {
    backgroundColor: uiColors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  settingsBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: uiColors.surface },
  markAllRow: { alignItems: 'flex-end', paddingHorizontal: 16, paddingBottom: 8 },
  markAllBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: uiColors.peach,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: uiColors.primaryStrong,
  },
  tabsRow: {
    flexDirection: 'row',
    padding: 4,
    marginHorizontal: 16,
    gap: 5,
    backgroundColor: uiColors.line,
    borderRadius: 17,
  },
  tabBtn: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'transparent',

    flex: 1,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: uiColors.orange,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: uiColors.muted,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  list: {
    flex: 1,
    backgroundColor: uiColors.canvas,
  },
  listContent: {
    paddingHorizontal: 0,
    paddingBottom: 24,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: uiColors.muted,
    fontWeight: '500',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 40,
    gap: 15,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: uiColors.ink,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: uiColors.secondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  notifCard: {
    flexDirection: 'row',
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    minHeight: 118,
    backgroundColor: uiColors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: uiColors.line,
    alignItems: 'center',
    gap: 12,
    position: 'relative',
  },
  notifCardUnread: {
    borderColor: uiColors.primaryTrack,
  },
  dateStamp: { width: 48, minHeight: 64, paddingVertical: 7, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  dateDay: { fontSize: 24, lineHeight: 29, fontWeight: '700', letterSpacing: -0.6 },
  dateMonth: { fontSize: 9, lineHeight: 14, fontWeight: '700', letterSpacing: 0.2 },
  notifBody: {
    flex: 1,
    minWidth: 0,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingRight: 8,
    flexWrap: 'wrap',
    gap: 5,
  },
  tagWrap: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    backgroundColor: '#FFFFFFA6',
  },
  tagText: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 10,
    lineHeight: 15,
    color: uiColors.muted,
    fontWeight: '500',
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: uiColors.ink,
    marginBottom: 5,
    lineHeight: 21,
  },
  notifTitleUnread: {
    fontWeight: '700',
    color: uiColors.ink,
  },
  notifMessage: {
    fontSize: 13,
    color: uiColors.secondary,
    lineHeight: 19,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: uiColors.orange,
    position: 'absolute',
    top: 13,
    right: 13,
  },
  toastContainer: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toastBox: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 10,
    shadowColor: uiColors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  toastSuccess: {
    backgroundColor: uiColors.successStrong,
  },
  toastError: {
    backgroundColor: uiColors.dangerStrong,
  },
  toastIcon: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  toastTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  toastBody: {
    fontSize: 12,
    color: uiColors.mint,
    marginTop: 2,
  },
});

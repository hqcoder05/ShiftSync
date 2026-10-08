import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  RefreshControl,
} from 'react-native';
import {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/notificationService';

export default function NotificationScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterTab, setFilterTab] = useState('ALL'); // 'ALL' | 'UNREAD'
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (title, message, type = 'success') => {
    setToastMessage({ title, message, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadNotifications = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const [notifsRes, countRes] = await Promise.allSettled([
        getMyNotifications(),
        getUnreadNotificationCount(),
      ]);

      if (notifsRes.status === 'fulfilled' && notifsRes.value?.data) {
        const list = Array.isArray(notifsRes.value.data) ? notifsRes.value.data : [];
        setNotifications(list);
      }
      if (countRes.status === 'fulfilled' && countRes.value?.data) {
        setUnreadCount(Number(countRes.value.data.unreadCount || 0));
      }
    } catch (err) {
      console.log('Error loading notifications:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      showToast('Thành công', 'Đã đánh dấu tất cả thông báo là đã đọc');
    } catch (err) {
      showToast('Lỗi', 'Không thể đánh dấu đã đọc. Vui lòng thử lại.', 'error');
    }
  };

  const handleItemPress = async (item) => {
    if (!item.isRead) {
      try {
        await markNotificationAsRead(item.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
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
      navigation.navigate('Request');
    } else if (
      type.includes('SCHEDULE') ||
      type.includes('SHIFT') ||
      title.includes('lịch') ||
      title.includes('ca làm')
    ) {
      navigation.navigate('Schedule');
    } else if (type.includes('PAYROLL') || title.includes('lương')) {
      navigation.navigate('Payroll');
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
      if (diffSec < 60) return 'Vừa xong';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
      if (diffSec < 172800) return 'Hôm qua';
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch {
      return '';
    }
  };

  const getNotificationIconInfo = (type, title) => {
    const t = (type || '').toUpperCase();
    const heading = (title || '').toLowerCase();

    if (t.includes('SWAP') || heading.includes('đổi ca')) {
      return { icon: '🔄', bg: '#EFF6FF', border: '#BFDBFE', text: '#2563EB', tag: 'Đổi ca' };
    }
    if (t.includes('SCHEDULE') || heading.includes('lịch làm')) {
      return { icon: '📅', bg: '#ECFDF5', border: '#A7F3D0', text: '#059669', tag: 'Lịch làm' };
    }
    if (t.includes('REMINDER') || heading.includes('nhắc nhở')) {
      return { icon: '⏰', bg: '#FDF4FF', border: '#F5D0FE', text: '#C026D3', tag: 'Nhắc ca' };
    }
    if (t.includes('PAYROLL') || heading.includes('lương')) {
      return { icon: '💰', bg: '#FEFCE8', border: '#FEF08A', text: '#CA8A04', tag: 'Phiếu lương' };
    }
    if (t.includes('LEAVE') || heading.includes('nghỉ')) {
      return { icon: '🌴', bg: '#FFF7ED', border: '#FED7AA', text: '#EA580C', tag: 'Nghỉ phép' };
    }
    return { icon: '🔔', bg: '#F8FAFC', border: '#E2E8F0', text: '#475569', tag: 'Hệ thống' };
  };

  const filteredNotifications = notifications.filter((item) => {
    if (filterTab === 'UNREAD') return !item.isRead;
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

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
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Thông báo</Text>
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 ? (
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={handleMarkAllRead}
            activeOpacity={0.8}
          >
            <Text style={styles.markAllText}>Đã đọc hết</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, filterTab === 'ALL' && styles.tabBtnActive]}
          onPress={() => setFilterTab('ALL')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, filterTab === 'ALL' && styles.tabTextActive]}>
            Tất cả ({notifications.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, filterTab === 'UNREAD' && styles.tabBtnActive]}
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
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#51A33D" />
          <Text style={styles.loadingText}>Đang tải thông báo...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#51A33D']}
              tintColor="#51A33D"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {filteredNotifications.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={styles.emptyTitle}>
                {filterTab === 'UNREAD' ? 'Không có thông báo mới' : 'Chưa có thông báo nào'}
              </Text>
              <Text style={styles.emptySubtitle}>
                Bạn sẽ nhận được thông báo khi có lịch làm việc, yêu cầu đổi ca hoặc cập nhật từ quản lý.
              </Text>
            </View>
          ) : (
            filteredNotifications.map((item) => {
              const iconInfo = getNotificationIconInfo(item.type, item.title);
              const isUnread = !item.isRead;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.notifCard,
                    isUnread && styles.notifCardUnread,
                  ]}
                  onPress={() => handleItemPress(item)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.iconBox, { backgroundColor: iconInfo.bg, borderColor: iconInfo.border }]}>
                    <Text style={styles.iconEmoji}>{iconInfo.icon}</Text>
                  </View>

                  <View style={styles.notifBody}>
                    <View style={styles.notifHeaderRow}>
                      <View style={styles.tagWrap}>
                        <Text style={[styles.tagText, { color: iconInfo.text }]}>{iconInfo.tag}</Text>
                      </View>
                      <Text style={styles.timeText}>{formatTimeAgo(item.createdAt)}</Text>
                    </View>

                    <Text style={[styles.notifTitle, isUnread && styles.notifTitleUnread]}>
                      {item.title || 'Thông báo mới'}
                    </Text>

                    <Text style={styles.notifMessage} numberOfLines={3}>
                      {item.message || ''}
                    </Text>
                  </View>

                  {isUnread && <View style={styles.unreadDot} />}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  markAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16A34A',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  tabBtnActive: {
    backgroundColor: '#1E1E1E',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  list: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  notifCard: {
    flexDirection: 'row',
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'flex-start',
    gap: 12,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  notifCardUnread: {
    backgroundColor: '#F7FEE7',
    borderColor: '#D9F99D',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 20,
  },
  notifBody: {
    flex: 1,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  tagWrap: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timeText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
    lineHeight: 19,
  },
  notifTitleUnread: {
    fontWeight: '800',
    color: '#0F172A',
  },
  notifMessage: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
    position: 'absolute',
    top: 14,
    right: 14,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  toastSuccess: {
    backgroundColor: '#065F46',
  },
  toastError: {
    backgroundColor: '#991B1B',
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
    color: '#F0FDF4',
    marginTop: 2,
  },
});

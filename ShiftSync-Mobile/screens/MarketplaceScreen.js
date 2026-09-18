import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { getActiveShifts, claimShift } from '../services/marketplaceService';
import { getMyProfile, getMyStores } from '../services/profileService';
import { getMyShifts } from '../services/shiftService';
import BottomNavbar from '../components/BottomNavbar';

const fmtDateVN = (dStr) => {
  if (!dStr) return '—';
  try {
    const d = new Date(`${dStr}T00:00:00`);
    const dow = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][d.getDay()];
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${dow}, ${day}/${month}/${d.getFullYear()}`;
  } catch {
    return dStr;
  }
};

const calcShiftDuration = (start, end) => {
  if (!start || !end) return '';
  try {
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    let diff = h2 * 60 + m2 - (h1 * 60 + m1);
    if (diff < 0) diff += 24 * 60;
    const hours = Math.round((diff / 60) * 10) / 10;
    return `${hours} giờ`;
  } catch {
    return '';
  }
};

export default function MarketplaceScreen({ navigation }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [myShifts, setMyShifts] = useState([]);
  const [stores, setStores] = useState([]);
  const [currentStore, setCurrentStore] = useState(null);
  const [openShifts, setOpenShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claimingId, setClaimingId] = useState(null);

  const loadData = useCallback(async () => {
    try {
      // 1. Fetch user & stores
      const { data: user } = await getMyProfile();
      if (!user?.id) return;
      setCurrentUser(user);

      // 2. Fetch my shifts to check for conflicts
      try {
        const { data: userShifts } = await getMyShifts();
        setMyShifts(Array.isArray(userShifts) ? userShifts : []);
      } catch (e) {
        setMyShifts([]);
      }

      // 3. Fetch stores & open shifts
      const { data: storeList } = await getMyStores(user.id);
      const activeList = Array.isArray(storeList) ? storeList : [];
      setStores(activeList);

      const activeStore = activeList.find((s) => s.status === 'ACTIVE') || activeList[0];
      setCurrentStore(activeStore);

      const storeId = activeStore?.storeId || activeStore?.id;
      if (storeId) {
        const res = await getActiveShifts(storeId);
        setOpenShifts(res.data || []);
      } else {
        setOpenShifts([]);
      }
    } catch (err) {
      console.log('Lỗi khi tải dữ liệu Sàn ca:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const unsubscribe = navigation.addListener?.('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation, loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleClaim = (shift) => {
    const dateStr = fmtDateVN(shift.shiftDate);
    const timeStr = `${shift.startTime?.slice(0, 5)} - ${shift.endTime?.slice(0, 5)}`;
    const storeId = currentStore?.storeId || currentStore?.id;

    if (!storeId) {
      Alert.alert('Thông báo', 'Không tìm thấy thông tin chi nhánh.');
      return;
    }

    Alert.alert(
      'Xác nhận nhận ca',
      `Bạn có chắc chắn muốn đăng ký nhận ca làm việc ngày ${dateStr} (${timeStr}) không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đồng ý nhận ca',
          style: 'default',
          onPress: async () => {
            try {
              setClaimingId(shift.id);
              await claimShift(storeId, shift.id);
              Alert.alert(
                '🎉 Thành công',
                'Đăng ký nhận ca thành công! Ca đã được thêm trực tiếp vào lịch làm của bạn.',
                [
                  {
                    text: 'Xem Lịch làm',
                    onPress: () => navigation.navigate('MainTabs', { screen: 'Schedule' }),
                  },
                  { text: 'Ở lại Sàn ca', onPress: () => loadData() },
                ]
              );
            } catch (err) {
              let msg = err.response?.data?.message || '';
              if (msg.includes('overlaps with an existing') || msg.includes('trùng giờ')) {
                msg = msg || 'Ca làm việc này bị trùng giờ với một ca làm khác bạn đã có trong cùng ngày.';
              } else if (msg.includes('maximum weekly hours') || msg.includes('vượt quá số giờ')) {
                msg = msg || 'Nhận thêm ca này sẽ vượt quá số giờ làm việc tối đa trong tuần của bạn.';
              } else if (msg.includes('Bạn đã được phân công')) {
                msg = 'Bạn đã được phân công làm việc trong ca này rồi.';
              } else if (!msg) {
                msg = 'Không thể nhận ca. Vui lòng kiểm tra lại xung đột lịch làm hoặc kỹ năng.';
              }
              Alert.alert('Không thể nhận ca', msg);
            } finally {
              setClaimingId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ═══ HEADER ═══ */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Chợ ca làm việc</Text>
          <Text style={styles.headerSubtitle}>
            {currentStore?.storeName || currentStore?.name || 'Chi nhánh của bạn'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onRefresh}
          style={styles.refreshBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.refreshBtnText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* ═══ CONTENT ═══ */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16a34a']} />
        }
      >
        {/* Banner giới thiệu */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerTop}>
            <Text style={styles.bannerBadge}>🛒 CHỢ CA LÀM</Text>
            <Text style={styles.bannerCountText}>
              {openShifts.length} ca đang mở
            </Text>
          </View>
          <Text style={styles.bannerHeading}>Nhận ca mở để tăng thu nhập</Text>
          <Text style={styles.bannerDesc}>
            Các ca làm việc bên dưới đang thiếu nhân sự. Bạn có thể chủ động nhận ca nếu phù hợp với lịch rảnh và kỹ năng chuyên môn.
          </Text>
        </View>

        {/* Danh sách ca mở */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Danh sách ca làm việc cần người</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#16a34a" />
            <Text style={styles.loadingText}>Đang kiểm tra ca mở trong chi nhánh...</Text>
          </View>
        ) : openShifts.length > 0 ? (
          openShifts.map((shift) => {
            const isClaimingThis = claimingId === shift.id;
            const duration = calcShiftDuration(shift.startTime, shift.endTime);

            // Check if user is already in this shift
            const isAlreadyInShift = (shift.shiftAssignments || []).some(
              (a) =>
                (currentUser?.id && a.staffId === currentUser.id) ||
                (currentUser?.fullName && a.staffName === currentUser.fullName)
            );

            // Check for conflict with existing registered shift
            const conflictingShift = myShifts.find((ms) => {
              if (ms.shiftDate !== shift.shiftDate) return false;
              if (ms.id === shift.id) return false;
              const s1 = shift.startTime?.slice(0, 5) || '00:00';
              const e1 = shift.endTime?.slice(0, 5) || '23:59';
              const s2 = ms.startTime?.slice(0, 5) || '00:00';
              const e2 = ms.endTime?.slice(0, 5) || '23:59';
              return s1 < e2 && e1 > s2;
            });

            return (
              <View key={shift.id} style={styles.shiftCard}>
                {/* Header thẻ ca */}
                <View style={styles.cardHeader}>
                  <View style={styles.dateWrap}>
                    <Text style={styles.dateText}>{fmtDateVN(shift.shiftDate)}</Text>
                  </View>
                  <View style={styles.openBadge}>
                    <Text style={styles.openBadgeText}>Đang mở nhận</Text>
                  </View>
                </View>

                {/* Giờ làm việc */}
                <View style={styles.timeRow}>
                  <Text style={styles.timeIcon}>⏰</Text>
                  <Text style={styles.timeText}>
                    {shift.startTime?.slice(0, 5)} - {shift.endTime?.slice(0, 5)}
                  </Text>
                  {duration ? <Text style={styles.durationText}>({duration})</Text> : null}
                </View>

                {/* Cảnh báo trạng thái cá nhân: Đã tham gia hoặc Trùng ca */}
                {isAlreadyInShift ? (
                  <View style={styles.alertBoxSuccess}>
                    <Text style={styles.alertTextSuccess}>
                      ✓ Bạn đã có trong danh sách ca làm việc này
                    </Text>
                  </View>
                ) : conflictingShift ? (
                  <View style={styles.alertBoxConflict}>
                    <Text style={styles.alertTextConflict}>
                      ⚠️ Trùng giờ ca làm khác của bạn ({conflictingShift.startTime?.slice(0, 5)} - {conflictingShift.endTime?.slice(0, 5)})
                    </Text>
                  </View>
                ) : null}

                {/* Danh sách kỹ năng cần tuyển / đã đủ */}
                <View style={styles.skillsContainer}>
                  {shift.skillRequirements && shift.skillRequirements.length > 0 ? (
                    shift.skillRequirements.map((req, idx) => {
                      const reqCount = req.requiredStaff || 1;
                      let assigned = req.assignedCount;
                      if (assigned === undefined || assigned === null) {
                        assigned = (shift.shiftAssignments || []).filter(
                          (sa) =>
                            sa.requiredSkillId === req.skillId || sa.skillName === req.skillName
                        ).length;
                      }
                      const missing = Math.max(0, reqCount - assigned);

                      return missing > 0 ? (
                        <View key={idx} style={styles.skillTagMissing}>
                          <View style={styles.skillDotMissing} />
                          <Text style={styles.skillTextMissing}>
                            Cần tuyển: {req.skillName}
                          </Text>
                          <View style={styles.missingCountBadge}>
                            <Text style={styles.missingCountText}>thiếu {missing}</Text>
                          </View>
                        </View>
                      ) : (
                        <View key={idx} style={styles.skillTagFilled}>
                          <View style={styles.skillDotFilled} />
                          <Text style={styles.skillTextFilled}>{req.skillName}</Text>
                          <Text style={styles.filledCountText}>
                            (đã đủ {assigned}/{reqCount})
                          </Text>
                        </View>
                      );
                    })
                  ) : (
                    <View style={styles.skillTagMissing}>
                      <Text style={styles.skillTextMissing}>Cần bổ sung nhân sự</Text>
                    </View>
                  )}
                </View>

                {/* Chân thẻ ca */}
                <View style={styles.cardFooter}>
                  <Text style={styles.footerNote}>
                    {isAlreadyInShift
                      ? 'Ca này bạn đã có lịch'
                      : conflictingShift
                      ? 'Trùng giờ với ca khác'
                      : 'Bấm nhận ca để đăng ký ngay'}
                  </Text>

                  {isAlreadyInShift ? (
                    <View style={styles.joinedBadge}>
                      <Text style={styles.joinedBadgeText}>Đã tham gia</Text>
                    </View>
                  ) : conflictingShift ? (
                    <TouchableOpacity
                      style={styles.conflictBtn}
                      onPress={() => {
                        Alert.alert(
                          'Trùng lịch làm việc',
                          `Bạn đã có ca làm ngày ${fmtDateVN(shift.shiftDate)} từ ${conflictingShift.startTime?.slice(0, 5)} đến ${conflictingShift.endTime?.slice(0, 5)} nên không thể nhận ca này.`
                        );
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.conflictBtnText}>Trùng lịch</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.claimButton, isClaimingThis && styles.claimButtonDisabled]}
                      onPress={() => handleClaim(shift)}
                      disabled={isClaimingThis}
                      activeOpacity={0.8}
                    >
                      {isClaimingThis ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.claimButtonText}>Nhận ca</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>☕</Text>
            <Text style={styles.emptyTitle}>Hiện không có ca mở nào</Text>
            <Text style={styles.emptySubtitle}>
              Tất cả các ca làm việc trong chi nhánh đã được bố trí đủ nhân sự. Hãy quay lại kiểm tra sau nhé!
            </Text>
            <TouchableOpacity style={styles.reloadEmptyBtn} onPress={onRefresh}>
              <Text style={styles.reloadEmptyText}>Kiểm tra lại</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ═══ BOTTOM NAV ═══ */}
      <BottomNavbar navigation={navigation} activeRoute="Marketplace" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#334155',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '600',
    marginTop: 2,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtnText: {
    fontSize: 16,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 110,
  },
  bannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  bannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bannerBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16a34a',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    letterSpacing: 0.5,
  },
  bannerCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  bannerHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  bannerDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
  },
  shiftCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dateWrap: {
    flex: 1,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  openBadge: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  openBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#059669',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  timeIcon: {
    fontSize: 15,
    marginRight: 6,
  },
  timeText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#334155',
    marginRight: 8,
  },
  durationText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  skillTagMissing: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  skillDotMissing: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginRight: 6,
  },
  skillTextMissing: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#DC2626',
    marginRight: 6,
  },
  missingCountBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  missingCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B91C1C',
  },
  skillTagFilled: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  skillDotFilled: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
    marginRight: 6,
  },
  skillTextFilled: {
    fontSize: 12,
    fontWeight: '500',
    color: '#166534',
    marginRight: 4,
  },
  filledCountText: {
    fontSize: 11,
    color: '#15803D',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerNote: {
    fontSize: 12,
    color: '#64748B',
  },
  claimButton: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 10,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  claimButtonDisabled: {
    opacity: 0.6,
  },
  claimButtonText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  claimButtonTextDisabled: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  alertBoxSuccess: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  alertTextSuccess: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803D',
  },
  alertBoxConflict: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  alertTextConflict: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B45309',
  },
  joinedBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  joinedBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  conflictBtn: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  conflictBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B45309',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginTop: 10,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  reloadEmptyBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  reloadEmptyText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
});

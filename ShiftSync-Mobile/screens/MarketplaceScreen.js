import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

// ── Palette matching Figma Pastel Tokens & ScheduleScreen ────────────────────
export const ROLE_THEMES = {
  Barista: {
    color: '#5BC8B8',
    cardBg: 'rgba(91, 200, 184, 0.12)',
    activeBorder: '#5BC8B8',
    dotColor: '#5BC8B8',
    text: '#0D6A5D',
  },
  'Pha chế': {
    color: '#5BC8B8',
    cardBg: 'rgba(91, 200, 184, 0.12)',
    activeBorder: '#5BC8B8',
    dotColor: '#5BC8B8',
    text: '#0D6A5D',
  },
  Cashier: {
    color: '#D97FB2',
    cardBg: 'rgba(217, 127, 178, 0.12)',
    activeBorder: '#D97FB2',
    dotColor: '#D97FB2',
    text: '#821D59',
  },
  'Thu ngân': {
    color: '#D97FB2',
    cardBg: 'rgba(217, 127, 178, 0.12)',
    activeBorder: '#D97FB2',
    dotColor: '#D97FB2',
    text: '#821D59',
  },
  Kitchen: {
    color: '#D98080',
    cardBg: 'rgba(217, 128, 128, 0.12)',
    activeBorder: '#D98080',
    dotColor: '#D98080',
    text: '#871D1D',
  },
  'Bếp': {
    color: '#D98080',
    cardBg: 'rgba(217, 128, 128, 0.12)',
    activeBorder: '#D98080',
    dotColor: '#D98080',
    text: '#871D1D',
  },
  Service: {
    color: '#C8C84A',
    cardBg: 'rgba(200, 200, 74, 0.12)',
    activeBorder: '#C8C84A',
    dotColor: '#C8C84A',
    text: '#646410',
  },
  'Phục vụ': {
    color: '#C8C84A',
    cardBg: 'rgba(200, 200, 74, 0.12)',
    activeBorder: '#C8C84A',
    dotColor: '#C8C84A',
    text: '#646410',
  },
  Supervisor: {
    color: '#7AA8D9',
    cardBg: 'rgba(122, 168, 217, 0.12)',
    activeBorder: '#7AA8D9',
    dotColor: '#7AA8D9',
    text: '#1C497B',
  },
  'Giám sát': {
    color: '#7AA8D9',
    cardBg: 'rgba(122, 168, 217, 0.12)',
    activeBorder: '#7AA8D9',
    dotColor: '#7AA8D9',
    text: '#1C497B',
  },
  'Quản lý': {
    color: '#7AA8D9',
    cardBg: 'rgba(122, 168, 217, 0.12)',
    activeBorder: '#7AA8D9',
    dotColor: '#7AA8D9',
    text: '#1C497B',
  },
};

const getRoleTheme = (roleName = '') => {
  if (!roleName) return ROLE_THEMES['Barista'];
  const r = roleName.trim();
  if (ROLE_THEMES[r]) return ROLE_THEMES[r];
  const lower = r.toLowerCase();
  if (lower.includes('barista') || lower.includes('pha chế') || lower.includes('pha che')) return ROLE_THEMES['Barista'];
  if (lower.includes('cashier') || lower.includes('thu ngân') || lower.includes('thu ngan')) return ROLE_THEMES['Cashier'];
  if (lower.includes('kitchen') || lower.includes('bếp') || lower.includes('bep')) return ROLE_THEMES['Kitchen'];
  if (lower.includes('service') || lower.includes('phục vụ') || lower.includes('phuc vu') || lower.includes('waiter') || lower.includes('server')) return ROLE_THEMES['Service'];
  if (lower.includes('supervisor') || lower.includes('giám sát') || lower.includes('quản lý') || lower.includes('quan ly') || lower.includes('manager')) return ROLE_THEMES['Supervisor'];

  return {
    color: '#5BC8B8',
    cardBg: 'rgba(91, 200, 184, 0.12)',
    activeBorder: '#5BC8B8',
    dotColor: '#5BC8B8',
    text: '#0D6A5D',
  };
};

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
  const [selectedStoreIndex, setSelectedStoreIndex] = useState(0);
  const [openShifts, setOpenShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claimingId, setClaimingId] = useState(null);

  const currentStore = useMemo(() => {
    if (!stores || stores.length === 0) return null;
    return stores[selectedStoreIndex] || stores[0];
  }, [stores, selectedStoreIndex]);

  const loadData = useCallback(async () => {
    try {
      // 1. Fetch user profile
      const { data: user } = await getMyProfile();
      if (!user?.id) return;
      setCurrentUser(user);

      // 2. Fetch my shifts for live conflict checking
      try {
        const { data: userShifts } = await getMyShifts();
        setMyShifts(Array.isArray(userShifts) ? userShifts : []);
      } catch (e) {
        setMyShifts([]);
      }

      // 3. Fetch stores
      const { data: storeList } = await getMyStores(user.id);
      const activeList = Array.isArray(storeList) ? storeList : [];
      setStores(activeList);

      const targetStore = activeList[selectedStoreIndex] || activeList[0];
      const storeId = targetStore?.storeId || targetStore?.id;
      if (storeId) {
        const res = await getActiveShifts(storeId);
        setOpenShifts(Array.isArray(res.data) ? res.data : []);
      } else {
        setOpenShifts([]);
      }
    } catch (err) {
      console.log('Lỗi khi tải dữ liệu Sàn ca:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedStoreIndex]);

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
      Alert.alert('Thông báo', 'Không tìm thấy thông tin chi nhánh làm việc.');
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
                'Đăng ký thành công',
                'Bạn đã nhận ca thành công! Ca làm việc đã được cập nhật trực tiếp vào Lịch làm của bạn.',
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
                msg = 'Ca làm việc này bị trùng giờ với một ca làm khác bạn đã có trong cùng ngày.';
              } else if (msg.includes('maximum weekly hours') || msg.includes('vượt quá số giờ')) {
                msg = 'Nhận thêm ca này sẽ vượt quá số giờ làm việc tối đa trong tuần của bạn.';
              } else if (msg.includes('Bạn đã được phân công')) {
                msg = 'Bạn đã được phân công làm việc trong ca này rồi.';
              } else if (msg.includes('đã có người nhanh tay')) {
                msg = 'Ca làm việc này đã có nhân viên khác nhận trước.';
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
          <Text style={styles.backArrowText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Chợ ca làm việc</Text>
          <Text style={styles.headerSubtitle}>
            {currentStore?.storeName || currentStore?.name || 'Chi nhánh phân công'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onRefresh}
          style={styles.refreshBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.refreshBtnText}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* ═══ STORE SELECTOR STRIP (NẾU NHÂN VIÊN THUỘC NHIỀU CHI NHÁNH) ═══ */}
      {stores.length > 1 && (
        <View style={styles.storeSelectorStrip}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storeListContent}>
            {stores.map((s, idx) => {
              const isSelected = selectedStoreIndex === idx;
              return (
                <TouchableOpacity
                  key={s.id || s.storeId || idx}
                  style={[styles.storePill, isSelected && styles.storePillActive]}
                  onPress={() => setSelectedStoreIndex(idx)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.storePillText, isSelected && styles.storePillTextActive]}>
                    {s.storeName || s.name || `Chi nhánh ${idx + 1}`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ═══ CONTENT ═══ */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#27272a']} />
        }
      >
        {/* Banner tổng quan */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerTop}>
            <View style={styles.bannerBadgeWrap}>
              <Text style={styles.bannerBadgeText}>SÀN CA MỞ</Text>
            </View>
            <Text style={styles.bannerCountText}>
              {openShifts.length} ca đang tìm nhân sự
            </Text>
          </View>
          <Text style={styles.bannerHeading}>Danh sách ca làm việc cần bổ sung</Text>
          <Text style={styles.bannerDesc}>
            Các ca làm việc bên dưới đang còn vị trí trống. Nhân viên có thể chủ động đăng ký nhận ca để tăng thu nhập khi phù hợp với lịch rảnh và chuyên môn.
          </Text>
        </View>

        {/* Tiêu đề danh sách */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ca làm việc khả dụng</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#27272a" />
            <Text style={styles.loadingText}>Đang tải danh sách ca mở...</Text>
          </View>
        ) : openShifts.length > 0 ? (
          openShifts.map((shift) => {
            const isClaimingThis = claimingId === shift.id;
            const duration = calcShiftDuration(shift.startTime, shift.endTime);
            const primaryRole = shift.skillName || shift.skillRequirements?.[0]?.skillName || 'Nhân viên';
            const theme = getRoleTheme(primaryRole);

            // Kiểm tra nhân viên đã có trong ca này chưa
            const isAlreadyInShift = (shift.shiftAssignments || []).some(
              (a) =>
                (currentUser?.id && a.staffId === currentUser.id) ||
                (currentUser?.fullName && a.staffName === currentUser.fullName)
            );

            // Kiểm tra xung đột giờ với ca cá nhân đã có
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
                {/* Vạch màu định danh vai trò bên trái */}
                <View style={[styles.cardVerticalBar, { backgroundColor: theme.color }]} />

                <View style={styles.cardInner}>
                  {/* Header thẻ ca */}
                  <View style={styles.cardHeader}>
                    <View style={styles.dateWrap}>
                      <Text style={styles.dateText}>{fmtDateVN(shift.shiftDate)}</Text>
                    </View>
                    <View style={styles.openBadge}>
                      <Text style={styles.openBadgeText}>Đang mở</Text>
                    </View>
                  </View>

                  {/* Giờ làm việc & Địa điểm */}
                  <View style={styles.timeLocationRow}>
                    <View style={styles.timeBox}>
                      <Text style={styles.timeText}>
                        {shift.startTime?.slice(0, 5)} - {shift.endTime?.slice(0, 5)}
                      </Text>
                      {duration ? <Text style={styles.durationText}>({duration})</Text> : null}
                    </View>
                  </View>

                  {/* Cảnh báo trạng thái cá nhân: Đã tham gia hoặc Trùng ca */}
                  {isAlreadyInShift ? (
                    <View style={styles.alertBoxSuccess}>
                      <View style={styles.alertDotSuccess} />
                      <Text style={styles.alertTextSuccess}>
                        Bạn đã được phân công vào ca làm việc này
                      </Text>
                    </View>
                  ) : conflictingShift ? (
                    <View style={styles.alertBoxConflict}>
                      <View style={styles.alertDotConflict} />
                      <Text style={styles.alertTextConflict}>
                        Trùng giờ ca làm khác ({conflictingShift.startTime?.slice(0, 5)} - {conflictingShift.endTime?.slice(0, 5)})
                      </Text>
                    </View>
                  ) : null}

                  {/* Danh sách vị trí / kỹ năng cần tuyển */}
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
                        const roleTheme = getRoleTheme(req.skillName);

                        return missing > 0 ? (
                          <View key={idx} style={[styles.skillTagMissing, { borderColor: roleTheme.color }]}>
                            <View style={[styles.skillDot, { backgroundColor: roleTheme.color }]} />
                            <Text style={styles.skillTextMissing}>
                              {req.skillName || 'Vị trí'}
                            </Text>
                            <View style={styles.missingCountBadge}>
                              <Text style={styles.missingCountText}>thiếu {missing}</Text>
                            </View>
                          </View>
                        ) : (
                          <View key={idx} style={styles.skillTagFilled}>
                            <View style={[styles.skillDot, { backgroundColor: '#A1A1AA' }]} />
                            <Text style={styles.skillTextFilled}>{req.skillName || 'Vị trí'}</Text>
                            <Text style={styles.filledCountText}>
                              (đã đủ {assigned}/{reqCount})
                            </Text>
                          </View>
                        );
                      })
                    ) : (
                      <View style={[styles.skillTagMissing, { borderColor: theme.color }]}>
                        <View style={[styles.skillDot, { backgroundColor: theme.color }]} />
                        <Text style={styles.skillTextMissing}>{primaryRole}</Text>
                        <View style={styles.missingCountBadge}>
                          <Text style={styles.missingCountText}>cần bổ sung</Text>
                        </View>
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
              </View>
            );
          })
        ) : (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyIconSymbol}>—</Text>
            </View>
            <Text style={styles.emptyTitle}>Hiện chưa có ca mở nào</Text>
            <Text style={styles.emptySubtitle}>
              Tất cả các ca làm việc trong chi nhánh đã được bố trí đủ nhân sự hoặc chưa được mở trên Sàn ca.
            </Text>
            <TouchableOpacity style={styles.reloadEmptyBtn} onPress={onRefresh} activeOpacity={0.7}>
              <Text style={styles.reloadEmptyText}>Làm mới danh sách</Text>
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
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F4F4F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrowText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#27272A',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#18181B',
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: '#52525B',
    fontWeight: '500',
    marginTop: 2,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F4F4F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#27272A',
  },
  storeSelectorStrip: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingVertical: 8,
  },
  storeListContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  storePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F4F4F5',
  },
  storePillActive: {
    backgroundColor: '#27272A',
  },
  storePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#52525B',
  },
  storePillTextActive: {
    color: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  bannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    marginBottom: 16,
  },
  bannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bannerBadgeWrap: {
    backgroundColor: '#F4F4F5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bannerBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#27272A',
    letterSpacing: 0.5,
  },
  bannerCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#52525B',
  },
  bannerHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#18181B',
    marginBottom: 4,
  },
  bannerDesc: {
    fontSize: 12.5,
    color: '#71717A',
    lineHeight: 18,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#27272A',
  },
  loadingContainer: {
    paddingVertical: 36,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12.5,
    color: '#71717A',
  },
  shiftCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    overflow: 'hidden',
  },
  cardVerticalBar: {
    width: 5,
  },
  cardInner: {
    flex: 1,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dateWrap: {
    flex: 1,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#18181B',
  },
  openBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  openBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  timeLocationRow: {
    marginBottom: 10,
  },
  timeBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#27272A',
    marginRight: 6,
  },
  durationText: {
    fontSize: 12,
    color: '#71717A',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  skillTagMissing: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  skillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  skillTextMissing: {
    fontSize: 12,
    fontWeight: '600',
    color: '#27272A',
    marginRight: 6,
  },
  missingCountBadge: {
    backgroundColor: '#F4F4F5',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  missingCountText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#52525B',
  },
  skillTagFilled: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F4F5',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  skillTextFilled: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#71717A',
    marginRight: 4,
  },
  filledCountText: {
    fontSize: 10.5,
    color: '#A1A1AA',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F4F4F5',
  },
  footerNote: {
    fontSize: 11.5,
    color: '#71717A',
  },
  claimButton: {
    backgroundColor: '#27272A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  claimButtonDisabled: {
    opacity: 0.6,
  },
  claimButtonText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  alertBoxSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 8,
  },
  alertDotSuccess: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
    marginRight: 6,
  },
  alertTextSuccess: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#15803D',
  },
  alertBoxConflict: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 8,
  },
  alertDotConflict: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D97706',
    marginRight: 6,
  },
  alertTextConflict: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#B45309',
  },
  joinedBadge: {
    backgroundColor: '#F4F4F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E4E4E7',
  },
  joinedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#71717A',
  },
  conflictBtn: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  conflictBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    marginTop: 8,
  },
  emptyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F4F4F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyIconSymbol: {
    fontSize: 20,
    color: '#71717A',
    fontWeight: '700',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#18181B',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: '#71717A',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  reloadEmptyBtn: {
    backgroundColor: '#F4F4F5',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  reloadEmptyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#27272A',
  },
});

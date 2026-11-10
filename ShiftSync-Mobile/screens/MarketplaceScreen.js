import { colors as uiColors } from '../theme/koreanPalette';
import { createAppStyles } from '../theme/appTheme';
import ThreeIllustration from '../components/ThreeIllustration';
import { ensureTouchTarget } from '../utils/touchTarget';
import { formatVietnamTime } from '../utils/vietnamTime';
import useResumeRefresh from '../utils/useResumeRefresh';
import BackIcon from '../components/BackIcon';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
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
  Platform,
} from 'react-native';
import { getActiveShifts } from '../services/marketplaceService';
import { submitCheckedClaim } from '../services/scheduleConflictService';
import ScheduleConflictAlert from '../components/ScheduleConflictAlert';
import { findScheduleConflicts, isAssignedTo, formatIntervalVN } from '../utils/scheduleConflicts';
import { getMyProposals, respondProposal } from '../services/workforceService';
import { getMyProfile, getMyStores } from '../services/profileService';
import { getMyShifts } from '../services/shiftService';
import BottomNavbar, { useBottomNavbarPadding } from '../components/BottomNavbar';
import { showAlert } from '../utils/alert';
import useActionGuard from '../utils/useActionGuard';

// ── Palette matching Figma Pastel Tokens & ScheduleScreen ────────────────────
export const ROLE_THEMES = {
  Barista: {
    color: uiColors.turquoise,
    cardBg: "rgba(115, 169, 154, 0.12)",
    activeBorder: uiColors.turquoise,
    dotColor: uiColors.turquoise,
    text: uiColors.successStrong,
  },
  'Pha chế': {
    color: uiColors.turquoise,
    cardBg: "rgba(115, 169, 154, 0.12)",
    activeBorder: uiColors.turquoise,
    dotColor: uiColors.turquoise,
    text: uiColors.successStrong,
  },
  Cashier: {
    color: uiColors.pink,
    cardBg: "rgba(183, 143, 168, 0.12)",
    activeBorder: uiColors.pink,
    dotColor: uiColors.pink,
    text: '#821D59',
  },
  'Thu ngân': {
    color: uiColors.pink,
    cardBg: "rgba(183, 143, 168, 0.12)",
    activeBorder: uiColors.pink,
    dotColor: uiColors.pink,
    text: '#821D59',
  },
  Kitchen: {
    color: uiColors.salmon,
    cardBg: "rgba(197, 140, 132, 0.12)",
    activeBorder: uiColors.salmon,
    dotColor: uiColors.salmon,
    text: uiColors.dangerStrong,
  },
  'Bếp': {
    color: uiColors.salmon,
    cardBg: "rgba(197, 140, 132, 0.12)",
    activeBorder: uiColors.salmon,
    dotColor: uiColors.salmon,
    text: uiColors.dangerStrong,
  },
  Service: {
    color: uiColors.mustard,
    cardBg: "rgba(185, 170, 114, 0.12)",
    activeBorder: uiColors.mustard,
    dotColor: uiColors.mustard,
    text: '#646410',
  },
  'Phục vụ': {
    color: uiColors.mustard,
    cardBg: "rgba(185, 170, 114, 0.12)",
    activeBorder: uiColors.mustard,
    dotColor: uiColors.mustard,
    text: '#646410',
  },
  Supervisor: {
    color: uiColors.blue,
    cardBg: "rgba(129, 154, 183, 0.12)",
    activeBorder: uiColors.blue,
    dotColor: uiColors.blue,
    text: uiColors.info,
  },
  'Giám sát': {
    color: uiColors.blue,
    cardBg: "rgba(129, 154, 183, 0.12)",
    activeBorder: uiColors.blue,
    dotColor: uiColors.blue,
    text: uiColors.info,
  },
  'Quản lý': {
    color: uiColors.blue,
    cardBg: "rgba(129, 154, 183, 0.12)",
    activeBorder: uiColors.blue,
    dotColor: uiColors.blue,
    text: uiColors.info,
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
    color: uiColors.turquoise,
    cardBg: "rgba(115, 169, 154, 0.12)",
    activeBorder: uiColors.turquoise,
    dotColor: uiColors.turquoise,
    text: uiColors.successStrong,
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

const calcShiftDurationHours = (start, end) => {
  if (!start || !end) return 0;
  try {
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    let diff = h2 * 60 + m2 - (h1 * 60 + m1);
    if (diff < 0) diff += 24 * 60;
    return diff / 60;
  } catch {
    return 0;
  }
};

const marketplaceFilterCache = new Map();
const EMPTY_FILTERS = { role: null, period: 'all' };
const PERIOD_FILTERS = [
  { value: 'all', label: 'Cả ngày' },
  { value: 'morning', label: 'Sáng' },
  { value: 'afternoon', label: 'Chiều' },
  { value: 'evening', label: 'Tối' },
];
const normalizeRole = (role) => String(role || '').trim().toLocaleLowerCase('vi-VN');

export const getMarketplaceShiftRoles = (shift) => {
  const requirements = Array.isArray(shift.skillRequirements) ? shift.skillRequirements : [];
  if (requirements.length === 0) return shift.skillName?.trim() ? [shift.skillName.trim()] : [];
  return requirements.filter((requirement) => {
    const assigned = requirement.assignedCount ?? (shift.shiftAssignments || []).filter((assignment) =>
      (requirement.skillId != null && String(assignment.requiredSkillId) === String(requirement.skillId))
      || (requirement.skillName && assignment.skillName === requirement.skillName)
    ).length;
    return Number(requirement.requiredStaff || 1) > Number(assigned);
  }).map((requirement) => String(requirement.skillName || '').trim()).filter(Boolean);
};

export const getMarketplaceShiftPeriod = (shift) => {
  const start = shift.startTime;
  const parts = typeof start === 'string' && /^\d{1,2}:\d{2}(?::\d{2})?$/.test(start)
    ? start.split(':').map(Number)
    : (start && typeof start === 'object' ? [Number(start.hour), Number(start.minute)] : []);
  const [hour, minute] = parts;
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour < 0 || hour >= 24 || minute < 0 || minute >= 60) return null;
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
};

export const filterMarketplaceShifts = (shifts, filters) => shifts.filter((shift) =>
  (!filters.role || getMarketplaceShiftRoles(shift).some((role) => normalizeRole(role) === normalizeRole(filters.role)))
  && (filters.period === 'all' || getMarketplaceShiftPeriod(shift) === filters.period)
);

export default function MarketplaceScreen({ navigation }) {
  useResumeRefresh(navigation, () => loadData());
  const bottomNavbarPadding = useBottomNavbarPadding();
  const { runAction, busy } = useActionGuard();
  const [currentUser, setCurrentUser] = useState(null);
  const [myShifts, setMyShifts] = useState([]);
  const [stores, setStores] = useState([]);
  const [selectedStoreIndex, setSelectedStoreIndex] = useState(0);
  const [openShifts, setOpenShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [claimingId, setClaimingId] = useState(null);
  const [scheduleConflict, setScheduleConflict] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [proposalsLoading, setProposalsLoading] = useState(true);
  const [proposalsError, setProposalsError] = useState(null);
  const [respondingProposalId, setRespondingProposalId] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [restoredFilterKey, setRestoredFilterKey] = useState(null);

  const currentStore = useMemo(() => {
    if (!stores || stores.length === 0) return null;
    return stores[selectedStoreIndex] || stores[0];
  }, [stores, selectedStoreIndex]);
  const currentStoreId = currentStore?.storeId || currentStore?.id;
  const filterKey = currentUser?.id && currentStoreId ? `${currentUser.id}:${currentStoreId}` : null;

  useEffect(() => {
    if (!filterKey) return;
    setFilters(marketplaceFilterCache.get(filterKey) || EMPTY_FILTERS);
    setRestoredFilterKey(filterKey);
  }, [filterKey]);

  useEffect(() => {
    if (filterKey && restoredFilterKey === filterKey) marketplaceFilterCache.set(filterKey, { ...filters });
  }, [filterKey, restoredFilterKey, filters]);

  const roleOptions = useMemo(() => {
    const roles = new Map();
    openShifts.forEach((shift) => getMarketplaceShiftRoles(shift).forEach((role) => roles.set(normalizeRole(role), role)));
    if (filters.role && !roles.has(normalizeRole(filters.role))) roles.set(normalizeRole(filters.role), filters.role);
    return [...roles.values()].sort((left, right) => left.localeCompare(right, 'vi'));
  }, [openShifts, filters.role]);
  const filteredOpenShifts = useMemo(() => filterMarketplaceShifts(openShifts, filters), [openShifts, filters]);
  const hasFilters = Boolean(filters.role) || filters.period !== 'all';
  const clearFilters = () => setFilters(EMPTY_FILTERS);

  const loadData = useCallback(async () => {
    setLoadError(null);
    try {
      // 1. Fetch user profile
      const { data: user } = await getMyProfile();
      if (!user?.id) return;
      setCurrentUser(user);

      setProposalsLoading(true);
      setProposalsError(null);
      try {
        const { data } = await getMyProposals();
        setProposals(Array.isArray(data) ? data : []);
      } catch (proposalError) {
        setProposalsError(proposalError);
      } finally {
        setProposalsLoading(false);
      }

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
      setOpenShifts([]);
      setLoadError(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedStoreIndex]);

  const proposalErrorMessage = (error) => {
    const status = error?.response?.status;
    if (status === 400) return error.response?.data?.message || 'Đề xuất không còn hợp lệ hoặc đã được xử lý.';
    if (status === 403) return 'Bạn không có quyền phản hồi đề xuất này.';
    if (status === 409) return error.response?.data?.message || 'Đề xuất vừa được thay đổi. Vui lòng tải lại.';
    if (status >= 500) return 'Máy chủ đang gặp lỗi. Vui lòng thử lại sau.';
    return 'Không thể kết nối máy chủ để tải đề xuất.';
  };

  const handleProposalResponse = (proposal, accepted) => {
    showAlert(
      accepted ? 'Nhận đề xuất?' : 'Từ chối đề xuất?',
      accepted ? 'Bạn sẽ được phân công vào yêu cầu hỗ trợ này nếu đủ điều kiện.' : 'Bạn có chắc muốn từ chối đề xuất này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: accepted ? 'Nhận' : 'Từ chối',
          style: accepted ? 'default' : 'destructive',
          onPress: () => runAction(`proposal:${proposal.id}`, async () => {
            try {
              setRespondingProposalId(proposal.id);
              await respondProposal(proposal.id, { accepted });
              await loadData();
              showAlert('Thành công', accepted ? 'Đã nhận đề xuất hỗ trợ.' : 'Đã từ chối đề xuất.');
            } catch (error) {
              showAlert('Không thể phản hồi', proposalErrorMessage(error));
            } finally {
              setRespondingProposalId(null);
            }
          }),
        },
      ]
    );
  };

  useEffect(() => {
    setLoading(true);
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

  const marketplaceErrorMessage = (error) => {
    const status = error?.response?.status;
    if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    if (status === 403) return 'Bạn không có quyền xem ca mở tại chi nhánh này.';
    if (status >= 500) return 'Máy chủ đang gặp lỗi. Vui lòng thử lại sau.';
    return 'Không thể tải ca mở. Vui lòng kiểm tra kết nối và thử lại.';
  };

  const handleClaim = (shift, weeklyHoursStatus) => {
    if (weeklyHoursStatus?.exceeds) {
      showAlert(
        'Vượt định mức tuần',
        `Hợp đồng của bạn tại chi nhánh quy định tối đa ${weeklyHoursStatus.maxWeeklyHours} giờ/tuần. Bạn đã có ${weeklyHoursStatus.currentWeekHours} giờ và ca này ${weeklyHoursStatus.shiftHours} giờ. Vui lòng chọn ca khác phù hợp hơn.`
      );
      return;
    }
    const dateStr = fmtDateVN(shift.shiftDate);
    const timeStr = `${shift.startTime?.slice(0, 5)} - ${shift.endTime?.slice(0, 5)}`;
    const storeId = currentStore?.storeId || currentStore?.id;

    if (!storeId) {
      showAlert('Thông báo', 'Không tìm thấy thông tin chi nhánh làm việc.');
      return;
    }

    showAlert(
      'Xác nhận nhận ca',
      `Bạn có chắc chắn muốn đăng ký nhận ca làm việc ngày ${dateStr} (${timeStr}) không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đồng ý nhận ca',
          style: 'default',
          onPress: () => runAction(`claim:${shift.id}`, async () => {
            try {
              setClaimingId(shift.id);
              const checked = await submitCheckedClaim({ userId: currentUser?.id, storeId, shiftId: shift.id });
              if (checked.conflicts.length) {
                setScheduleConflict(checked);
                return;
              }
              // The backend claims the shift before the success dialog opens.
              // Refresh immediately so the card reflects the authoritative state
              // without requiring a second user action.
              await loadData();
              showAlert(
                'Đăng ký thành công',
                'Bạn đã nhận ca thành công! Ca làm việc đã được cập nhật trực tiếp vào Lịch làm của bạn.',
                [
                  {
                    text: 'Xem Lịch làm',
                    onPress: () => navigation.navigate('MainTabs', { screen: 'Schedule' }, { pop: true }),
                  },
                  { text: 'Ở lại Sàn ca' },
                ]
              );
            } catch (err) {
              let msg = err.response?.data?.message || err.message || '';
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
              showAlert('Không thể nhận ca', msg);
            } finally {
              setClaimingId(null);
            }
          }),
        },
      ]
    );
  };

  return (
    <SafeAreaView testID="market-screen" style={styles.safeArea}>
      <ScheduleConflictAlert conflict={scheduleConflict} onClose={() => setScheduleConflict(null)} />
      <StatusBar barStyle="dark-content" backgroundColor={uiColors.surface} />

      {/* ═══ HEADER ═══ */}
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button" accessibilityLabel="Quay lại"
          onPress={() => navigation.goBack()}
          style={ensureTouchTarget(styles.backButton)}
          activeOpacity={0.7}
        >
          <BackIcon />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Chợ ca làm việc</Text>
          <Text style={styles.headerSubtitle}>
            {currentStore?.storeName || currentStore?.name || 'Chi nhánh phân công'}
          </Text>
        </View>
        <TouchableOpacity accessibilityLabel="Làm mới chợ ca" accessibilityRole="button"
          onPress={onRefresh}
          style={ensureTouchTarget(styles.refreshBtn)}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh-outline" size={22} color={uiColors.primaryStrong} accessible={false} />
        </TouchableOpacity>
      </View>

      {/* ═══ STORE SELECTOR STRIP (NẾU NHÂN VIÊN THUỘC NHIỀU CHI NHÁNH) ═══ */}
      {stores.length > 1 && (
        <View style={styles.storeSelectorStrip}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storeListContent}>
            {stores.map((s, idx) => {
              const isSelected = selectedStoreIndex === idx;
              return (
                <TouchableOpacity accessibilityRole="button"
                  key={s.id || s.storeId || idx}
                  style={ensureTouchTarget([styles.storePill, isSelected && styles.storePillActive])}
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
        contentContainerStyle={[styles.contentContainer, { paddingBottom: bottomNavbarPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[uiColors.ink]} />
        }
      >
        <View style={styles.bannerCard}>
          <View style={styles.bannerTop}>
            <View style={styles.bannerBadgeWrap}><Text style={styles.bannerBadgeText}>SÀN CA MỞ</Text></View>
            <Text style={styles.bannerCountText}>{loading ? 'Đang tải ca…' : loadError ? 'Chưa tải được ca' : `${openShifts.length} ca đang mở`}</Text>
          </View>
          <View style={styles.bannerHero}>
            <View style={styles.bannerCopy}>
              <Text style={styles.bannerHeading}>Tìm ca phù hợp với bạn</Text>
              <Text style={styles.bannerDesc}>Chọn ca còn trống và đăng ký khi phù hợp với lịch làm của bạn.</Text>
            </View>
            <ThreeIllustration kind="tiger" size={144} animated interactive />
          </View>
          <View style={styles.bannerStats}>
            <View style={styles.bannerStat}><Text style={styles.bannerStatValue}>{loading || loadError ? '—' : openShifts.length}</Text><Text style={styles.bannerStatLabel}>Ca đang tìm người</Text></View>
            <View style={styles.bannerStatDivider} />
            <View style={styles.bannerStat}><Text style={styles.bannerStatValue}>{proposalsLoading || proposalsError ? '—' : proposals.filter(item => item.status === 'PENDING').length}</Text><Text style={styles.bannerStatLabel}>Đề xuất chờ phản hồi</Text></View>
          </View>
        </View>

        <View style={styles.proposalSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionCopy}><Text style={styles.sectionTitle}>Đề xuất chi viện nhân sự</Text><Text style={styles.sectionSubtitle}>Lời mời hỗ trợ từ quản lý</Text></View>
            <TouchableOpacity accessibilityRole="button" style={ensureTouchTarget()} onPress={onRefresh} disabled={proposalsLoading}>
              <Text style={styles.proposalRefreshText}>Làm mới</Text>
            </TouchableOpacity>
          </View>
          {proposalsLoading ? (
            <View style={styles.proposalState}><ActivityIndicator size="small" color={uiColors.primaryStrong} /></View>
          ) : proposalsError ? (
            <View style={styles.proposalErrorCard}>
              <Text style={styles.proposalErrorText}>{proposalErrorMessage(proposalsError)}</Text>
              <TouchableOpacity accessibilityRole="button" onPress={onRefresh} style={ensureTouchTarget(styles.proposalRetryButton)}>
                <Text style={styles.proposalRetryText}>Thử lại</Text>
              </TouchableOpacity>
            </View>
          ) : proposals.length === 0 ? (
            <View style={styles.proposalEmptyCard}>
              <View style={styles.proposalEmptyIcon}><Ionicons name="people-outline" size={22} color={uiColors.muted} accessible={false} /></View>
              <View style={styles.sectionCopy}><Text style={styles.proposalEmptyTitle}>Chưa có lời mời hỗ trợ</Text><Text style={styles.proposalEmptyText}>Bạn chưa có đề xuất chi viện nào.</Text></View>
            </View>
          ) : (
            proposals.map((proposal) => {
              const isPending = proposal.status === 'PENDING';
              const isResponding = respondingProposalId === proposal.id || !!busy[`proposal:${proposal.id}`];
              const statusLabel = proposal.status === 'ACCEPTED'
                ? 'Đã nhận'
                : proposal.status === 'DECLINED' ? 'Đã từ chối' : 'Đang chờ phản hồi';
              return (
                <View key={proposal.id} testID={`market-proposal-${proposal.id}`} style={styles.proposalCard}>
                  <View style={styles.proposalCardHeader}>
                    <Text style={styles.proposalTitle}>Đề xuất hỗ trợ nhân sự</Text>
                    <Text style={[styles.proposalStatus, isPending && styles.proposalStatusPending]}>{statusLabel}</Text>
                  </View>
                  <Text style={styles.proposalDetail}>Đơn vị đề xuất: {proposal.proposedByName || '—'}</Text>
                  <Text style={styles.proposalDetail}>Mã yêu cầu: {proposal.workforceRequestId || '—'}</Text>
                  <Text style={styles.proposalDetail}>Ngày tạo: {proposal.createdAt ? formatVietnamTime(proposal.createdAt, { dateStyle: 'short', timeStyle: 'short' }) : '—'}</Text>
                  {isPending && (
                    <View style={styles.proposalActions}>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Từ chối đề xuất hỗ trợ"
                        accessibilityState={{ disabled: isResponding, busy: isResponding }} aria-disabled={isResponding} aria-busy={isResponding}
                        style={ensureTouchTarget([styles.proposalActionButton, styles.proposalDeclineButton, isResponding && styles.claimButtonDisabled])}
                        disabled={isResponding}
                        onPress={() => handleProposalResponse(proposal, false)}
                      >
                        {isResponding ? <ActivityIndicator size="small" color={uiColors.muted} /> : <Text style={styles.proposalDeclineText}>Từ chối</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Nhận đề xuất hỗ trợ"
                        accessibilityState={{ disabled: isResponding, busy: isResponding }} aria-disabled={isResponding} aria-busy={isResponding}
                        style={ensureTouchTarget([styles.proposalActionButton, styles.proposalAcceptButton, isResponding && styles.claimButtonDisabled])}
                        disabled={isResponding}
                        onPress={() => handleProposalResponse(proposal, true)}
                      >
                        {isResponding ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.proposalAcceptText}>Nhận đề xuất</Text>}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Tiêu đề danh sách */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionCopy}><Text style={styles.sectionTitle}>Ca làm việc khả dụng</Text><Text style={styles.sectionSubtitle}>Lọc theo vị trí và giờ bắt đầu</Text></View>
        </View>

        <View testID="market-filters" style={styles.filterPanel}>
          <View style={styles.filterHeading}>
            <Text style={styles.filterLabel}>Vị trí</Text>
            {hasFilters && <TouchableOpacity accessibilityRole="button" onPress={clearFilters} style={ensureTouchTarget(styles.clearFiltersButton)}>
              <Text style={styles.clearFiltersText}>Xóa bộ lọc</Text>
            </TouchableOpacity>}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChoices}>
            {[null, ...roleOptions].map((role) => {
              const selected = normalizeRole(filters.role) === normalizeRole(role);
              return <TouchableOpacity key={role || 'all'} accessibilityRole="button" accessibilityLabel={`Lọc vị trí: ${role || 'Tất cả'}`} accessibilityState={{ selected }} aria-selected={selected} aria-pressed={selected} onPress={() => setFilters((previous) => ({ ...previous, role }))} style={ensureTouchTarget([styles.filterChoice, selected && styles.filterChoiceSelected])}>
                <Text style={[styles.filterChoiceText, selected && styles.filterChoiceTextSelected]}>{role || 'Tất cả vị trí'}</Text>
              </TouchableOpacity>;
            })}
          </ScrollView>
          <Text style={styles.periodLabel}>Khung giờ bắt đầu</Text>
          <View style={styles.periodChoices}>
            {PERIOD_FILTERS.map((period) => {
              const selected = filters.period === period.value;
              return <TouchableOpacity key={period.value} accessibilityRole="button" accessibilityLabel={`Lọc giờ bắt đầu ca: ${period.label}`} accessibilityState={{ selected }} aria-selected={selected} aria-pressed={selected} onPress={() => setFilters((previous) => ({ ...previous, period: period.value }))} style={ensureTouchTarget([styles.periodChoice, selected && styles.periodChoiceSelected])}>
                <Text style={[styles.periodChoiceText, selected && styles.periodChoiceTextSelected]}>{period.label}</Text>
              </TouchableOpacity>;
            })}
          </View>
          <Text style={styles.filterHint}>Sáng 06:00–11:59 · Chiều 12:00–17:59 · Tối 18:00–05:59</Text>
          {!loading && !loadError && <Text style={styles.filterResultCount}>Hiển thị {filteredOpenShifts.length}/{openShifts.length} ca mở</Text>}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={uiColors.ink} />
            <Text style={styles.loadingText}>Đang tải danh sách ca mở...</Text>
          </View>
        ) : loadError ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Không tải được ca mở</Text>
            <Text style={styles.emptySubtitle}>{marketplaceErrorMessage(loadError)}</Text>
            <TouchableOpacity accessibilityRole="button" onPress={onRefresh} style={ensureTouchTarget(styles.reloadEmptyBtn)}>
              <Text style={styles.reloadEmptyText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : filteredOpenShifts.length > 0 ? (
          filteredOpenShifts.map((shift) => {
            const isClaimingThis = claimingId === shift.id || !!busy[`claim:${shift.id}`];
            const duration = calcShiftDuration(shift.startTime, shift.endTime);
            const primaryRole = shift.skillName || shift.skillRequirements?.[0]?.skillName || 'Nhân viên';
            const theme = getRoleTheme(primaryRole);

            // Kiểm tra nhân viên đã có trong ca này chưa
            const isAlreadyInShift = isAssignedTo(shift, currentUser?.id);

            // Kiểm tra xung đột giờ với ca cá nhân đã có
            let knownConflicts = [];
            try { knownConflicts = findScheduleConflicts(shift, myShifts, { userId: currentUser?.id, storeId: currentStoreId, excludedShiftId: shift.id, activeStoreIds: stores.filter((store) => store.status === 'ACTIVE').map((store) => store.storeId || store.id) }); }
            catch { /* Card hints are optional; the action always checks a fresh, complete schedule. */ }
            const conflictingShift = knownConflicts[0]?.shift;

            // Kiểm tra định mức giờ làm việc theo tuần (theo hợp đồng tại chi nhánh)
            const maxWeeklyHours = currentStore?.contractType?.maxWeeklyHours || 40;
            let weeklyHoursStatus = { exceeds: false, currentWeekHours: 0, shiftHours: 0, maxWeeklyHours };
            try {
              const shiftDate = new Date(`${shift.shiftDate}T00:00:00Z`);
              const day = shiftDate.getUTCDay();
              const diffToMonday = shiftDate.getUTCDate() - day + (day === 0 ? -6 : 1);
              const monday = new Date(shiftDate);
              monday.setUTCDate(diffToMonday);
              monday.setUTCHours(0, 0, 0, 0);
              const sunday = new Date(monday);
              sunday.setUTCDate(monday.getUTCDate() + 6);
              sunday.setUTCHours(23, 59, 59, 999);

              let currentWeekHours = 0;
              myShifts.forEach((s) => {
                if (String(s.storeId) !== String(currentStoreId) || !isAssignedTo(s, currentUser?.id) || ['CANCELLED', 'DRAFT'].includes(s.status)) return;
                const d = new Date(`${s.shiftDate}T00:00:00Z`);
                if (d >= monday && d <= sunday) {
                  currentWeekHours += calcShiftDurationHours(s.startTime, s.endTime);
                }
              });

              const shiftHours = calcShiftDurationHours(shift.startTime, shift.endTime);
              const exceeds = currentWeekHours + shiftHours > maxWeeklyHours;
              weeklyHoursStatus = {
                exceeds,
                currentWeekHours: Math.round(currentWeekHours * 10) / 10,
                shiftHours: Math.round(shiftHours * 10) / 10,
                maxWeeklyHours,
              };
            } catch (e) {
              // ignore
            }

            return (
              <View key={shift.id} testID={`market-shift-${shift.id}`} style={styles.shiftCard}>
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
                      <Ionicons name="time-outline" size={20} color={uiColors.secondary} accessible={false} />
                      <Text style={styles.timeText}>
                        {shift.startTime?.slice(0, 5)} - {shift.endTime?.slice(0, 5)}
                      </Text>
                      {duration ? <Text style={styles.durationText}>{duration}</Text> : null}
                    </View>
                    <View style={styles.locationRow}><Ionicons name="location-outline" size={14} color={uiColors.muted} accessible={false} /><Text style={styles.locationText}>{shift.storeName || currentStore?.storeName || currentStore?.name || 'Chi nhánh phân công'}</Text></View>
                  </View>

                  {/* Cảnh báo trạng thái cá nhân: Đã tham gia hoặc Trùng ca hoặc Vượt mức tuần */}
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
                        Trùng ca đã lưu: {formatIntervalVN(knownConflicts[0].interval)}
                      </Text>
                    </View>
                  ) : weeklyHoursStatus.exceeds ? (
                    <View style={styles.alertBoxWarning}>
                      <View style={styles.alertDotWarning} />
                      <Text style={styles.alertTextWarning}>
                        Vượt định mức tuần ({weeklyHoursStatus.currentWeekHours}h/{weeklyHoursStatus.maxWeeklyHours}h - ca này {weeklyHoursStatus.shiftHours}h)
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
                            <View style={[styles.skillDot, { backgroundColor: uiColors.muted }]} />
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
                        : weeklyHoursStatus.exceeds
                        ? `Vượt mức tuần (${weeklyHoursStatus.currentWeekHours}h/${weeklyHoursStatus.maxWeeklyHours}h)`
                        : 'Bấm nhận ca để đăng ký ngay'}
                    </Text>

                    {isAlreadyInShift ? (
                      <View style={styles.joinedBadge}>
                        <Text style={styles.joinedBadgeText}>Đã tham gia</Text>
                      </View>
                    ) : conflictingShift ? (
                      <TouchableOpacity
                        style={ensureTouchTarget(styles.conflictBtn)}
                        accessibilityRole="button"
                        accessibilityLabel="Kiểm tra trùng lịch với dữ liệu mới nhất"
                        disabled={isClaimingThis}
                        onPress={() => handleClaim(shift, weeklyHoursStatus)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.conflictBtnText}>Trùng lịch</Text>
                      </TouchableOpacity>
                    ) : weeklyHoursStatus.exceeds ? (
                      <TouchableOpacity accessibilityRole="button"
                        style={ensureTouchTarget(styles.overHoursBtn)}
                        onPress={() => {
                          showAlert(
                            'Vượt định mức tuần',
                            `Hợp đồng của bạn tại chi nhánh tối đa ${weeklyHoursStatus.maxWeeklyHours} giờ/tuần. Bạn đã có ${weeklyHoursStatus.currentWeekHours} giờ trong tuần này. Ca này kéo dài ${weeklyHoursStatus.shiftHours} giờ nên nếu nhận sẽ vượt giới hạn quy định.`
                          );
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.overHoursBtnText}>Quá giờ tuần</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={ensureTouchTarget([styles.claimButton, isClaimingThis && styles.claimButtonDisabled])}
                        accessibilityRole="button"
                        accessibilityLabel={`Nhận ca ngày ${fmtDateVN(shift.shiftDate)}, ${shift.startTime?.slice(0, 5)} - ${shift.endTime?.slice(0, 5)}`}
                        accessibilityState={{ disabled: isClaimingThis, busy: isClaimingThis }} aria-disabled={isClaimingThis} aria-busy={isClaimingThis}
                        onPress={() => handleClaim(shift, weeklyHoursStatus)}
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
            <ThreeIllustration kind="swap" size={132} />
            <Text style={styles.emptyTitle}>{openShifts.length > 0 ? 'Không có ca phù hợp bộ lọc' : 'Hiện chưa có ca mở nào'}</Text>
            <Text style={styles.emptySubtitle}>
              {openShifts.length > 0
                ? 'Thử chọn vị trí hoặc khung giờ khác để xem thêm ca.'
                : 'Tất cả các ca làm việc trong chi nhánh đã được bố trí đủ nhân sự hoặc chưa được mở trên Sàn ca.'}
            </Text>
            <TouchableOpacity accessibilityRole="button" style={ensureTouchTarget(styles.reloadEmptyBtn)} onPress={openShifts.length > 0 ? clearFilters : onRefresh} activeOpacity={0.7}>
              <Text style={styles.reloadEmptyText}>{openShifts.length > 0 ? 'Xóa bộ lọc' : 'Làm mới danh sách'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ═══ BOTTOM NAV ═══ */}
      <BottomNavbar navigation={navigation} activeRoute="Marketplace" />
    </SafeAreaView>
  );
}

const styles = createAppStyles({
  bannerHero: { flexDirection: 'row', alignItems: 'center', gap: 0, marginRight: -12, marginTop: -6, marginBottom: -6 },
  bannerCopy: { flex: 1, minWidth: 0 },
  bannerStats: { flexDirection: 'row', alignItems: 'center', paddingTop: 15, marginTop: 7, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: uiColors.primaryTrack, gap: 14 },
  bannerStat: { flex: 1, minWidth: 0 },
  bannerStatValue: { color: uiColors.ink, fontSize: 22, lineHeight: 28, fontWeight: '700' },
  bannerStatLabel: { color: uiColors.secondary, fontSize: 10, lineHeight: 16, marginTop: 3 },
  bannerStatDivider: { width: 1, height: 31, backgroundColor: uiColors.primaryTrack },
  sectionCopy: { flex: 1, minWidth: 0 },
  sectionSubtitle: { color: uiColors.muted, fontSize: 11, lineHeight: 17, marginTop: 3 },
  periodChoices: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 15, backgroundColor: uiColors.subtle },
  periodChoice: { flex: 1, minWidth: 0, minHeight: 48, paddingHorizontal: 3, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  periodChoiceSelected: { backgroundColor: uiColors.primary },
  periodChoiceText: { color: uiColors.secondary, fontSize: 11, lineHeight: 17, fontWeight: '500', textAlign: 'center' },
  periodChoiceTextSelected: { color: uiColors.white, fontWeight: '600' },
  locationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: 9 },
  locationText: { flex: 1, minWidth: 0, color: uiColors.muted, fontSize: 11, lineHeight: 17 },
  proposalEmptyIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: uiColors.subtle, alignItems: 'center', justifyContent: 'center' },
  proposalEmptyTitle: { color: uiColors.secondary, fontSize: 12, lineHeight: 19, fontWeight: '600' },
  filterPanel: { marginBottom: 18, padding: 16, borderRadius: 20, backgroundColor: uiColors.surface, borderWidth: 1, borderColor: uiColors.line },
  filterHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 36 },
  filterLabel: { color: uiColors.ink, fontSize: 12, fontWeight: '600' },
  clearFiltersButton: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 4 },
  clearFiltersText: { color: uiColors.primaryStrong, fontSize: 12, fontWeight: '600' },
  filterChoices: { flexDirection: 'row', gap: 7, paddingVertical: 3 },
  filterChoice: { minHeight: 48, paddingHorizontal: 13, borderWidth: 1, borderColor: uiColors.line, borderRadius: 14, backgroundColor: uiColors.surface, justifyContent: 'center' },
  filterChoiceSelected: { borderColor: uiColors.orange, backgroundColor: uiColors.peach },
  filterChoiceText: { color: uiColors.secondary, fontSize: 12 },
  filterChoiceTextSelected: { color: uiColors.primaryStrong, fontWeight: '600' },
  periodLabel: { color: uiColors.ink, fontSize: 12, fontWeight: '600', marginTop: 16, marginBottom: 9 },
  filterHint: { color: uiColors.muted, fontSize: 9, marginTop: 8, lineHeight: 15 },
  filterResultCount: { color: uiColors.secondary, fontSize: 11, lineHeight: 17, marginTop: 12, paddingTop: 11, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: uiColors.line },
  safeArea: {
    flex: 1,
    backgroundColor: uiColors.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: uiColors.canvas,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: uiColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrowText: {
    fontSize: 18,
    fontWeight: '700',
    color: uiColors.ink,
  },
  headerTitleWrap: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: uiColors.ink,
  },
  headerSubtitle: {
    maxWidth: '100%',
    textAlign: 'center',
    fontSize: 11,
    color: uiColors.muted,
    fontWeight: '500',
    marginTop: 2,
  },
  refreshBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: uiColors.peach,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: uiColors.ink,
  },
  storeSelectorStrip: {
    backgroundColor: uiColors.canvas,
    paddingVertical: 6,
  },
  storeListContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  storePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: uiColors.surface,
    borderWidth: 1,
    borderColor: uiColors.line,
  },
  storePillActive: {
    backgroundColor: uiColors.peach,
    borderColor: uiColors.primary,
  },
  storePillText: {
    fontSize: 12,
    fontWeight: '500',
    color: uiColors.secondary,
  },
  storePillTextActive: {
    color: uiColors.primaryStrong,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 120,
  },
  bannerCard: {
    backgroundColor: uiColors.peach,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: uiColors.line,
    marginBottom: 22,
  },
  bannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 3,
  },
  bannerBadgeWrap: {
    backgroundColor: uiColors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  bannerBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: uiColors.primaryStrong,
    letterSpacing: 0.5,
  },
  bannerCountText: {
    fontSize: 10,
    fontWeight: '500',
    color: uiColors.primaryStrong,
  },
  bannerHeading: {
    fontSize: 21,
    lineHeight: 28,
    letterSpacing: -0.5,
    fontWeight: '700',
    color: uiColors.ink,
    marginBottom: 4,
  },
  bannerDesc: {
    fontSize: 11,
    color: uiColors.secondary,
    lineHeight: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
    color: uiColors.ink,
  },
  loadingContainer: {
    paddingVertical: 36,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12.5,
    color: uiColors.muted,
  },
  shiftCard: {
    flexDirection: 'row',
    backgroundColor: uiColors.surface,
    borderRadius: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: uiColors.line,
    overflow: 'hidden',
  },
  cardVerticalBar: {
    width: 4,
  },
  cardInner: {
    flex: 1,
    minWidth: 0,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 15,
  },
  dateWrap: {
    flex: 1,
    minWidth: 0,
  },
  dateText: {
    fontSize: 12,
    lineHeight: 19,
    fontWeight: '600',
    color: uiColors.ink,
  },
  openBadge: {
    backgroundColor: uiColors.mint,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#DCE9E0",
  },
  openBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: uiColors.successStrong,
  },
  timeLocationRow: {
    marginBottom: 15,
  },
  timeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 7,
  },
  timeText: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '600',
    color: uiColors.ink,
  },
  durationText: {
    fontSize: 10,
    color: uiColors.muted,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: uiColors.subtle,
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
    backgroundColor: uiColors.canvas,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    maxWidth: '100%',
    flexWrap: 'wrap',
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
    color: uiColors.ink,
    marginRight: 6,
  },
  missingCountBadge: {
    backgroundColor: uiColors.canvas,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  missingCountText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: uiColors.secondary,
  },
  skillTagFilled: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: uiColors.canvas,
    borderWidth: 1,
    borderColor: uiColors.line,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    maxWidth: '100%',
    flexWrap: 'wrap',
  },
  skillTextFilled: {
    fontSize: 11.5,
    fontWeight: '500',
    color: uiColors.muted,
    marginRight: 4,
  },
  filledCountText: {
    fontSize: 10.5,
    color: uiColors.muted,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: uiColors.line,
  },
  footerNote: {
    flex: 1,
    minWidth: 0,
    fontSize: 10,
    lineHeight: 16,
    color: uiColors.muted,
  },
  claimButton: {
    backgroundColor: uiColors.orange,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 13,

    minHeight: 48,
    minWidth: 92,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimButtonDisabled: {
    opacity: 0.6,
  },
  claimButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  alertBoxSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: uiColors.mint,
    borderWidth: 1,
    borderColor: "#DCE9E0",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 8,
  },
  alertDotSuccess: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: uiColors.success,
    marginRight: 6,
  },
  alertTextSuccess: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '600',
    color: uiColors.successText,
  },
  alertBoxConflict: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: uiColors.butter,
    borderWidth: 1,
    borderColor: "#EBDDAD",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 8,
  },
  alertDotConflict: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: uiColors.warning,
    marginRight: 6,
  },
  alertTextConflict: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '600',
    color: uiColors.warningText,
  },
  alertBoxWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: uiColors.peach,
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 8,
  },
  alertDotWarning: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: uiColors.orange,
    marginRight: 6,
  },
  alertTextWarning: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '600',
    color: uiColors.primaryStrong,
  },
  joinedBadge: {
    backgroundColor: uiColors.canvas,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: uiColors.line,
  },
  joinedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: uiColors.muted,
  },
  conflictBtn: {
    backgroundColor: uiColors.butter,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#DBC57B",
  },
  conflictBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: uiColors.warningText,
  },
  overHoursBtn: {
    backgroundColor: uiColors.butter,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  overHoursBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: uiColors.primaryStrong,
  },
  emptyCard: {
    backgroundColor: uiColors.surface,
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: uiColors.line,
    marginTop: 8,
  },
  emptyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: uiColors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyIconSymbol: {
    fontSize: 20,
    color: uiColors.muted,
    fontWeight: '700',
  },
  emptyTitle: {
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'center',
    fontWeight: '600',
    color: uiColors.ink,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: uiColors.muted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 14,
  },
  reloadEmptyBtn: {
    backgroundColor: uiColors.peach,
    paddingHorizontal: 18,
    paddingVertical: 10,
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: 13,
  },
  reloadEmptyText: {
    fontSize: 12,
    fontWeight: '600',
    color: uiColors.primaryStrong,
  },
  proposalSection: {
    marginBottom: 22,
  },
  proposalRefreshText: {
    fontSize: 12,
    fontWeight: '700',
    color: uiColors.primaryStrong,
  },
  proposalState: {
    backgroundColor: uiColors.surface,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: uiColors.line,
  },
  proposalCard: {
    backgroundColor: uiColors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: uiColors.line,
  },
  proposalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 9,
    marginBottom: 12,
  },
  proposalTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    color: uiColors.ink,
  },
  proposalStatus: {
    maxWidth: '48%',
    fontSize: 9,
    lineHeight: 15,
    fontWeight: '600',
    color: uiColors.successStrong,
    backgroundColor: uiColors.mint,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 9,
  },
  proposalStatusPending: {
    color: uiColors.warningText,
    backgroundColor: uiColors.butter,
  },
  proposalDetail: {
    fontSize: 11,
    lineHeight: 18,
    color: uiColors.secondary,
    marginTop: 3,
  },
  proposalActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  proposalActionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 13,
    borderWidth: 1,

    minHeight: 48,
  },
  proposalDeclineButton: {
    backgroundColor: uiColors.dangerSoft,
    borderColor: "#EDD3D1",
  },
  proposalAcceptButton: {
    backgroundColor: uiColors.orange,
    borderColor: uiColors.orange,
  },
  proposalDeclineText: {
    fontSize: 12,
    fontWeight: '700',
    color: uiColors.dangerStrong,
  },
  proposalAcceptText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  proposalEmptyCard: {
    backgroundColor: uiColors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderWidth: 1,
    borderColor: uiColors.line,
  },
  proposalEmptyText: {
    fontSize: 11,
    lineHeight: 17,
    marginTop: 3,
    color: uiColors.muted,
  },
  proposalErrorCard: {
    backgroundColor: uiColors.peach,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  proposalErrorText: {
    fontSize: 12.5,
    color: uiColors.primaryStrong,
    marginBottom: 8,
  },
  proposalRetryButton: {
    alignSelf: 'flex-start',
    backgroundColor: uiColors.butter,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
  },
  proposalRetryText: {
    fontSize: 12,
    fontWeight: '700',
    color: uiColors.primaryStrong,
  },
});

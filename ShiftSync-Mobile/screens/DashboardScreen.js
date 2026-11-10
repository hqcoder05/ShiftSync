import { colors as uiColors } from '../theme/koreanPalette';
import { createAppStyles } from '../theme/appTheme';
import { ensureTouchTarget } from '../utils/touchTarget';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AnimatedNotificationIcon from '../components/AnimatedNotificationIcon';
import IncomeIllustration from '../components/IncomeIllustration';
import AnimalCompanionGallery from '../components/AnimalCompanionGallery';
import UserAvatar from '../components/UserAvatar';
import DashboardSkeleton from '../components/DashboardSkeleton';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomNavbar, { useBottomNavbarPadding } from '../components/BottomNavbar';
import { getMyShifts } from '../services/shiftService';
import { getMyPayslips } from '../services/payrollService';
import { getMyAttendance } from '../services/attendanceService';
import { getMyProfile } from '../services/profileService';
import { getStoredAvatar, resolveProfileAvatar, onAvatarChange } from '../services/avatarSync';
import { formatVND, formatHourlyRate, formatDateDMY } from '../utils/currency';

import { getUnreadNotificationCount, getUnreadSnapshot, subscribeUnreadCount } from '../services/notificationService';
import { vietnamDateKey, vietnamCalendarDate, vietnamHour } from '../utils/vietnamTime';
import { useI18n } from '../i18n';
import useResumeRefresh from '../utils/useResumeRefresh';

const nav = (navigation, destination) => {
  if (navigation.getState?.().routeNames?.includes(destination)) {
    navigation.navigate(destination);
  } else {
    (navigation.getParent?.() || navigation).navigate(destination);
  }
};

const localDateISO = vietnamDateKey;

const getVietnameseDateString = (date = new Date()) => {
  date = vietnamCalendarDate(date);
  const dayOfWeek = date.getDay();
  const weekdayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const weekdayStr = weekdayNames[dayOfWeek];
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${weekdayStr}, ${dd} THÁNG ${mm}`;
};


const formatTimeWithPeriod = (timeStr) => {
  if (!timeStr) return { time: '—', period: '' };
  const parts = String(timeStr).split(':');
  let h = parseInt(parts[0], 10);
  const m = parts[1] || '00';
  const period = h < 12 ? 'AM' : 'PM';
  const displayHour = h % 12 || 12;
  return { time: `${displayHour}:${m}`, period };
};

const getShiftPosition = (item, userId) => {
  const assignment = (item?.shiftAssignments || []).find(
    (candidate) => String(candidate?.staffId) === String(userId)
  );
  return assignment?.zoneName
    || assignment?.skillName
    || 'Chưa xác định vị trí';
};

const hasAuthenticatedAssignment = (item, userId) => (
  Boolean(userId)
  && (item?.shiftAssignments || []).some(
    (candidate) => String(candidate?.staffId) === String(userId)
  )
);

function ShiftRow({ item, userId, onPress }) {
  const startTime = formatTimeWithPeriod(item.startTime);
  const endTime = formatTimeWithPeriod(item.endTime);
  const address = item.storeName || item.storeAddress || 'Chi nhánh phân công';
  const position = getShiftPosition(item, userId);
  const date = item.shiftDate ? new Date(`${item.shiftDate}T00:00:00`) : null;
  const weekday = date ? ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()] : '';

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Xem ca ngày ${item.shiftDate}, ${startTime.time} ${startTime.period} đến ${endTime.time} ${endTime.period}, ${address}`} onPress={onPress} style={ensureTouchTarget(({ pressed }) => [s.shiftRow, pressed && s.rowPressed])}>
      <View style={s.dateGutter}>
        <Text style={s.dateGutterText}>{weekday}</Text>
        <Text style={s.dateGutterDay}>{date?.getDate() || '—'}</Text>
        <Text style={s.dateGutterText}>{date ? `TH${date.getMonth() + 1}` : ''}</Text>
      </View>
      <View style={s.shiftInfo}>
        <Text style={s.shiftTimeRange}>{startTime.time}{startTime.period}–{endTime.time}{endTime.period}</Text>
        <Text style={s.address}>{address}</Text>
        <View style={s.roleRow}>
          <View style={s.dot} />
          <Text style={s.rowRole} numberOfLines={1}>{position}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={uiColors.muted} accessible={false} />
    </Pressable>
  );
}

export default function DashboardScreen({ navigation }) {
  const { t } = useI18n();
  useResumeRefresh(navigation, () => loadData());
  const bottomNavbarPadding = useBottomNavbarPadding();
  const [assignedShifts, setAssignedShifts] = useState([]);
  const [latestPayslip, setLatestPayslip] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState(null);
  const [selectedAvatarId, setSelectedAvatarId] = useState('dilan');
  const [unreadNotifCount, setUnreadNotifCount] = useState(getUnreadSnapshot);
  const isFetchingRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  useEffect(() => subscribeUnreadCount(setUnreadNotifCount), []);

  const todayText = getVietnameseDateString(new Date());

  const loadData = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    const pending = [];

    try {
      const todayIso = localDateISO();
      pending.push(getMyShifts().then((res) => { setAssignedShifts(res.data || []); setLoadError(false); }).catch(() => setLoadError(true)));
      pending.push(getMyPayslips().then((res) => setLatestPayslip(res.data?.[0] || null)).catch(() => {}));
      pending.push(getUnreadNotificationCount().then((res) => setUnreadNotifCount(Number(res.data?.unreadCount || 0))).catch(() => {}));
      pending.push(getMyAttendance().then((res) => {
        const records = res.data || [];
        const found = records.find((a) => a.shiftDate === todayIso);
        setTodayAttendance(found || null);
      }).catch(() => {
        setTodayAttendance(null);
      }));

      try {
        const res = await getMyProfile();
        const profile = res.data;
        setUserId(profile?.id || null);
        const name = profile?.fullName || profile?.name || '';
        setUserName(name);

        setSelectedAvatarId(await resolveProfileAvatar(profile));


      } catch (err) {
        // Nếu API profile lỗi/offline, luôn đọc lại avatar đã lưu trong AsyncStorage
        const cached = await getStoredAvatar();
        if (cached) setSelectedAvatarId(cached);
      }
    } finally {
      await Promise.allSettled(pending);
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    // 1. Nạp avatar từ local cache NGAY LẬP TỨC khi mở màn hình
    getStoredAvatar().then((cached) => {
      if (cached) setSelectedAvatarId(cached);
    });

    // 2. Lắng nghe thay đổi avatar theo thời gian thực (khi đổi ở Profile là Home đổi ngay)
    const unsubAvatar = onAvatarChange((newAvatarId) => {
      if (newAvatarId) {
        setSelectedAvatarId(newAvatarId);
      }
    });

    loadData();

    // 3. Khi màn hình Dashboard được focus lại (từ Profile quay lại)
    const unsubscribeFocus = navigation.addListener('focus', () => {
      getStoredAvatar().then((cached) => {
        if (cached) setSelectedAvatarId(cached);
      });
      loadData();
    });

    return () => {
      unsubAvatar();
      unsubscribeFocus();
    };
  }, [navigation]);

  const todayIso = localDateISO();
  const realShifts = useMemo(
    () =>
      assignedShifts
        .filter((shift) => (
          shift.shiftDate >= todayIso
          && shift.status !== 'CANCELLED'
          && hasAuthenticatedAssignment(shift, userId)
        ))
        .sort((a, b) => `${a.shiftDate}${a.startTime}`.localeCompare(`${b.shiftDate}${b.startTime}`)),
    [assignedShifts, todayIso, userId]
  );

  const todayShift = realShifts.find((shift) => shift.shiftDate === todayIso);

  // ✅ Báo cáo thu nhập: Backend là Source of Truth. Ưu tiên phiếu lương chính thức từ kỳ gần nhất
  const calculatedStats = useMemo(() => {
    const hours = Number(latestPayslip?.totalHours ?? 0);
    const otHours = Number(latestPayslip?.otHours ?? 0);
    const baseHours = Math.max(0, hours - otHours);
    const baseAmount = Number(latestPayslip?.baseAmount ?? latestPayslip?.totalAmount ?? 0);
    const suppliedRate = Number(latestPayslip?.hourlyRate ?? 0);
    return {
      hours,
      otHours,
      hourlyRate: suppliedRate > 0 ? suppliedRate : baseHours > 0 && baseAmount > 0 ? Math.round(baseAmount / baseHours) : 0,
      rateLabel: suppliedRate > 0 ? 'Đơn giá' : 'Đơn giá bình quân',
    };
  }, [latestPayslip]);

  // ✅ Shifts được lấy trực tiếp từ API, không cần map thành mảng
  const todayShifts = realShifts.filter((shift) => shift.shiftDate === todayIso);
  const displayShifts = realShifts.filter((shift) => shift.shiftDate > todayIso).slice(0, 3);
  const isCheckedIn = Boolean(todayAttendance?.checkInTime);
  const isCheckedOut = Boolean(todayAttendance?.checkOutTime);
  const startTimeObj = todayShift ? formatTimeWithPeriod(todayShift.startTime) : null;
  const endTimeObj = todayShift ? formatTimeWithPeriod(todayShift.endTime) : null;
  const hour = vietnamHour();
  const greeting = t(hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening');

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: bottomNavbarPadding }]} showsVerticalScrollIndicator={false}>
        {loading ? <DashboardSkeleton /> : <>
        <View style={s.hero}>
          <View style={s.heroTopRow}>
            <Pressable accessibilityRole="button" accessibilityLabel="Mở hồ sơ cá nhân" onPress={() => nav(navigation, 'Profile')} style={ensureTouchTarget(({ pressed }) => [s.identityButton, pressed && s.pressed])}>
              <View style={s.avatarButton}><UserAvatar avatarId={selectedAvatarId} size={58} /></View>
              <View style={s.identityCopy}><Text style={s.greeting}>{greeting}</Text><Text numberOfLines={2} style={s.greetingName}>{userName || 'Bạn'}</Text></View>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Xem thông báo" onPress={() => nav(navigation, 'Notification')} style={ensureTouchTarget(({ pressed }) => [s.notifBtn, pressed && s.pressed])}>
              <AnimatedNotificationIcon size={27} />
              {unreadNotifCount > 0 && <View style={s.notifBadge}><Text style={s.notifBadgeText}>{unreadNotifCount > 99 ? '99+' : unreadNotifCount}</Text></View>}
            </Pressable>
          </View>
          <View style={s.todayHeading}><Text style={s.today}>HÔM NAY</Text><Text style={s.todayDate}>{todayText}</Text></View>
          <Text accessibilityRole="header" style={s.headline}>{loadError ? 'Chưa tải được lịch làm' : todayShifts.length ? `Bạn có ${todayShifts.length === 1 ? 'một' : todayShifts.length} ca làm hôm nay` : 'Một ngày chưa có ca làm'}</Text>
          {!todayShift && <Pressable accessibilityRole="button" onPress={() => loadError ? loadData() : nav(navigation, 'Schedule')} style={ensureTouchTarget(s.emptyBanner)}><Text style={s.emptyBannerText}>{loadError ? 'Kiểm tra kết nối và nhấn để thử lại.' : 'Lịch trống hôm nay. Bạn có thể xem các ca sắp tới tại đây.'}</Text><Ionicons name="chevron-forward" size={18} color={uiColors.secondary} accessible={false} /></Pressable>}
          {todayShift && (
            <Pressable accessibilityRole="button" accessibilityLabel={isCheckedOut ? 'Xem lịch sử chấm công của ca hôm nay' : isCheckedIn ? 'Mở chấm công ra ca hôm nay' : 'Mở chấm công vào ca hôm nay'} onPress={() => nav(navigation, 'Attendance')} style={ensureTouchTarget(({ pressed }) => [s.todayCard, pressed && s.pressed])}>
              <View style={s.timeRange}>
                <Text style={s.hours}>{startTimeObj.time}<Text style={s.amPm}> {startTimeObj.period}</Text></Text>
                <Text style={s.timeArrow}>→</Text>
                <Text style={s.hours}>{endTimeObj.time}<Text style={s.amPm}> {endTimeObj.period}</Text></Text>
              </View>
              <View style={s.roleRow}>
                <View style={s.dot} />
                <Text style={s.todayRole} numberOfLines={1}>{getShiftPosition(todayShift, userId)}{todayShift.storeName ? ` (${todayShift.storeName})` : ''}</Text>
              </View>
            </Pressable>
          )}
        </View>


        <AnimalCompanionGallery onOpenScreen={(destination) => nav(navigation, destination)} />

        <View style={s.upcomingSection}>
          <View style={s.sectionHeader}>
            <Text accessibilityRole="header" style={s.sectionTitle}>Ca làm việc sắp tới</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Xem tất cả lịch làm việc" onPress={() => nav(navigation, 'Schedule')} style={ensureTouchTarget(s.sectionLink)}><Text style={s.link}>Xem tất cả</Text></Pressable>
          </View>
          {displayShifts.length ? displayShifts.map((item) => <ShiftRow key={item.id} item={item} userId={userId} onPress={() => nav(navigation, 'Schedule')} />) : <Text style={s.empty}>Chưa có ca làm việc sắp tới.</Text>}
        </View>

        <View style={s.income}>
          <View style={s.sectionHeader}>
            <Text accessibilityRole="header" style={s.sectionTitle}>Thu nhập của bạn</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Xem bảng lương" onPress={() => nav(navigation, 'Payroll')} style={ensureTouchTarget(s.sectionLink)}><Text style={s.link}>Xem tất cả</Text></Pressable>
          </View>
          {latestPayslip ? <>
            <Text style={s.range}>{latestPayslip.periodStartDate && latestPayslip.periodEndDate ? `${formatDateDMY(latestPayslip.periodStartDate)} – ${formatDateDMY(latestPayslip.periodEndDate)}` : 'Phiếu lương gần nhất'}</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit style={s.amount}>{formatVND(Number(latestPayslip.totalAmount || 0))}</Text>
            <View style={s.incomeHero}><View style={{ flex: 1, minWidth: 0 }}><Text style={s.incomeCaption}>Lương thực nhận</Text><Text style={s.incomeNote}>Từ phiếu lương gần nhất</Text></View><IncomeIllustration size={116} /></View>
            <View style={s.statsRow}>
              <View style={s.statColumn}><Text style={s.stat}>{calculatedStats.hours} giờ</Text><Text style={s.incomeCaption}>Giờ làm việc</Text></View>
              <View style={s.statColumn}><Text style={s.stat}>{calculatedStats.otHours} giờ</Text><Text style={s.incomeCaption}>Tăng ca</Text></View>
            </View>
            {calculatedStats.hourlyRate > 0 && <Text style={s.rate}>{calculatedStats.rateLabel} {formatHourlyRate(calculatedStats.hourlyRate)}</Text>}
          </> : <Text style={s.empty}>Chưa có phiếu lương được phát hành.</Text>}
        </View>
        </>}
      </ScrollView>
      <BottomNavbar navigation={navigation} activeRoute="Dashboard" />
    </SafeAreaView>
  );
}

const s = createAppStyles({
  safe: { flex: 1, backgroundColor: uiColors.canvas },
  content: { flexGrow: 1, backgroundColor: uiColors.canvas },
  hero: { backgroundColor: uiColors.surface, marginHorizontal: 16, marginTop: 12, padding: 20, borderRadius: 22, borderWidth: 1, borderColor: uiColors.line },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 26 },
  identityButton: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  identityCopy: { flex: 1, minWidth: 0 },
  avatarButton: { width: 58, height: 58, borderRadius: 19, backgroundColor: uiColors.subtle, justifyContent: 'center', alignItems: 'center' },
  avatar: { width: 35, height: 35, borderRadius: 18, resizeMode: 'cover' },
  avatarFallback: { width: 35, height: 35, borderRadius: 18, backgroundColor: "#DAD6E8", alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 16, color: uiColors.ink, fontWeight: '500' },
  notifBtn: { width: 48, height: 48, borderRadius: 16, backgroundColor: uiColors.subtle, alignItems: 'center', justifyContent: 'center' },
  notifBadge: { position: 'absolute', top: 0, right: 0, minWidth: 19, height: 19, borderRadius: 10, paddingHorizontal: 4, backgroundColor: uiColors.orange, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: "#E1E0EF" },
  notifBadgeText: { fontSize: 10, color: '#FFFFFF', fontWeight: '600' },
  pressed: { opacity: 0.65 },
  emptyBanner: { backgroundColor: uiColors.subtle, borderRadius: 14, padding: 14, flexDirection: 'row', gap: 8, alignItems: 'center' },
  emptyBannerText: { flex: 1, fontSize: 13, color: uiColors.secondary, lineHeight: 20 },
  todayHeading: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 6, marginBottom: 10 },
  today: { color: uiColors.primaryStrong, fontSize: 10, lineHeight: 17, fontWeight: '700', letterSpacing: 0.7 },
  todayDate: { color: uiColors.muted, fontSize: 10, lineHeight: 17 },
  greeting: { color: uiColors.muted, fontSize: 11, lineHeight: 17, marginBottom: 3 },
  greetingName: { color: uiColors.ink, fontSize: 16, lineHeight: 23, fontWeight: '600' },
  headline: { color: uiColors.ink, fontSize: 23, lineHeight: 31, letterSpacing: -0.5, fontWeight: '600', marginBottom: 18 },
  todayCard: { backgroundColor: uiColors.peach, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 18 },
  timeRange: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 7, marginBottom: 20 },
  hours: { fontSize: 29, lineHeight: 36, fontWeight: '500', color: uiColors.ink },
  amPm: { fontSize: 17, lineHeight: 22, fontWeight: '500' },
  timeArrow: { fontSize: 16, color: uiColors.secondary },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#DCE9E0", flexShrink: 0 },
  todayRole: { fontSize: 13, lineHeight: 18, color: uiColors.ink, flex: 1 },
  upcomingSection: { marginHorizontal: 16, marginTop: 14, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, borderRadius: 20, borderWidth: 1, borderColor: uiColors.line, backgroundColor: uiColors.surface },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionTitle: { fontSize: 16, lineHeight: 23, fontWeight: '600', color: uiColors.ink, flex: 1 },
  sectionLink: { minHeight: 36, justifyContent: 'center' },
  link: { fontSize: 11, color: uiColors.primaryStrong, fontWeight: '500' },
  shiftRow: { flexDirection: 'row', alignItems: 'center', minHeight: 92, paddingVertical: 12, gap: 11 },
  rowPressed: { backgroundColor: uiColors.canvas },
  dateGutter: { width: 31, alignItems: 'center', alignSelf: 'flex-start', paddingTop: 1 },
  dateGutterText: { color: uiColors.secondary, fontSize: 11, lineHeight: 17 },
  dateGutterDay: { color: uiColors.ink, fontSize: 13, lineHeight: 19 },
  shiftInfo: { flex: 1, minWidth: 0, gap: 3 },
  shiftTimeRange: { color: uiColors.ink, fontSize: 15, lineHeight: 21 },
  address: { color: uiColors.secondary, fontSize: 13, lineHeight: 18 },
  rowRole: { color: uiColors.muted, fontSize: 13, lineHeight: 18, flex: 1 },
  empty: { color: uiColors.muted, fontSize: 14, lineHeight: 21, paddingVertical: 16 },
  incomeHero: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: -8, marginBottom: -8 },
  income: { maxWidth: 680, alignSelf: 'stretch', marginHorizontal: 16, padding: 18, borderWidth: 1, borderColor: uiColors.line, borderRadius: 22, backgroundColor: uiColors.surface, marginTop: 14, marginBottom: 18 },
  range: { color: uiColors.muted, fontSize: 12, lineHeight: 18 },
  amount: { color: uiColors.ink, fontSize: 29, lineHeight: 38, fontWeight: '600', letterSpacing: -0.7, marginTop: 10 },
  incomeNote: { color: uiColors.muted, fontSize: 10, lineHeight: 16, marginTop: 4 },
  incomeCaption: { color: uiColors.muted, fontSize: 12, lineHeight: 19 },
  statsRow: { backgroundColor: uiColors.canvas, padding: 14, borderRadius: 12, flexDirection: 'row', marginTop: 20, marginBottom: 8, gap: 24 },
  statColumn: { flex: 1 },
  stat: { color: uiColors.ink, fontSize: 18, lineHeight: 25 },
  rate: { color: uiColors.muted, fontSize: 12, lineHeight: 18, marginTop: 10 },
});

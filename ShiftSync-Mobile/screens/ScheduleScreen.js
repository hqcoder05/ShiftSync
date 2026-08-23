import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { getMyShifts, getShiftsForStore } from '../services/shiftService';

// ── Color palette matching the Web Schedule (Figma Prototype) ─────────────
const ROLE_THEMES = {
  Barista: {
    color: '#5BC8B8',      // Teal / Mint
    cardBg: '#F0FAF6',     // Light mint background
    dotColor: '#5BC8B8',
  },
  Cashier: {
    color: '#D97FB2',      // Pink / Mauve
    cardBg: '#FDF2F7',     // Light pink background
    dotColor: '#D97FB2',
  },
  Kitchen: {
    color: '#D98080',      // Salmon / Coral
    cardBg: '#FFF6ED',     // Light orange/salmon
    dotColor: '#D98080',
  },
  Service: {
    color: '#C8C84A',      // Yellow-green / Olive
    cardBg: '#FAFBE8',     // Light yellow-green
    dotColor: '#C8C84A',
  },
  Supervisor: {
    color: '#7AA8D9',      // Blue
    cardBg: '#F2F6FC',     // Light blue
    dotColor: '#7AA8D9',
  },
  Default: {
    color: '#5BC8B8',
    cardBg: '#F0FAF6',
    dotColor: '#5BC8B8',
  }
};

const DAY_LABELS = [
  { fullLabel: 'Thứ 2', shortLabel: 'Thứ 2', dowIndex: 1 },
  { fullLabel: 'Thứ 3', shortLabel: 'Thứ 3', dowIndex: 2 },
  { fullLabel: 'Thứ 4', shortLabel: 'Thứ 4', dowIndex: 3 },
  { fullLabel: 'Thứ 5', shortLabel: 'Thứ 5', dowIndex: 4 },
  { fullLabel: 'Thứ 6', shortLabel: 'Thứ 6', dowIndex: 5 },
  { fullLabel: 'Thứ 7', shortLabel: 'Thứ 7', dowIndex: 6 },
  { fullLabel: 'Thứ CN', shortLabel: 'Thứ CN', dowIndex: 0 },
];

const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
];

// Helper tính danh sách 7 ngày trong tuần theo weekOffset
function getWeekDates(weekOffset = 0) {
  const base = new Date();
  const dow = base.getDay(); // 0: Sun, 1: Mon...
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(base);
  monday.setDate(base.getDate() + diffToMon + weekOffset * 7);

  return DAY_LABELS.map((item, idx) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + idx);
    return {
      ...item,
      dateObj: d,
      dateStr: d.getDate().toString().padStart(2, '0'),
      fullDateStr: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    };
  });
}

// ── Dữ liệu ca làm việc mẫu chuẩn Figma (Ảnh 1 & 2 trong Lịch.docx) ─────────
const DEFAULT_MY_SHIFTS = [
  {
    dayIndex: 2, // Thứ 4 (05)
    timeRange: '6:00AM - 15:00PM',
    location: 'Highlands D9/71 Tây Thạnh Tân Phú',
    role: 'Barista',
  },
  {
    dayIndex: 3, // Thứ 5 (06)
    timeRange: '6:00AM - 14:00PM',
    location: 'Highlands D9/71 Tây Thạnh Tân Phú',
    role: 'Barista',
  },
  {
    dayIndex: 4, // Thứ 6 (07)
    timeRange: '14:00PM - 22:00PM',
    location: 'Highlands D9/71 Tây Thạnh Tân Phú',
    role: 'Cashier',
  },
  {
    dayIndex: 6, // Thứ CN (08 hoặc 09)
    timeRange: '14:00PM - 22:00PM',
    location: 'Highlands D9/71 Tây Thạnh Tân Phú',
    role: 'Cashier',
  },
];

// Dữ liệu ca làm việc của toàn bộ quán (Tab "Schedule")
const DEFAULT_STORE_SHIFTS = [
  {
    dayIndex: 0, // Thứ 2
    staffName: 'Paul. Lee',
    timeRange: '6:00AM - 14:00PM',
    location: 'Highlands D9/71 Tây Thạnh Tân Phú',
    role: 'Barista',
  },
  {
    dayIndex: 0, // Thứ 2
    staffName: 'Thia. Ago',
    timeRange: '14:00PM - 22:00PM',
    location: 'Highlands D9/71 Tây Thạnh Tân Phú',
    role: 'Cashier',
  },
  {
    dayIndex: 1, // Thứ 3
    staffName: 'Mew. Ama',
    timeRange: '6:00AM - 14:00PM',
    location: 'Highlands D9/71 Tây Thạnh Tân Phú',
    role: 'Kitchen',
  },
  {
    dayIndex: 2, // Thứ 4
    staffName: 'Paul. Lee (Tôi)',
    timeRange: '6:00AM - 15:00PM',
    location: 'Highlands D9/71 Tây Thạnh Tân Phú',
    role: 'Barista',
  },
  {
    dayIndex: 2, // Thứ 4
    staffName: 'Dilan. Jon',
    timeRange: '14:00PM - 22:00PM',
    location: 'Highlands D9/71 Tây Thạnh Tân Phú',
    role: 'Service',
  },
  {
    dayIndex: 3, // Thứ 5
    staffName: 'Paul. Lee (Tôi)',
    timeRange: '6:00AM - 14:00PM',
    location: 'Highlands D9/71 Tây Thạnh Tân Phú',
    role: 'Barista',
  },
  {
    dayIndex: 4, // Thứ 6
    staffName: 'Paul. Lee (Tôi)',
    timeRange: '14:00PM - 22:00PM',
    location: 'Highlands D9/71 Tây Thạnh Tân Phú',
    role: 'Cashier',
  },
  {
    dayIndex: 5, // Thứ 7
    staffName: 'Vivi.an',
    timeRange: '08:00AM - 17:00PM',
    location: 'Highlands D9/71 Tây Thạnh Tân Phú',
    role: 'Supervisor',
  },
  {
    dayIndex: 6, // Thứ CN
    staffName: 'Paul. Lee (Tôi)',
    timeRange: '14:00PM - 22:00PM',
    location: 'Highlands D9/71 Tây Thạnh Tân Phú',
    role: 'Cashier',
  },
];

export default function ScheduleScreen() {
  const [activeTab, setActiveTab] = useState('my_shifts'); // 'my_shifts' | 'schedule'
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDayIndex, setSelectedDayIndex] = useState(null); // null = xem cả tuần (Ảnh 1), number 0-6 = xem 1 ngày (Ảnh 2)
  const [loading, setLoading] = useState(false);

  const weekDays = getWeekDates(weekOffset);
  const monthTitle = MONTH_NAMES[weekDays[0].dateObj.getMonth()];

  useEffect(() => {
    fetchScheduleData();
  }, [weekOffset]);

  const fetchScheduleData = async () => {
    try {
      setLoading(true);
      // Tải từ Backend API nếu có kết nối
      await getMyShifts().catch(() => null);
    } catch (e) {
      console.log('Using local schedule data:', e.message);
    } finally {
      setLoading(false);
    }
  };

  // Bấm vào 1 ngày trên thanh tuần: nếu đang chọn ngày đó thì hủy chọn (xem cả tuần), nếu chưa thì chọn ngày đó (Ảnh 2)
  const handleSelectDay = (idx) => {
    if (selectedDayIndex === idx) {
      setSelectedDayIndex(null); // Trở về xem cả tuần (Ảnh 1)
    } else {
      setSelectedDayIndex(idx);  // Xem duy nhất ngày được chọn (Ảnh 2)
    }
  };

  const getRoleTheme = (role = '') => {
    return ROLE_THEMES[role] || ROLE_THEMES.Default;
  };

  // Danh sách các ngày cần hiển thị dưới danh sách
  const displayDays = selectedDayIndex !== null
    ? [weekDays[selectedDayIndex]]
    : weekDays;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Tiêu đề Tháng với Điều hướng Tuần/Tháng ─────────── */}
        <View style={styles.monthHeaderRow}>
          <TouchableOpacity
            style={styles.navArrowBtn}
            onPress={() => setWeekOffset(w => w - 1)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.navArrowText}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.monthTitleText}>{monthTitle}</Text>

          <TouchableOpacity
            style={styles.navArrowBtn}
            onPress={() => setWeekOffset(w => w + 1)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.navArrowText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── 2. Bộ chuyển Tab: My shifts | Schedule (Rectangle 576/577) ── */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'my_shifts' ? styles.tabBtnActive : styles.tabBtnInactive
            ]}
            onPress={() => setActiveTab('my_shifts')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'my_shifts' ? styles.tabTextActive : styles.tabTextInactive
              ]}
            >
              My shifts
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'schedule' ? styles.tabBtnActive : styles.tabBtnInactive
            ]}
            onPress={() => setActiveTab('schedule')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'schedule' ? styles.tabTextActive : styles.tabTextInactive
              ]}
            >
              Schedule
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── 3. Thanh 7 Ngày trong tuần (Rectangle 578 - Ảnh 1 & 2) ── */}
        <View style={styles.weekStripCard}>
          {weekDays.map((item, idx) => {
            const isSelected = selectedDayIndex === idx;

            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.dayColumn,
                  isSelected && styles.dayColumnSelected
                ]}
                onPress={() => handleSelectDay(idx)}
                activeOpacity={0.7}
              >
                <Text style={[styles.dayLabelText, isSelected && styles.dayLabelTextSelected]}>
                  {item.shortLabel}
                </Text>
                <Text style={[styles.dayDateText, isSelected && styles.dayDateTextSelected]}>
                  {item.dateStr}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── 4. Danh sách Ca làm việc (Shifts List) ────────────────── */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#51A33D" />
            <Text style={styles.loadingText}>Đang tải lịch làm việc...</Text>
          </View>
        ) : (
          <View style={styles.shiftsListContainer}>
            {displayDays.map((dayItem) => {
              const actualIdx = weekDays.findIndex(w => w.dowIndex === dayItem.dowIndex);

              // Lọc các ca trong ngày này
              const dayShifts = activeTab === 'my_shifts'
                ? DEFAULT_MY_SHIFTS.filter(s => s.dayIndex === actualIdx)
                : DEFAULT_STORE_SHIFTS.filter(s => s.dayIndex === actualIdx);

              // Trường hợp 1: Ngày không có ca làm việc
              if (dayShifts.length === 0) {
                return (
                  <View key={actualIdx} style={styles.emptyDayRow}>
                    <View style={styles.emptyDayDateCol}>
                      <Text style={styles.emptyDayNameText}>{dayItem.fullLabel}</Text>
                      <Text style={styles.emptyDayNumberText}>{dayItem.dateStr}</Text>
                    </View>

                    <View style={styles.emptyDivider} />

                    <View style={styles.emptyMessageCol}>
                      <Text style={styles.emptyMessageText}>
                        {activeTab === 'my_shifts'
                          ? 'Bạn không có lịch làm việc.'
                          : 'Không có ca trực nào trong ngày.'}
                      </Text>
                    </View>
                  </View>
                );
              }

              // Trường hợp 2: Ngày có 1 hoặc nhiều ca làm việc
              return dayShifts.map((shift, sIdx) => {
                const theme = getRoleTheme(shift.role);

                return (
                  <View
                    key={`${actualIdx}-${sIdx}`}
                    style={[styles.shiftCard, { backgroundColor: theme.cardBg }]}
                  >
                    {/* Cột trái: Thứ & Ngày */}
                    <View style={styles.shiftDateCol}>
                      <Text style={styles.shiftDayNameText}>{dayItem.fullLabel}</Text>
                      <Text style={styles.shiftDayNumberText}>{dayItem.dateStr}</Text>
                    </View>

                    {/* Vạch màu dọc đại diện cho loại ca / vị trí */}
                    <View style={[styles.shiftVerticalBar, { backgroundColor: theme.color }]} />

                    {/* Cột phải: Thông tin ca trực */}
                    <View style={styles.shiftInfoCol}>
                      {/* Tên nhân viên (khi ở tab Schedule) */}
                      {shift.staffName && (
                        <Text style={styles.shiftStaffName}>{shift.staffName}</Text>
                      )}

                      {/* Khung giờ làm việc */}
                      <Text style={styles.shiftTimeRange}>{shift.timeRange}</Text>

                      {/* Địa điểm quán */}
                      <Text style={styles.shiftLocation} numberOfLines={1}>
                        {shift.location}
                      </Text>

                      {/* Chấm tròn & Tên vị trí (Role / Vị trí phân ca) */}
                      <View style={styles.shiftRoleRow}>
                        <View style={[styles.roleDot, { backgroundColor: theme.dotColor }]} />
                        <Text style={styles.roleText}>{shift.role}</Text>
                      </View>
                    </View>
                  </View>
                );
              });
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── StyleSheet bám sát Pixel-Perfect Figma (Lịch.docx) ───────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  page: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  contentContainer: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 40,
  },

  // ── Month Header ──
  monthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
    height: 36,
  },
  monthTitleText: {
    fontFamily: 'System',
    fontSize: 22,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.2,
  },
  navArrowBtn: {
    position: 'absolute',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  navArrowText: {
    fontSize: 26,
    color: '#666666',
    fontWeight: '400',
    marginTop: -2,
  },

  // ── Top Segmented Switcher (Rectangle 576/577) ──
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F2F0F0',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(240, 236, 236, 0.9)',
    padding: 3,
    height: 48,
    marginBottom: 18,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 360,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  tabBtnActive: {
    backgroundColor: '#ECF9E8', // Nền xanh nhạt chuẩn Figma Rectangle 577
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabBtnInactive: {
    backgroundColor: 'transparent',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  tabTextActive: {
    color: '#222222',
  },
  tabTextInactive: {
    color: '#666666',
  },

  // ── Week Strip Card (Rectangle 578) ──
  weekStripCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(240, 236, 236, 0.8)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    marginHorizontal: 1,
  },
  dayColumnSelected: {
    backgroundColor: '#ECF9E8', // Highlight xanh khi chọn 1 ngày (Ảnh 2)
  },
  dayLabelText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: 'rgba(51, 51, 51, 0.7)',
    marginBottom: 3,
  },
  dayLabelTextSelected: {
    color: '#1E1E1E',
    fontWeight: '700',
  },
  dayDateText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#333333',
  },
  dayDateTextSelected: {
    color: '#1E1E1E',
    fontWeight: '700',
  },

  // ── Shifts List Container ──
  shiftsListContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },

  // ── Empty Day Row (Không có lịch làm việc) ──
  emptyDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(240, 236, 236, 0.7)',
  },
  emptyDayDateCol: {
    width: 60,
    alignItems: 'flex-start',
  },
  emptyDayNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333333',
  },
  emptyDayNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginTop: 2,
  },
  emptyDivider: {
    width: 1.5,
    height: 24,
    backgroundColor: 'rgba(200, 200, 200, 0.6)',
    marginHorizontal: 12,
  },
  emptyMessageCol: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyMessageText: {
    fontSize: 14,
    color: '#888888',
    fontWeight: '400',
  },

  // ── Assigned Shift Card ──
  shiftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  shiftDateCol: {
    width: 54,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  shiftDayNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333333',
  },
  shiftDayNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginTop: 2,
  },
  shiftVerticalBar: {
    width: 2.5,
    height: 38,
    borderRadius: 2,
    marginRight: 12,
    marginLeft: 4,
  },
  shiftInfoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  shiftStaffName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 2,
  },
  shiftTimeRange: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#222222',
    letterSpacing: -0.2,
  },
  shiftLocation: {
    fontSize: 12,
    color: '#666666',
    marginTop: 3,
    marginBottom: 4,
  },
  shiftRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roleDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7A8B88',
  },

  // ── Loading state ──
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: '#888888',
  },
});
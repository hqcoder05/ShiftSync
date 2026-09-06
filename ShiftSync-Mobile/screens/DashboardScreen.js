import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import avatar from '../assets/avatar-dilan-jon.png';
import availabilityIcon from '../assets/dangky.png';
import payrollIcon from '../assets/luong.png';
import requestIcon from '../assets/yeucau.png';
import scheduleIcon from '../assets/lichlam.png';
import BottomNavbar from '../components/BottomNavbar';
import { getMyShifts } from '../services/shiftService';
import { getMyPayslips } from '../services/payrollService';
import { getMyAttendance } from '../services/attendanceService';

const actions = [
  ['Đăng ký lịch làm', availabilityIcon, '#EAF8E6', 'Availability'],
  ['Phiếu lương', payrollIcon, '#FFF6DE', 'Payroll'],
  ['Yêu cầu', requestIcon, '#E7F7FA', 'Request'],
  ['Lịch làm', scheduleIcon, '#F7E8F0', 'Schedule'],
];

const nav = (navigation, destination) => {
  if (destination === 'Availability') {
    navigation.getParent?.()?.navigate('Availability') || navigation.navigate('Availability');
  } else if (destination === 'Profile') {
    navigation.getParent?.()?.navigate('Profile') || navigation.navigate('Profile');
  } else {
    navigation.navigate(destination);
  }
};

const localDateISO = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 10);
};

const getVietnameseDateString = (date = new Date()) => {
  const dayOfWeek = date.getDay();
  const weekdayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const weekdayStr = weekdayNames[dayOfWeek];
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${weekdayStr}, ${dd}-${mm}-${yyyy}`;
};

const formatTimeWithPeriod = (timeStr) => {
  if (!timeStr) return { time: '6:00', period: 'AM' };
  const parts = String(timeStr).split(':');
  let h = parseInt(parts[0], 10);
  const m = parts[1] || '00';
  const period = h < 12 ? 'AM' : 'PM';
  return { time: `${h}:${m}`, period };
};

function ShiftRow({ item }) {
  return (
    <View style={s.shiftRow}>
      <View style={s.shiftTime}>
        <Text style={s.time}>{item[0]}<Text style={s.amPm}>AM</Text></Text>
        <View style={s.timeDash} />
        <Text style={s.time}>{item[1]}<Text style={s.amPm}>PM</Text></Text>
      </View>
      <View style={s.shiftInfo}>
        <Text style={s.shiftDate}>{item[2]}</Text>
        <Text style={s.address}>Highlands D9/71 Tây Thạnh Tân Phú</Text>
        <View style={s.roleRow}>
          <View style={s.dot} />
          <Text style={s.role}>Barista</Text>
        </View>
      </View>
    </View>
  );
}

export default function DashboardScreen({ navigation }) {
  const [assignedShifts, setAssignedShifts] = useState([]);
  const [latestPayslip, setLatestPayslip] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);

  const todayText = getVietnameseDateString(new Date());

  const loadData = () => {
    const todayIso = localDateISO();
    getMyShifts().then((res) => setAssignedShifts(res.data || [])).catch(() => setAssignedShifts([]));
    getMyPayslips().then((res) => setLatestPayslip(res.data?.[0] || null)).catch(() => setLatestPayslip(null));
    getMyAttendance().then((res) => {
      const records = res.data || [];
      const found = records.find((a) => a.shiftDate === todayIso);
      setTodayAttendance(found || null);
    }).catch(() => setTodayAttendance(null));
  };

  useEffect(() => {
    loadData();
    const unsubscribe = navigation.addListener('focus', loadData);
    const interval = setInterval(loadData, 10000); // Tự động cập nhật khi quản lý sửa lịch trên Web
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [navigation]);

  const todayIso = localDateISO();
  const realShifts = useMemo(
    () =>
      assignedShifts
        .filter((shift) => shift.shiftDate >= todayIso && shift.status !== 'CANCELLED')
        .sort((a, b) => `${a.shiftDate}${a.startTime}`.localeCompare(`${b.shiftDate}${b.startTime}`)),
    [assignedShifts, todayIso]
  );

  const todayShift = assignedShifts.find(
    (shift) => shift.shiftDate === todayIso && shift.status !== 'CANCELLED'
  );

  const displayShifts = realShifts.slice(0, 3).map((shift) => [
    String(shift.startTime).slice(0, 5),
    String(shift.endTime).slice(0, 5),
    new Intl.DateTimeFormat('vi-VN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(`${shift.shiftDate}T00:00:00`)),
  ]);

  const isCheckedIn = !!(todayAttendance && todayAttendance.checkInTime);
  const isCheckedOut = !!(todayAttendance && todayAttendance.checkOutTime);

  const checkButtonText = isCheckedOut ? 'Đã hoàn thành' : isCheckedIn ? 'Check Out' : 'Check In';

  const startTimeObj = todayShift ? formatTimeWithPeriod(todayShift.startTime) : { time: '6:00', period: 'AM' };
  const endTimeObj = todayShift ? formatTimeWithPeriod(todayShift.endTime) : { time: '14:00', period: 'PM' };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* ═══ HERO SECTION ═══ */}
        <View style={s.hero}>
          <Pressable
            onPress={() => nav(navigation, 'Profile')}
            hitSlop={12}
            style={({ pressed }) => [pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] }]}
            accessibilityRole="button"
            accessibilityLabel="Mở hồ sơ cá nhân"
          >
            <Image source={avatar} style={s.avatar} />
          </Pressable>
          <Text style={s.today}>{todayText}</Text>
          <Text style={s.greeting}>Chào buổi sáng,{'\n'}Dilan. Jon .</Text>
          <Text style={s.headline}>
            {todayShift ? 'Hôm nay,\nbạn có một ca làm.' : 'Hôm nay,\nbạn chưa có ca làm.'}
          </Text>

          {/* ═══ THẺ CA LÀM VIỆC CHECK IN CHUẨN GIAO DIỆN MẪU ═══ */}
          {todayShift && (
            <Pressable
              onPress={() => nav(navigation, 'Attendance')}
              style={s.todayCard}
            >
              <View style={s.cardHeaderRow}>
                <Text style={s.hours}>
                  {startTimeObj.time}
                  <Text style={s.amPm}>{startTimeObj.period}</Text>
                  {' - '}
                  {endTimeObj.time}
                  <Text style={s.amPm}>{endTimeObj.period}</Text>
                </Text>
              </View>

              <View style={s.divider} />

              <View style={s.roleRow}>
                <View style={s.dot} />
                <Text style={s.role}>
                  {todayShift.skillName || todayShift.requiredSkillName || 'Barista'}
                </Text>
              </View>

              <Text style={s.todayAddress}>
                {todayShift.storeAddress || todayShift.storeName || 'Highlands D9/71 Tây Thạnh Tân Phú'}
              </Text>

              <View style={s.checkIn}>
                <Text style={s.checkInText}>
                  {isCheckedOut ? 'Xem lịch sử chấm công' : isCheckedIn ? 'Check Out' : 'Check In'}
                </Text>
              </View>
            </Pressable>
          )}
        </View>

        {/* ═══ ACTION GRID ═══ */}
        <View style={s.actionGrid}>
          {actions.map(([label, icon, color, screen]) => (
            <Pressable
              key={label}
              onPress={() => nav(navigation, screen)}
              style={[s.action, { backgroundColor: color }]}
            >
              <Image source={icon} style={s.actionIcon} />
              <Text style={s.actionText}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {/* ═══ UPCOMING SHIFTS ═══ */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Ca làm việc sắp tới của bạn</Text>
          <Pressable onPress={() => nav(navigation, 'Schedule')}>
            <Text style={s.link}>xem tất cả</Text>
          </Pressable>
        </View>

        <View style={s.shiftList}>
          {displayShifts.length ? (
            displayShifts.map((item, i) => <ShiftRow key={i} item={item} />)
          ) : (
            <Text style={s.empty}>Chưa có ca làm việc sắp tới.</Text>
          )}
        </View>

        {/* ═══ INCOME REPORT ═══ */}
        <View style={s.income}>
          <View style={s.incomeTop}>
            <Text style={s.range}>
              {latestPayslip
                ? `${latestPayslip.periodStartDate} – ${latestPayslip.periodEndDate}`
                : 'Chưa có kỳ lương'}
            </Text>
            <Pressable onPress={() => nav(navigation, 'Payroll')}>
              <Text style={s.link}>xem tất cả</Text>
            </Pressable>
          </View>
          <Text style={s.incomeTitle}>Báo cáo thu nhập{'\n'}của bạn</Text>
          <Text style={s.label}>Lương thực nhận</Text>
          <Text style={s.amount}>
            {latestPayslip ? `${Number(latestPayslip.totalAmount).toLocaleString('vi-VN')} VNĐ` : '—'}
          </Text>
          <Text style={s.label}>Giờ đã làm việc</Text>
          <Text style={s.stat}>
            {latestPayslip?.totalHours || 0} <Text style={s.statEnd}>giờ</Text>
          </Text>
          <Text style={s.label}>Tăng ca</Text>
          <Text style={s.stat}>
            {latestPayslip?.otHours || 0} <Text style={s.statEnd}>giờ</Text>
          </Text>
          <Image source={payrollIcon} style={s.incomeArt} />
        </View>
      </ScrollView>

      <BottomNavbar navigation={navigation} activeRoute="Dashboard" />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  content: { paddingBottom: 105 },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 22,
    backgroundColor: '#EAF8E6',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1.5,
    borderColor: '#1E1E1E',
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  today: { fontSize: 16, color: '#4E574F', marginBottom: 14, fontWeight: '500' },
  greeting: { fontSize: 20, lineHeight: 25, color: '#273426', fontWeight: '700', marginBottom: 22 },
  headline: { fontSize: 24, lineHeight: 28, fontWeight: '800', color: '#273426', marginBottom: 22 },
  todayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  hours: {
    fontSize: 22,
    fontWeight: '800',
    color: '#273426',
  },
  amPm: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475346',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEF3EC',
    marginBottom: 12,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#7CD8CE',
    marginRight: 8,
  },
  role: {
    fontSize: 14,
    fontWeight: '700',
    color: '#273426',
  },
  todayAddress: {
    fontSize: 11,
    color: '#6F786E',
    marginTop: 2,
    marginBottom: 14,
  },
  checkIn: {
    alignSelf: 'flex-start',
    backgroundColor: '#EAF8E6',
    paddingVertical: 10,
    paddingHorizontal: 26,
    borderRadius: 12,
  },
  checkInText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#273426',
  },
  actionGrid: { padding: 11, paddingTop: 30, gap: 13, flexDirection: 'row', flexWrap: 'wrap' },
  action: {
    width: '48%',
    height: 65,
    borderRadius: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  actionIcon: { width: 37, height: 37, resizeMode: 'contain' },
  actionText: { fontSize: 14, color: '#3F4144', fontWeight: '500', flexShrink: 1 },
  sectionHeader: {
    marginHorizontal: 25,
    marginTop: 19,
    paddingTop: 25,
    borderTopWidth: 1,
    borderTopColor: '#E9E7E4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#383A3C' },
  link: { fontSize: 13, fontWeight: '600', color: '#46A83A' },
  shiftList: { marginHorizontal: 25, marginTop: 14 },
  empty: { paddingVertical: 24, color: '#7B8490', fontSize: 14 },
  shiftRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E9E7E4',
  },
  shiftTime: {
    width: 91,
    borderRightWidth: 1,
    borderRightColor: '#E8E5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  time: { fontSize: 19, lineHeight: 22, fontWeight: '600', color: '#46A83A' },
  timeDash: { width: 14, height: 1, marginVertical: 4, backgroundColor: '#46A83A' },
  shiftInfo: { flex: 1, paddingLeft: 17, justifyContent: 'center' },
  shiftDate: { fontSize: 14, fontWeight: '500', color: '#383A3C' },
  address: { fontSize: 11, color: '#62676A', marginTop: 5 },
  income: {
    position: 'relative',
    overflow: 'hidden',
    margin: 16,
    marginTop: 24,
    padding: 24,
    minHeight: 350,
    borderRadius: 10,
    backgroundColor: '#EAF8E6',
  },
  incomeTop: { flexDirection: 'row', justifyContent: 'space-between' },
  range: { fontSize: 14, fontWeight: '500', color: '#404345' },
  incomeTitle: { fontSize: 25, lineHeight: 29, fontWeight: '700', color: '#131516', marginTop: 17 },
  label: { fontSize: 16, color: '#45494A', marginTop: 19 },
  amount: { fontSize: 31, color: '#46A83A', marginTop: 7 },
  stat: { fontSize: 24, color: '#46A83A', marginTop: 3 },
  statEnd: { fontSize: 15, color: '#45494A' },
  incomeArt: { position: 'absolute', width: 145, height: 145, right: 9, bottom: 9, resizeMode: 'contain' },
});

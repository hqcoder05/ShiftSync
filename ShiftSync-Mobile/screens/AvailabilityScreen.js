import { useState, useEffect } from 'react';
import {
  View, Text, Switch, ScrollView, TouchableOpacity,
  StyleSheet, Alert, SafeAreaView,
} from 'react-native';
import { getMyAvailability, createAvailability } from '../services/availabilityService';
import ScrollTimePicker from '../components/ScrollTimePicker';
import BottomNavbar from '../components/BottomNavbar';

const days = [
  { label: 'Thứ 2', value: 1 },
  { label: 'Thứ 3', value: 2 },
  { label: 'Thứ 4', value: 3 },
  { label: 'Thứ 5', value: 4 },
  { label: 'Thứ 6', value: 5 },
  { label: 'Thứ 7', value: 6 },
  { label: 'Chủ nhật', value: 0 },
];

const MONTH_NAMES = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

// Nhận thêm weekOffset: 0 = tuần hiện tại, 1 = tuần sau, -1 = tuần trước...
function getWeekDates(weekOffset = 0) {
  const today = new Date();
  const monday = new Date(today);
  const dow = today.getDay();
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  monday.setDate(today.getDate() + diffToMonday + weekOffset * 7);
  return days.map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export default function AvailabilityScreen({ navigation }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const weekDatesObjs = getWeekDates(weekOffset);
  const weekDates = weekDatesObjs.map(d => d.getDate().toString().padStart(2, '0'));

  // Tiêu đề tháng: lấy theo tháng của Thứ 2 đầu tuần đang xem
  const mondayMonth = weekDatesObjs[0].getMonth();
  const monthTitle = MONTH_NAMES[mondayMonth];

  const [selectedDay, setSelectedDay] = useState(1);
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState({ hour: '06', minute: '00' });
  const [endTime, setEndTime] = useState({ hour: '14', minute: '00' });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [availabilities, setAvailabilities] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAvailability();
  }, []);

  const loadAvailability = async () => {
    try {
      const res = await getMyAvailability();
      setAvailabilities(res.data || []);
    } catch (err) {
      console.log('Error loading availability:', err);
    }
  };

  const hasDataForDay = (dayVal) => {
    return availabilities.some(a => a.dayOfWeek === dayVal);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const finalStart = allDay ? '00:00:00' : `${startTime.hour}:${startTime.minute}:00`;
      const finalEnd = allDay ? '23:59:59' : `${endTime.hour}:${endTime.minute}:00`;

      await createAvailability(selectedDay, finalStart, finalEnd);
      Alert.alert(
        'Đăng ký thành công! 🎉',
        'Khung giờ rảnh của bạn đã được gửi đến Quản lý. Khi Quản lý duyệt và phân công ca, ca làm việc sẽ hiển thị ngay trên ứng dụng của bạn.',
        [
          { text: 'Đăng ký tiếp', onPress: () => {} },
          { text: 'Xem lịch ca', onPress: () => navigation.navigate('Schedule') },
        ]
      );
      loadAvailability();
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message
        || (status === 401 || status === 403 ? 'Chưa đăng nhập hoặc phiên đăng nhập hết hạn' : 'Đăng ký thất bại');
      Alert.alert('Lỗi', msg);
      console.log('Chi tiết lỗi:', status, err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView style={styles.page} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Đăng ký lịch rảnh</Text>
          <View style={{ width: 32 }} />
        </View>

        <View style={styles.monthNavRow}>
          <TouchableOpacity onPress={() => setWeekOffset(w => w - 1)} style={styles.navArrow}>
            <Text style={styles.navArrowText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{monthTitle}</Text>
          <TouchableOpacity onPress={() => setWeekOffset(w => w + 1)} style={styles.navArrow}>
            <Text style={styles.navArrowText}>›</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.myShiftsBtn}
          onPress={() => navigation.navigate('Schedule')}
          activeOpacity={0.8}
        >
          <Text style={styles.myShiftsText}>Xem lịch ca làm việc</Text>
        </TouchableOpacity>

        <View style={styles.dayRow}>
          {days.map((d, i) => {
            const active = selectedDay === d.value;
            return (
              <TouchableOpacity
                key={d.value}
                style={[styles.dayCell, active && styles.dayCellActive]}
                onPress={() => setSelectedDay(d.value)}
              >
                <Text style={styles.dayLabel}>{d.label.replace('Thứ ', 'T')}</Text>
                <Text style={styles.dayNumber}>{weekDates[i]}</Text>
                {hasDataForDay(d.value) && <View style={styles.dot} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Cả ngày</Text>
          <Switch
            value={allDay}
            onValueChange={setAllDay}
            trackColor={{ false: '#ddd', true: '#51A33D' }}
            thumbColor="#fff"
          />
        </View>

        {!allDay && (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Thời gian bắt đầu:</Text>
              <TouchableOpacity
                style={styles.timePill}
                onPress={() => setShowStartPicker(!showStartPicker)}
              >
                <Text style={styles.timePillText}>{`${startTime.hour}:${startTime.minute}`}</Text>
              </TouchableOpacity>
            </View>
            {showStartPicker && (
              <ScrollTimePicker
                value={`${startTime.hour}:${startTime.minute}`}
                onChange={(t) => {
                  const [h, m] = t.split(':');
                  setStartTime({ hour: h, minute: m });
                }}
                onDone={() => setShowStartPicker(false)}
              />
            )}

            <View style={styles.row}>
              <Text style={styles.label}>Thời gian kết thúc:</Text>
              <TouchableOpacity
                style={styles.timePill}
                onPress={() => setShowEndPicker(!showEndPicker)}
              >
                <Text style={styles.timePillText}>{`${endTime.hour}:${endTime.minute}`}</Text>
              </TouchableOpacity>
            </View>
            {showEndPicker && (
              <ScrollTimePicker
                value={`${endTime.hour}:${endTime.minute}`}
                onChange={(t) => {
                  const [h, m] = t.split(':');
                  setEndTime({ hour: h, minute: m });
                }}
                onDone={() => setShowEndPicker(false)}
              />
            )}
          </>
        )}

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
          <Text style={styles.submitText}>{loading ? 'Đang lưu...' : 'Đăng ký'}</Text>
        </TouchableOpacity>
        <View style={{ height: 90 }} />
      </ScrollView>
      <BottomNavbar navigation={navigation} activeRoute="Availability" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 60 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginBottom: 8,
  },
  backBtn: { padding: 4 },
  backArrow: { fontSize: 24, fontWeight: '700', color: '#333' },
  screenTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginTop: 8, 
    marginBottom: 12,
  },
  navArrow: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#ECF9E8',
  },
  navArrowText: { fontSize: 18, fontWeight: '700', color: '#333', marginTop: -2 },
  monthTitle: { fontSize: 22, fontWeight: '600', textAlign: 'center' },
  myShiftsBtn: {
    backgroundColor: '#ECF9E8',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  myShiftsText: { fontSize: 16, fontWeight: '600', color: '#333' },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: 'rgba(240,236,236,0.7)',
    borderRadius: 10,
    padding: 8,
    marginBottom: 24,
  },
  dayCell: { alignItems: 'center', padding: 6, borderRadius: 8 },
  dayCellActive: { backgroundColor: '#ECF9E8' },
  dayLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(51,51,51,0.7)' },
  dayNumber: { fontSize: 12, fontWeight: '600', color: 'rgba(51,51,51,0.7)', marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#51A33D', marginTop: 3 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  label: { fontSize: 16, fontWeight: '500', color: '#333' },
  timePill: {
    backgroundColor: '#EEFAEB',
    borderWidth: 1,
    borderColor: '#D9D9D9',
    borderRadius: 7,
    paddingVertical: 8,
    paddingHorizontal: 16,
    minWidth: 90,
    alignItems: 'center',
  },
  timePillText: { fontSize: 15, color: '#333', fontWeight: '500' },
  submitBtn: {
    backgroundColor: '#ECF9E8',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 30,
  },
  submitText: { fontSize: 18, fontWeight: '600', color: '#333' },
});
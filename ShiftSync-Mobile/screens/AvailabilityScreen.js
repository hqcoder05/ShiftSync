import { useState, useEffect } from 'react';
import {
  View, Text, Switch, ScrollView, TouchableOpacity,
  StyleSheet, Alert, SafeAreaView,
} from 'react-native';
import {
  getMyAvailability,
  createAvailability,
  updateAvailability,
  deleteAvailability,
} from '../services/availabilityService';
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
  const [editingSlot, setEditingSlot] = useState(null);

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

  const handleSelectDay = (dayVal) => {
    setSelectedDay(dayVal);
    // When switching days, if we were editing a slot from another day, cancel edit
    if (editingSlot && editingSlot.dayOfWeek !== dayVal) {
      handleCancelEdit();
    }
  };

  const handleStartEdit = (slot) => {
    setEditingSlot(slot);
    const is24h = (slot.startTime === '00:00:00' || !slot.startTime) &&
                  (slot.endTime === '23:59:59' || slot.endTime === '23:59:00');
    setAllDay(is24h);
    if (!is24h && slot.startTime && slot.endTime) {
      const [sh, sm] = String(slot.startTime).slice(0, 5).split(':');
      const [eh, em] = String(slot.endTime).slice(0, 5).split(':');
      setStartTime({ hour: sh || '06', minute: sm || '00' });
      setEndTime({ hour: eh || '14', minute: em || '00' });
    }
  };

  const handleCancelEdit = () => {
    setEditingSlot(null);
    setAllDay(true);
    setStartTime({ hour: '06', minute: '00' });
    setEndTime({ hour: '14', minute: '00' });
  };

  const handleDeleteSlot = (slot) => {
    Alert.alert(
      'Xác nhận xóa',
      'Bạn có chắc muốn xóa khung giờ rảnh này không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await deleteAvailability(slot.id);
              if (editingSlot?.id === slot.id) {
                handleCancelEdit();
              }
              Alert.alert('Thành công', 'Đã xóa lịch rảnh thành công.');
              loadAvailability();
            } catch (err) {
              Alert.alert('Lỗi', err.response?.data?.message || 'Không thể xóa lịch rảnh.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const finalStart = allDay ? '00:00:00' : `${startTime.hour}:${startTime.minute}:00`;
      const finalEnd = allDay ? '23:59:59' : `${endTime.hour}:${endTime.minute}:00`;

      if (editingSlot) {
        await updateAvailability(editingSlot.id, selectedDay, finalStart, finalEnd);
        Alert.alert('Thành công! 🎉', 'Đã cập nhật khung giờ rảnh. Lịch trên web cũng đã được đồng bộ!');
        handleCancelEdit();
      } else {
        await createAvailability(selectedDay, finalStart, finalEnd);
        Alert.alert(
          'Đăng ký thành công! 🎉',
          'Khung giờ rảnh của bạn đã được gửi đến Quản lý. Khi Quản lý duyệt và phân công ca, ca làm việc sẽ hiển thị ngay trên ứng dụng của bạn.',
          [
            { text: 'Đăng ký tiếp', onPress: () => {} },
            { text: 'Xem lịch ca', onPress: () => navigation.navigate('Schedule') },
          ]
        );
      }
      loadAvailability();
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message
        || (status === 401 || status === 403 ? 'Chưa đăng nhập hoặc phiên đăng nhập hết hạn' : 'Thao tác thất bại');
      Alert.alert('Lỗi', msg);
      console.log('Chi tiết lỗi:', status, err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const selectedDayObj = days.find(d => d.value === selectedDay);
  const daySlots = availabilities.filter(a => a.dayOfWeek === selectedDay);

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

        {/* 7 ngày trong tuần */}
        <View style={styles.dayRow}>
          {days.map((d, i) => {
            const active = selectedDay === d.value;
            return (
              <TouchableOpacity
                key={d.value}
                style={[styles.dayCell, active && styles.dayCellActive]}
                onPress={() => handleSelectDay(d.value)}
              >
                <Text style={[styles.dayLabel, active && styles.dayLabelActive]}>
                  {d.label.replace('Thứ ', 'T')}
                </Text>
                <Text style={[styles.dayNumber, active && styles.dayNumberActive]}>
                  {weekDates[i]}
                </Text>
                {hasDataForDay(d.value) && <View style={styles.dot} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Danh sách lịch rảnh đã đăng ký của ngày được chọn */}
        <View style={styles.registeredSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Lịch đã đăng ký: {selectedDayObj?.label}
            </Text>
            {daySlots.length > 0 && (
              <View style={styles.badgeCount}>
                <Text style={styles.badgeCountText}>{daySlots.length} khung giờ</Text>
              </View>
            )}
          </View>

          {daySlots.length === 0 ? (
            <View style={styles.emptySlotBox}>
              <Text style={styles.emptySlotText}>Chưa đăng ký lịch rảnh cho {selectedDayObj?.label}.</Text>
              <Text style={styles.emptySlotSubText}>Chọn khung giờ bên dưới để đăng ký.</Text>
            </View>
          ) : (
            <View style={styles.slotList}>
              {daySlots.map((slot) => {
                const isEditingThis = editingSlot?.id === slot.id;
                const is24h = (slot.startTime === '00:00:00' || !slot.startTime) &&
                              (slot.endTime === '23:59:59' || slot.endTime === '23:59:00');
                const timeDisplay = is24h
                  ? 'Cả ngày (00:00 - 23:59)'
                  : `${String(slot.startTime).slice(0, 5)} - ${String(slot.endTime).slice(0, 5)}`;

                return (
                  <View key={slot.id} style={[styles.slotCard, isEditingThis && styles.slotCardEditing]}>
                    <View style={styles.slotInfo}>
                      <View style={[styles.slotDot, isEditingThis && styles.slotDotEditing]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.slotTimeText}>{timeDisplay}</Text>
                        <Text style={styles.slotStatusText}>
                          {isEditingThis ? 'Đang chỉnh sửa khung giờ này' : 'Khả dụng để xếp ca'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.slotActions}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.editBtn]}
                        onPress={() => handleStartEdit(slot)}
                      >
                        <Text style={styles.editBtnText}>Sửa</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.deleteBtn]}
                        onPress={() => handleDeleteSlot(slot)}
                      >
                        <Text style={styles.deleteBtnText}>Xóa</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Khung Form Đăng ký / Chỉnh sửa */}
        <View style={[styles.formContainer, editingSlot && styles.formContainerEditing]}>
          <View style={styles.formHeaderRow}>
            <Text style={styles.formSectionTitle}>
              {editingSlot ? `✏️ Chỉnh sửa lịch rảnh (${selectedDayObj?.label})` : `➕ Thêm lịch rảnh (${selectedDayObj?.label})`}
            </Text>
            {editingSlot && (
              <TouchableOpacity onPress={handleCancelEdit} style={styles.cancelEditBtn}>
                <Text style={styles.cancelEditBtnText}>Hủy sửa</Text>
              </TouchableOpacity>
            )}
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

          <TouchableOpacity
            style={[styles.submitBtn, editingSlot && styles.submitBtnEditing]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitText}>
              {loading
                ? 'Đang lưu...'
                : editingSlot
                ? 'Lưu thay đổi lịch rảnh'
                : 'Đăng ký lịch rảnh'}
            </Text>
          </TouchableOpacity>
        </View>

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
    marginBottom: 18,
  },
  myShiftsText: { fontSize: 15, fontWeight: '600', color: '#2E7D32' },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: 'rgba(240,236,236,0.7)',
    borderRadius: 12,
    padding: 8,
    marginBottom: 20,
  },
  dayCell: { alignItems: 'center', padding: 6, borderRadius: 8, flex: 1 },
  dayCellActive: { backgroundColor: '#ECF9E8' },
  dayLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(51,51,51,0.7)' },
  dayLabelActive: { color: '#2E7D32', fontWeight: '700' },
  dayNumber: { fontSize: 12, fontWeight: '600', color: 'rgba(51,51,51,0.7)', marginTop: 2 },
  dayNumberActive: { color: '#2E7D32', fontWeight: '700' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#51A33D', marginTop: 3 },

  /* Registered Section */
  registeredSection: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#333' },
  badgeCount: {
    backgroundColor: '#ECF9E8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeCountText: { fontSize: 12, fontWeight: '600', color: '#2E7D32' },
  emptySlotBox: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptySlotText: { fontSize: 13, color: '#777', fontStyle: 'italic' },
  emptySlotSubText: { fontSize: 12, color: '#999', marginTop: 3 },
  slotList: {
    gap: 8,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  slotCardEditing: {
    borderColor: '#51A33D',
    backgroundColor: '#F7FCF5',
    borderWidth: 1.5,
  },
  slotInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  slotDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#51A33D',
  },
  slotDotEditing: {
    backgroundColor: '#D97706',
  },
  slotTimeText: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  slotStatusText: { fontSize: 11, color: '#64748B', marginTop: 2 },
  slotActions: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 8,
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  editBtn: {
    backgroundColor: '#ECF9E8',
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
  },
  deleteBtn: {
    backgroundColor: '#FEE2E2',
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },

  /* Form Container */
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    padding: 16,
  },
  formContainerEditing: {
    borderColor: '#51A33D',
    borderWidth: 1.5,
  },
  formHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  formSectionTitle: { fontSize: 15, fontWeight: '700', color: '#333' },
  cancelEditBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
  },
  cancelEditBtnText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: { fontSize: 15, fontWeight: '500', color: '#333' },
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
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  submitBtnEditing: {
    backgroundColor: '#51A33D',
  },
  submitText: { fontSize: 16, fontWeight: '700', color: '#2E7D32' },
});
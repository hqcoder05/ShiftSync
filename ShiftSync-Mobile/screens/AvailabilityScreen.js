import { colors as uiColors } from '../theme/koreanPalette';
import { createAppStyles } from '../theme/appTheme';
import ThreeIllustration from '../components/ThreeIllustration';
import { ensureTouchTarget } from '../utils/touchTarget';
import BackIcon from '../components/BackIcon';
import { useState, useEffect, useRef } from 'react';
import {
  View, Text, Switch, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Alert, SafeAreaView,
} from 'react-native';
import { showAlert } from '../utils/alert';
import useActionGuard from '../utils/useActionGuard';
import {
  getMyWeeklyAvailability,
  saveMyWeeklyAvailability,
} from '../services/availabilityService';
import ScrollTimePicker from '../components/ScrollTimePicker';
import BottomNavbar, { useBottomNavbarPadding } from '../components/BottomNavbar';
import {
  AVAILABILITY_TIME_ZONE,
  getAvailabilityEditStatus,
  getAvailabilityWeekDates,
  getAvailabilityWeekStart,
  shiftAvailabilityWeek,
} from '../utils/availabilityDeadline';

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

const formatCalendarDate = (date) => `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;

export default function AvailabilityScreen({ navigation }) {
  const bottomNavbarPadding = useBottomNavbarPadding();
  const { runAction, busy } = useActionGuard();
  const [viewedWeekStart, setViewedWeekStart] = useState(() => getAvailabilityWeekStart(new Date(), 1));
  const [clockNow, setClockNow] = useState(() => new Date());
  const weekDatesObjs = getAvailabilityWeekDates(viewedWeekStart);
  const weekDates = weekDatesObjs.map(d => d.getDate().toString().padStart(2, '0'));
  const deadline = getAvailabilityEditStatus(viewedWeekStart, clockNow);
  const isReadOnly = !deadline.editable;
  const deadlineDateLabel = new Intl.DateTimeFormat('vi-VN', {
    timeZone: AVAILABILITY_TIME_ZONE, day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(deadline.deadlineAt);
  const weekRangeLabel = `${formatCalendarDate(weekDatesObjs[0])} – ${formatCalendarDate(weekDatesObjs[6])}`;

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
  const [dataLoading, setDataLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [snapshot, setSnapshot] = useState(null);
  const loadSequence = useRef(0);
  const actionBusy = loading || dataLoading || !!busy.availability;
  const [editingSlot, setEditingSlot] = useState(null);

  useEffect(() => {
    loadAvailability();
    const timer = setInterval(() => setClockNow(new Date()), 1000);
    const unsubscribe = navigation.addListener?.('focus', () => {
      setClockNow(new Date());
      loadAvailability();
    });
    return () => { clearInterval(timer); unsubscribe?.(); loadSequence.current += 1; };
  }, [navigation, viewedWeekStart]);

  useEffect(() => {
    if (isReadOnly) {
      setEditingSlot(null);
      setShowStartPicker(false);
      setShowEndPicker(false);
    }
  }, [isReadOnly]);

  const loadAvailability = async () => {
    const sequence = ++loadSequence.current;
    setDataLoading(true);
    setLoadError('');
    setSnapshot(null);
    setAvailabilities([]);
    try {
      const res = await getMyWeeklyAvailability(viewedWeekStart);
      if (sequence !== loadSequence.current) return;
      setSnapshot(res.data);
      setAvailabilities(res.data?.slots || []);
    } catch (err) {
      if (sequence !== loadSequence.current) return;
      setLoadError(err.response?.data?.message || 'Không thể tải lịch rảnh của tuần này. Vui lòng thử lại.');
    } finally {
      if (sequence === loadSequence.current) setDataLoading(false);
    }
  };

  const saveSlots = async (slots) => {
    if (!snapshot || snapshot.weekStart !== viewedWeekStart) throw new Error('Vui lòng tải lại lịch rảnh trước khi lưu.');
    const res = await saveMyWeeklyAvailability(viewedWeekStart, snapshot.revision, slots);
    setSnapshot(res.data);
    setAvailabilities(res.data?.slots || []);
  };

  const registerTemplate = () => runAction('availability', async () => {
    if (!ensureWeekEditable()) return;
    try {
      setLoading(true);
      await saveSlots(availabilities);
      showAlert('Đã đăng ký', 'Các khung giờ đã được lưu riêng cho tuần đang xem.');
    } catch (err) {
      showAlert('Không thể lưu', err.response?.data?.message || err.message || 'Vui lòng thử lại.');
      if (err.response?.status === 409) loadAvailability();
    } finally { setLoading(false); }
  });

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
    if (!ensureWeekEditable()) return;
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
    setShowStartPicker(false);
    setShowEndPicker(false);
  };

  const handleChangeWeek = (offset) => {
    if (actionBusy) return;
    setAvailabilities([]);
    setSnapshot(null);
    setViewedWeekStart((weekStart) => shiftAvailabilityWeek(weekStart, offset));
    setClockNow(new Date());
    handleCancelEdit();
  };

  const ensureWeekEditable = () => {
    if (!snapshot || snapshot.weekStart !== viewedWeekStart) {
      showAlert('Chưa tải được lịch rảnh', 'Vui lòng tải lại tuần đang xem trước khi lưu.');
      return false;
    }
    const now = new Date();
    const status = getAvailabilityEditStatus(viewedWeekStart, now);
    if (status.editable && snapshot?.weekStart === viewedWeekStart && snapshot?.editable !== false) return true;
    setClockNow(now);
    if (status.notYetOpen) {
      showAlert('Chưa mở đăng ký tuần này', 'Chỉ mở đăng ký cho tuần kế tiếp trước hạn Thứ Sáu. Vui lòng chọn tuần kế tiếp.');
      return false;
    }
    showAlert('Đã hết hạn chỉnh sửa', `Tuần ${weekRangeLabel} đã khóa chỉnh sửa. Hạn đăng ký là 23:59 Thứ Sáu, ${deadlineDateLabel} (giờ Việt Nam).`);
    return false;
  };

  const handleDeleteSlot = (slot) => {
    if (!ensureWeekEditable()) return;
    showAlert(
      'Xác nhận xóa',
      'Bạn có chắc muốn xóa khung giờ rảnh này không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => runAction('availability', async () => {
            if (!ensureWeekEditable()) return;
            try {
              setLoading(true);
              await saveSlots(availabilities.filter((item) => item.id !== slot.id));
              if (editingSlot?.id === slot.id) {
                handleCancelEdit();
              }
              showAlert('Thành công', 'Đã xóa lịch rảnh thành công.');
            } catch (err) {
              showAlert('Lỗi', err.response?.data?.message || 'Không thể xóa lịch rảnh.');
            } finally {
              setLoading(false);
            }
          }),
        },
      ]
    );
  };

  const handleSubmit = () => runAction('availability', async () => {
    if (!ensureWeekEditable()) return;
    try {
      setLoading(true);
      const finalStart = allDay ? '00:00:00' : `${startTime.hour}:${startTime.minute}:00`;
      const finalEnd = allDay ? '23:59:59' : `${endTime.hour}:${endTime.minute}:00`;

      if (editingSlot) {
        await saveSlots(availabilities.map((slot) => slot.id === editingSlot.id ? { ...slot, dayOfWeek: selectedDay, startTime: finalStart, endTime: finalEnd } : slot));
        showAlert('Thành công! 🎉', 'Đã cập nhật khung giờ riêng của tuần đang xem.');
        handleCancelEdit();
      } else {
        await saveSlots([...availabilities, { dayOfWeek: selectedDay, startTime: finalStart, endTime: finalEnd }]);
        showAlert(
          'Đăng ký thành công! 🎉',
          'Khung giờ rảnh của bạn đã được gửi đến Quản lý. Khi Quản lý duyệt và phân công ca, ca làm việc sẽ hiển thị ngay trên ứng dụng của bạn.',
          [
            { text: 'Đăng ký tiếp', onPress: () => {} },
            { text: 'Xem lịch ca', onPress: () => navigation.navigate('MainTabs', { screen: 'Schedule' }, { pop: true }) },
          ]
        );
      }
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message
        || (status === 401 || status === 403 ? 'Chưa đăng nhập hoặc phiên đăng nhập hết hạn' : 'Thao tác thất bại');
      showAlert('Lỗi', msg);
      if (status === 409) loadAvailability();
      console.log('Chi tiết lỗi:', status, err.response?.data);
    } finally {
      setLoading(false);
    }
  });

  const selectedDayObj = days.find(d => d.value === selectedDay);
  const daySlots = availabilities.filter(a => a.dayOfWeek === selectedDay);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: uiColors.surface }}>
      <ScrollView style={styles.page} contentContainerStyle={[styles.content, { paddingBottom: bottomNavbarPadding }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => navigation.goBack()} style={ensureTouchTarget(styles.backBtn)}>
            <BackIcon />
          </TouchableOpacity>
          <Text accessibilityRole="header" style={styles.screenTitle}>Đăng ký lịch rảnh</Text>
          <View style={{ width: 32 }} />
        </View>

        <View style={styles.monthNavRow}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Xem tuần trước" onPress={() => handleChangeWeek(-1)} style={ensureTouchTarget(styles.navArrow)}>
            <Text style={styles.navArrowText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{monthTitle}</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Xem tuần sau" onPress={() => handleChangeWeek(1)} style={ensureTouchTarget(styles.navArrow)}>
            <Text style={styles.navArrowText}>›</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.weekRange}>{weekRangeLabel}</Text>

        <View style={[styles.deadlineNotice, isReadOnly && styles.deadlineNoticeLocked]} accessibilityRole="text">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <ThreeIllustration kind="deer" size={116} animated interactive />
          <View style={{ flex: 1 }}>
          <Text style={styles.deadlineTitle}>{deadline.notYetOpen ? 'Chưa mở đăng ký tuần này · Chỉ xem' : isReadOnly ? 'Đã hết hạn · Chỉ xem' : 'Hạn đăng ký: 23:59 Thứ Sáu'}</Text>
          <Text style={styles.deadlineText}>{isReadOnly ? 'Hạn chỉnh sửa: ' : ''}23:59, {deadlineDateLabel} · giờ Việt Nam</Text>
          </View></View>
          <Text style={styles.recurringNote}>{snapshot?.source === 'TEMPLATE'
            ? 'Gợi ý từ lịch mẫu trước đây · Chưa đăng ký cho tuần này. Lưu để xác nhận các khung giờ riêng của tuần đang xem.'
            : snapshot?.source === 'REGISTERED'
            ? 'Đã lưu riêng cho tuần này. Thay đổi ở tuần khác sẽ không sửa bản đăng ký này.'
            : 'Tuần này chưa có bản đăng ký riêng được lưu. Lịch mẫu hiện tại không được dùng làm lịch sử của tuần cũ.'}</Text>
          {snapshot?.source === 'TEMPLATE' && !isReadOnly && availabilities.length > 0 && (
            <TouchableOpacity accessibilityRole="button" onPress={registerTemplate} disabled={actionBusy} style={ensureTouchTarget(styles.templateButton)}>
              <Text style={styles.myShiftsText}>Đăng ký các khung giờ gợi ý</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity accessibilityRole="button"
          style={ensureTouchTarget(styles.myShiftsBtn)}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Schedule' }, { pop: true })}
          activeOpacity={0.8}
        >
          <Text style={styles.myShiftsText}>Xem lịch ca làm việc</Text>
        </TouchableOpacity>

        {dataLoading && <ActivityIndicator accessibilityLabel="Đang tải lịch rảnh" color={uiColors.primaryStrong} style={{ marginBottom: 12 }} />}
        {!!loadError && <TouchableOpacity accessibilityRole="button" onPress={loadAvailability} style={ensureTouchTarget(styles.deadlineNotice)}><Text style={styles.deadlineTitle}>{loadError}</Text><Text style={styles.myShiftsText}>Thử lại</Text></TouchableOpacity>}

        {/* 7 ngày trong tuần */}
        <ScrollView horizontal contentContainerStyle={{ flexGrow: 1 }}>
        <View style={[styles.dayRow, { minWidth: 336, flex: 1 }]}>
          {days.map((d, i) => {
            const active = selectedDay === d.value;
            return (
              <TouchableOpacity
                accessibilityRole="button" accessibilityLabel={`Chọn ${d.label}, ngày ${weekDates[i]}`} accessibilityState={{ selected: active }} aria-selected={active}
                key={d.value}
                style={ensureTouchTarget([styles.dayCell, active && styles.dayCellActive])}
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

        </ScrollView>
        {/* Danh sách lịch rảnh đã đăng ký của ngày được chọn */}
        <View style={styles.registeredSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Lịch rảnh: {selectedDayObj?.label}
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
              <Text style={styles.emptySlotSubText}>{deadline.notYetOpen ? 'Chỉ mở đăng ký cho tuần kế tiếp.' : isReadOnly ? 'Tuần này đã khóa chỉnh sửa.' : 'Chọn khung giờ bên dưới để đăng ký.'}</Text>
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
                          {isEditingThis ? 'Đang chỉnh sửa khung giờ này' : snapshot?.source === 'TEMPLATE' ? 'Gợi ý từ lịch mẫu · Chưa đăng ký' : 'Đã đăng ký cho tuần này'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.slotActions}>
                      <TouchableOpacity
                        style={ensureTouchTarget([styles.actionBtn, styles.editBtn, (isReadOnly || actionBusy) && styles.disabledControl])}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: isReadOnly || actionBusy }} aria-disabled={isReadOnly || actionBusy}
                        disabled={isReadOnly || actionBusy}
                        onPress={() => handleStartEdit(slot)}
                      >
                        <Text style={styles.editBtnText}>Sửa</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={ensureTouchTarget([styles.actionBtn, styles.deleteBtn, (isReadOnly || actionBusy) && styles.disabledControl])}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: isReadOnly || actionBusy }} aria-disabled={isReadOnly || actionBusy}
                        disabled={isReadOnly || actionBusy}
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
        <View style={[styles.formContainer, editingSlot && styles.formContainerEditing, isReadOnly && styles.formReadOnly]}>
          <View style={styles.formHeaderRow}>
            <Text style={styles.formSectionTitle}>
              {deadline.notYetOpen ? 'Tuần đang xem chưa mở đăng ký' : isReadOnly ? 'Tuần đang xem đã khóa chỉnh sửa' : editingSlot ? `✏️ Chỉnh sửa lịch rảnh (${selectedDayObj?.label})` : `➕ Thêm lịch rảnh (${selectedDayObj?.label})`}
            </Text>
            {editingSlot && (
              <TouchableOpacity accessibilityRole="button" onPress={handleCancelEdit} style={ensureTouchTarget(styles.cancelEditBtn)}>
                <Text style={styles.cancelEditBtnText}>Hủy sửa</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Cả ngày</Text>
            <Switch
              disabled={isReadOnly || actionBusy}
              value={allDay}
              onValueChange={setAllDay}
              trackColor={{ false: uiColors.lineStrong, true: uiColors.orange }}
              thumbColor="#fff"
            />
          </View>

          {!allDay && (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>Thời gian bắt đầu:</Text>
                <TouchableOpacity accessibilityRole="button"
                  style={ensureTouchTarget(styles.timePill)}
                  disabled={isReadOnly || actionBusy}
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
                <TouchableOpacity accessibilityRole="button"
                  style={ensureTouchTarget(styles.timePill)}
                  disabled={isReadOnly || actionBusy}
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
            style={ensureTouchTarget([styles.submitBtn, editingSlot && styles.submitBtnEditing, (isReadOnly || actionBusy) && styles.disabledControl])}
            accessibilityRole="button"
            accessibilityState={{ disabled: isReadOnly || actionBusy, busy: actionBusy }} aria-disabled={isReadOnly || actionBusy} aria-busy={actionBusy}
            onPress={handleSubmit}
            disabled={isReadOnly || actionBusy}
          >
            {actionBusy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.submitText}>
              {deadline.notYetOpen
                ? 'Chưa mở đăng ký'
                : isReadOnly
                ? 'Đã hết hạn đăng ký'
                : editingSlot
                ? 'Lưu thay đổi lịch rảnh'
                : 'Đăng ký lịch rảnh'}
            </Text>}
          </TouchableOpacity>
        </View>

        <View style={{ height: 90 }} />
      </ScrollView>
      <BottomNavbar navigation={navigation} activeRoute="Availability" />
    </SafeAreaView>
  );
}

const styles = createAppStyles({
  templateButton: { marginTop: 10, paddingVertical: 8 },
  weekRange: { fontSize: 12, lineHeight: 18, color: uiColors.muted, textAlign: 'center', marginBottom: 12 },
  deadlineNotice: { backgroundColor: uiColors.peach, borderLeftWidth: 3, borderLeftColor: uiColors.orange, padding: 12, marginBottom: 14 },
  deadlineNoticeLocked: { backgroundColor: uiColors.canvas, borderLeftColor: uiColors.muted },
  deadlineTitle: { color: "#404B57", fontSize: 13, fontWeight: '600', lineHeight: 20 },
  deadlineText: { color: uiColors.secondary, fontSize: 12, lineHeight: 18, marginTop: 3 },
  recurringNote: { color: uiColors.muted, fontSize: 11, lineHeight: 17, marginTop: 7 },
  disabledControl: { opacity: 0.45 },
  formReadOnly: { backgroundColor: uiColors.canvas },
  page: { flex: 1, backgroundColor: uiColors.surface },
  content: { padding: 16, paddingBottom: 110 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: 8,

    minHeight: 48,
  },
  backBtn: { padding: 4 },
  backArrow: { fontSize: 24, fontWeight: '700', color: uiColors.ink },
  screenTitle: { fontSize: 18, fontWeight: '600', color: uiColors.ink },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginTop: 8,
    marginBottom: 12,
  },
  navArrow: {
    width: 36, height: 36, borderRadius: 0,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: uiColors.surface,
  },
  navArrowText: { fontSize: 18, fontWeight: '700', color: uiColors.ink, marginTop: -2 },
  monthTitle: { fontSize: 20, fontWeight: '600', textAlign: 'center',
    color: uiColors.ink,
  },
  myShiftsBtn: {
    backgroundColor: uiColors.subtle,
    borderRadius: 4,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 18,
  },
  myShiftsText: { fontSize: 14, fontWeight: '600', color: uiColors.primaryStrong },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: uiColors.surface,
    borderWidth: 0,
    borderColor: "rgba(240, 239, 235, 0.7)",
    borderRadius: 0,
    padding: 0,
    marginBottom: 24,
  },
  dayCell: { alignItems: 'center', padding: 6, borderRadius: 4, flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 3,
    minHeight: 64,
  },
  dayCellActive: { backgroundColor: uiColors.peach },
  dayLabel: { fontSize: 12, fontWeight: '600', color: uiColors.muted },
  dayLabelActive: { color: uiColors.primaryStrong, fontWeight: '700' },
  dayNumber: { fontSize: 18, fontWeight: '600', color: uiColors.muted, marginTop: 2 },
  dayNumberActive: { color: uiColors.primaryStrong, fontWeight: '700' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: uiColors.orange, marginTop: 3 },

  /* Registered Section */
  registeredSection: {
    backgroundColor: uiColors.surface,
    borderRadius: 0,
    padding: 0,
    marginBottom: 24,
    borderWidth: 0,
    borderColor: uiColors.line,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: uiColors.ink },
  badgeCount: {
    backgroundColor: uiColors.canvas,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeCountText: { fontSize: 12, fontWeight: '500', color: uiColors.muted },
  emptySlotBox: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptySlotText: { fontSize: 13, color: uiColors.muted, fontStyle: 'italic' },
  emptySlotSubText: { fontSize: 12, color: uiColors.muted, marginTop: 3 },
  slotList: {
    gap: 8,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: uiColors.surface,
    borderRadius: 0,
    padding: 12,
    borderWidth: 0,
    borderColor: uiColors.line,

    borderBottomWidth: 1,
    borderBottomColor: uiColors.line,
  },
  slotCardEditing: {
    borderColor: uiColors.orange,
    backgroundColor: uiColors.peach,
    borderWidth: 1,
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
    backgroundColor: uiColors.turquoise,
  },
  slotDotEditing: {
    backgroundColor: uiColors.warning,
  },
  slotTimeText: { fontSize: 14, fontWeight: '700', color: uiColors.ink },
  slotStatusText: { fontSize: 11, color: uiColors.muted, marginTop: 2 },
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
    backgroundColor: uiColors.canvas,

    borderRadius: 4,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: uiColors.primaryStrong,
  },
  deleteBtn: {
    backgroundColor: "#F1DDDC",
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: uiColors.dangerText,
  },

  /* Form Container */
  formContainer: {
    backgroundColor: uiColors.surface,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: uiColors.line,
    padding: 16,
  },
  formContainerEditing: {
    borderColor: uiColors.orange,
    borderWidth: 1,
  },
  formHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: uiColors.canvas,
  },
  formSectionTitle: { fontSize: 14, fontWeight: '600', color: uiColors.ink, flex: 1, lineHeight: 20 },
  cancelEditBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: uiColors.canvas,
    borderRadius: 6,
  },
  cancelEditBtnText: { fontSize: 12, fontWeight: '600', color: uiColors.muted },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: { fontSize: 15, fontWeight: '500', color: uiColors.ink },
  timePill: {
    backgroundColor: uiColors.surface,
    borderWidth: 1,
    borderColor: uiColors.lineStrong,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
    minWidth: 90,
    alignItems: 'center',
  },
  timePillText: { fontSize: 15, color: uiColors.ink, fontWeight: '500' },
  submitBtn: {
    backgroundColor: uiColors.orange,
    borderRadius: 4,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  submitBtnEditing: {
    backgroundColor: uiColors.orange,
  },
  submitText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  TextInput,
  Switch,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { getMyRequests, createStaffRequest } from '../services/requestService';

// ── Asset Icons ─────────────────────────────────────────────────────────────
const iconHac = require('../assets/icon_hac.png');
const iconNote = require('../assets/icon_note.png');
const iconLich = require('../assets/icon_lich.png');
const iconKinh = require('../assets/icon-kinh.png');
const iconLoa = require('../assets/icon-loa.png');
const iconDua = require('../assets/icon-dua.png');

// ── Avatars ─────────────────────────────────────────────────────────────────
const avatarDilan = require('../assets/avatar-dilan-jon.png');
const avatarMew = require('../assets/avatar-mew-ama.png');
const avatarPaul = require('../assets/avatar-paul-lee.png');
const avatarThia = require('../assets/avatar-thia-ago.png');

const AVATAR_MAP = {
  'Dilan. Jon': avatarDilan,
  'Mew. Ama': avatarMew,
  'Paul. Lee': avatarPaul,
  'Thia. Ago': avatarThia,
};

const SUGGESTED_SWAP_STAFF = [
  { name: 'Mew. Ama', role: 'Barista', avatar: avatarMew },
  { name: 'Thia. Ago', role: 'Cashier', avatar: avatarThia },
  { name: 'Paul. Lee', role: 'Cashier', avatar: avatarPaul },
  { name: 'Thia. Ago', role: 'Parking Staff', avatar: avatarThia },
  { name: 'Mew. Ama', role: 'Server', avatar: avatarMew },
];

// Danh sách các ca làm của người dùng (Dilan. Jon) có thể chọn để đổi hoặc xin vắng
const MY_AVAILABLE_SHIFTS = [
  {
    id: 'my-shift-1',
    dayLabel: 'Thứ 2 (03/08)',
    timeRange: '6:00AM - 15:00PM',
    location: 'Highlands D9/71 Tây Thạnh Tân Phú',
    role: 'Barista',
    color: '#8DD9CC',
  },
  {
    id: 'my-shift-2',
    dayLabel: 'Thứ 4 (05/08)',
    timeRange: '6:00AM - 15:00PM',
    location: 'Highlands D9/71 Tây Thạnh Tân Phú',
    role: 'Barista',
    color: '#8DD9CC',
  },
  {
    id: 'my-shift-3',
    dayLabel: 'Thứ 5 (06/08)',
    timeRange: '6:00AM - 14:00PM',
    location: 'Highlands D9/71 Tây Thạnh Tân Phú',
    role: 'Barista',
    color: '#8DD9CC',
  },
  {
    id: 'my-shift-4',
    dayLabel: 'Thứ 6 (07/08)',
    timeRange: '14:00PM - 22:00PM',
    location: 'Highlands D9/71 Tây Thạnh Tân Phú',
    role: 'Cashier',
    color: '#D98DB3',
  },
  {
    id: 'my-shift-5',
    dayLabel: 'Thứ CN (09/08)',
    timeRange: '14:00PM - 22:00PM',
    location: 'Highlands D9/71 Tây Thạnh Tân Phú',
    role: 'Cashier',
    color: '#D98DB3',
  },
];

export default function RequestScreen({ navigation, route }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState(null); // null | 'APPROVED' | 'PENDING' | 'REJECTED'

  // ── Custom Toast / Thông báo đẹp ──
  const [toastMessage, setToastMessage] = useState(null);

  // ── Modal States ──
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const [leaveModalVisible, setLeaveModalVisible] = useState(false);
  const [swapModalVisible, setSwapModalVisible] = useState(false);
  const [absentModalVisible, setAbsentModalVisible] = useState(false);

  // ── Form States (Xin nghỉ - Image 1) ──
  const [isAllDay, setIsAllDay] = useState(true);
  const [startDate, setStartDate] = useState('30-10-2026');
  const [endDate, setEndDate] = useState('05-11-2026');
  const [leaveReason, setLeaveReason] = useState('');

  // ── Form States (Đổi ca - Image 3) ──
  const [selectedSwapShift, setSelectedSwapShift] = useState(MY_AVAILABLE_SHIFTS[0]);
  const [showShiftPicker, setShowShiftPicker] = useState(false);
  const [selectedSwapStaff, setSelectedSwapStaff] = useState('Mew. Ama');

  // ── Form States (Xin vắng - Image 4) ──
  const [selectedAbsentShift, setSelectedAbsentShift] = useState(MY_AVAILABLE_SHIFTS[0]);
  const [showAbsentShiftPicker, setShowAbsentShiftPicker] = useState(false);
  const [absentReason, setAbsentReason] = useState('');

  useEffect(() => {
    loadRequests();

    // Check if opened with an action from ScheduleScreen
    if (route?.params?.action === 'open_swap') {
      if (route.params.shift) {
        const found = MY_AVAILABLE_SHIFTS.find(s => s.id === route.params.shift.id);
        if (found) setSelectedSwapShift(found);
      }
      setSwapModalVisible(true);
    } else if (route?.params?.action === 'open_absent') {
      if (route.params.shift) {
        const found = MY_AVAILABLE_SHIFTS.find(s => s.id === route.params.shift.id);
        if (found) setSelectedAbsentShift(found);
      }
      setAbsentModalVisible(true);
    } else if (route?.params?.action === 'open_leave') {
      setLeaveModalVisible(true);
    }
  }, [route?.params]);

  const showToast = (title, message, type = 'success') => {
    setToastMessage({ title, message, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await getMyRequests();
      setRequests(data);
    } catch (e) {
      console.log('Error loading requests:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterToggle = (status) => {
    if (filterStatus === status) {
      setFilterStatus(null);
    } else {
      setFilterStatus(status);
    }
  };

  // ── Submit Xin nghỉ (Image 1) ──
  const handleSubmitLeave = async () => {
    if (!leaveReason.trim()) {
      showToast('Lưu ý', 'Vui lòng nhập lý do xin nghỉ', 'warning');
      return;
    }

    try {
      setLoading(true);
      await createStaffRequest({
        type: 'LEAVE',
        requesterName: 'Dilan. Jon',
        startDate: startDate,
        endDate: endDate,
        reason: leaveReason.trim(),
      });
      setLeaveModalVisible(false);
      setLeaveReason('');
      showToast('Gửi thành công', 'Yêu cầu xin nghỉ phép đã được chuyển tới Quản lý');
      loadRequests();
    } catch (err) {
      showToast('Thất bại', 'Không thể gửi yêu cầu xin nghỉ', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Submit Đổi ca (Image 3) ──
  const handleSubmitSwap = async () => {
    try {
      setLoading(true);
      await createStaffRequest({
        type: 'SWAP',
        requesterName: 'Dilan. Jon',
        targetStaffName: selectedSwapStaff,
        shiftInfo: `${selectedSwapShift.dayLabel} ${selectedSwapShift.timeRange} (${selectedSwapShift.role})`,
        reason: `Yêu cầu đổi ca trực với bạn ${selectedSwapStaff}`,
      });
      setSwapModalVisible(false);
      showToast('Gửi thành công', `Đã gửi yêu cầu đổi ca ${selectedSwapShift.dayLabel} với ${selectedSwapStaff}`);
      loadRequests();
    } catch (err) {
      showToast('Thất bại', 'Không thể gửi yêu cầu đổi ca', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Submit Xin vắng (Image 4) ──
  const handleSubmitAbsent = async () => {
    if (!absentReason.trim()) {
      showToast('Lưu ý', 'Vui lòng nhập lý do xin vắng ca', 'warning');
      return;
    }

    try {
      setLoading(true);
      await createStaffRequest({
        type: 'ABSENT',
        requesterName: 'Dilan. Jon',
        shiftInfo: `${selectedAbsentShift.dayLabel} ${selectedAbsentShift.timeRange} (${selectedAbsentShift.role})`,
        reason: absentReason.trim(),
      });
      setAbsentModalVisible(false);
      setAbsentReason('');
      showToast('Gửi thành công', `Đã gửi yêu cầu xin vắng ca ${selectedAbsentShift.dayLabel} tới Quản lý`);
      loadRequests();
    } catch (err) {
      showToast('Thất bại', 'Không thể gửi yêu cầu xin vắng', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = filterStatus
    ? requests.filter(r => r.status === filterStatus)
    : requests;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* ── CUSTOM TOAST NOTIFICATION ─────────────────────────── */}
      {toastMessage && (
        <View style={styles.toastOverlay}>
          <View style={[
            styles.toastCard,
            toastMessage.type === 'warning' && styles.toastCardWarning,
            toastMessage.type === 'error' && styles.toastCardError,
          ]}>
            <View style={[
              styles.toastIconCircle,
              toastMessage.type === 'warning' && styles.toastIconCircleWarning,
              toastMessage.type === 'error' && styles.toastIconCircleError,
            ]}>
              <Text style={styles.toastIconText}>
                {toastMessage.type === 'warning' ? '!' : toastMessage.type === 'error' ? '✕' : '✓'}
              </Text>
            </View>
            <View style={styles.toastTextContainer}>
              <Text style={styles.toastTitle}>{toastMessage.title}</Text>
              <Text style={styles.toastMessage} numberOfLines={2}>{toastMessage.message}</Text>
            </View>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Header (Xử lý yêu cầu) ── */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => navigation?.goBack?.()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Xử lý yêu cầu</Text>
        </View>

        <View style={styles.headerDivider} />

        {/* ── 2. Top 3 Filter Cards (Ảnh 2 trong docx) ── */}
        <View style={styles.filterCardsRow}>
          {/* Đã duyệt + Chim hạc */}
          <TouchableOpacity
            style={[
              styles.filterCard,
              filterStatus === 'APPROVED' && styles.filterCardActive
            ]}
            onPress={() => handleFilterToggle('APPROVED')}
            activeOpacity={0.8}
          >
            <View style={styles.filterCardContent}>
              <Text style={styles.filterCardText}>Đã{'\n'}duyệt</Text>
              <Image source={iconHac} style={styles.filterCardIcon} resizeMode="contain" />
            </View>
          </TouchableOpacity>

          {/* Chờ duyệt + Note */}
          <TouchableOpacity
            style={[
              styles.filterCard,
              filterStatus === 'PENDING' && styles.filterCardActive
            ]}
            onPress={() => handleFilterToggle('PENDING')}
            activeOpacity={0.8}
          >
            <View style={styles.filterCardContent}>
              <Text style={styles.filterCardText}>Chờ{'\n'}duyệt</Text>
              <Image source={iconNote} style={styles.filterCardIcon} resizeMode="contain" />
            </View>
          </TouchableOpacity>

          {/* Từ chối + Lịch */}
          <TouchableOpacity
            style={[
              styles.filterCard,
              filterStatus === 'REJECTED' && styles.filterCardActive
            ]}
            onPress={() => handleFilterToggle('REJECTED')}
            activeOpacity={0.8}
          >
            <View style={styles.filterCardContent}>
              <Text style={styles.filterCardText}>Từ{'\n'}chối</Text>
              <Image source={iconLich} style={styles.filterCardIcon} resizeMode="contain" />
            </View>
          </TouchableOpacity>
        </View>

        {/* ── 3. KHU VỰC TẠO YÊU CẦU MỚI (3 BOX XANH GIỐNG ẢNH ĐỔI CA / ẢNH 3) ── */}
        <View style={styles.actionSectionContainer}>
          <Text style={styles.actionSectionHeading}>Tạo yêu cầu mới</Text>
          <View style={styles.actionButtonsRow}>
            {/* 1. Hỗ trợ đổi ca */}
            <TouchableOpacity
              style={styles.actionCardPill}
              onPress={() => setSwapModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionCardPillText}>Hỗ trợ{'\n'}đổi ca</Text>
              <Image source={iconKinh} style={styles.actionCardPillIcon} resizeMode="contain" />
            </TouchableOpacity>

            {/* 2. Vắng mặt */}
            <TouchableOpacity
              style={styles.actionCardPill}
              onPress={() => setAbsentModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionCardPillText}>Vắng{'\n'}mặt</Text>
              <Image source={iconLoa} style={styles.actionCardPillIcon} resizeMode="contain" />
            </TouchableOpacity>

            {/* 3. Xin nghỉ phép */}
            <TouchableOpacity
              style={styles.actionCardPill}
              onPress={() => setLeaveModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionCardPillText}>Xin nghỉ{'\n'}phép</Text>
              <Image source={iconDua} style={styles.actionCardPillIcon} resizeMode="contain" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.headerDivider} />

        {/* ── 4. Danh sách Yêu cầu (Ảnh 2 trong docx) ── */}
        <Text style={styles.requestListHeading}>Lịch sử yêu cầu</Text>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#51A33D" />
            <Text style={styles.loadingText}>Đang tải yêu cầu...</Text>
          </View>
        ) : (
          <View style={styles.requestList}>
            {filteredRequests.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>Chưa có yêu cầu nào trong mục này</Text>
              </View>
            ) : (
              filteredRequests.map((item) => {
                const isApproved = item.status === 'APPROVED';
                const isRejected = item.status === 'REJECTED';
                const isPending = item.status === 'PENDING';

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.requestItemCard,
                      isRejected && styles.requestItemCardRejected
                    ]}
                    onPress={() => {
                      setSelectedRequest(item);
                      setDetailModalVisible(true);
                    }}
                    activeOpacity={0.85}
                  >
                    <View style={styles.requestItemTopRow}>
                      <Text style={styles.requestItemTitle}>{item.typeLabel || 'Xin nghỉ'}</Text>
                      <Text style={styles.requestItemDate}>{item.date}</Text>
                    </View>

                    <View style={styles.requestItemBottomRow}>
                      <Text style={styles.requestItemDesc} numberOfLines={2}>
                        {item.description}
                      </Text>

                      {/* Status Badge */}
                      <View
                        style={[
                          styles.statusBadge,
                          isApproved && styles.statusBadgeApproved,
                          isRejected && styles.statusBadgeRejected,
                          isPending && styles.statusBadgePending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            isApproved && styles.statusBadgeTextApproved,
                            isRejected && styles.statusBadgeTextRejected,
                            isPending && styles.statusBadgeTextPending,
                          ]}
                        >
                          {item.statusText || 'Chờ Duyệt'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* ── MODAL 1: Yêu cầu xin nghỉ (Ảnh 1 trong docx) ─────────────── */}
      <Modal
        visible={leaveModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setLeaveModalVisible(false)}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setLeaveModalVisible(false)}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Yêu cầu xin nghỉ</Text>
            </View>

            <View style={styles.headerDivider} />

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Phân loại yêu cầu</Text>
              <Text style={styles.formValue}>Xin nghỉ</Text>
            </View>

            <Text style={styles.sectionHeader}>Thời gian</Text>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Cả ngày</Text>
              <Switch
                value={isAllDay}
                onValueChange={setIsAllDay}
                trackColor={{ false: '#E0E0E0', true: '#51A33D' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Ngày bắt đầu</Text>
              <TextInput
                style={styles.dateInput}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="DD-MM-YYYY"
              />
            </View>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Ngày kết thúc</Text>
              <TextInput
                style={styles.dateInput}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="DD-MM-YYYY"
              />
            </View>

            <Text style={styles.sectionHeader}>Lý do:</Text>
            <TextInput
              style={styles.reasonTextArea}
              value={leaveReason}
              onChangeText={setLeaveReason}
              placeholder="Nhập lý do xin nghỉ..."
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmitLeave}
              activeOpacity={0.8}
            >
              <Text style={styles.submitBtnText}>Gửi yêu cầu</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── MODAL 2: Yêu cầu đổi ca (Ảnh 3 - CÓ THỂ CHỌN CA CỦA MÌNH) ──── */}
      <Modal
        visible={swapModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSwapModalVisible(false)}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setSwapModalVisible(false)}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Yêu cầu đổi ca</Text>
            </View>

            <View style={styles.headerDivider} />

            {/* Ca làm việc của tôi đang chọn */}
            <View style={styles.shiftSelectorHeaderRow}>
              <Text style={styles.shiftSelectorHeaderTitle}>Ca làm của bạn:</Text>
              <TouchableOpacity
                style={styles.changeShiftBtn}
                onPress={() => setShowShiftPicker(!showShiftPicker)}
                activeOpacity={0.7}
              >
                <Text style={styles.changeShiftBtnText}>
                  {showShiftPicker ? 'Đóng danh sách ▲' : 'Đổi ca khác ▼'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Dropdown danh sách ca của tôi */}
            {showShiftPicker && (
              <View style={styles.shiftPickerDropdown}>
                {MY_AVAILABLE_SHIFTS.map((shift) => {
                  const isSelected = selectedSwapShift.id === shift.id;
                  return (
                    <TouchableOpacity
                      key={shift.id}
                      style={[styles.shiftPickerItem, isSelected && styles.shiftPickerItemSelected]}
                      onPress={() => {
                        setSelectedSwapShift(shift);
                        setShowShiftPicker(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.shiftPickerDot, { backgroundColor: shift.color }]} />
                      <Text style={[styles.shiftPickerItemText, isSelected && styles.shiftPickerItemTextSelected]}>
                        {shift.dayLabel} : {shift.timeRange} ({shift.role})
                      </Text>
                      {isSelected && <Text style={styles.shiftPickerCheck}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Preview Thẻ Ca đã chọn */}
            <View style={styles.requesterShiftBox}>
              <View style={styles.avatarCol}>
                <Image source={avatarDilan} style={styles.avatarImg} />
                <Text style={styles.avatarName}>Dilan. Jon</Text>
              </View>

              <View style={styles.shiftCardMini}>
                <View style={[styles.miniBar, { backgroundColor: selectedSwapShift.color }]} />
                <View style={styles.miniInfo}>
                  <Text style={styles.miniTime}>
                    {selectedSwapShift.dayLabel} - {selectedSwapShift.timeRange}
                  </Text>
                  <Text style={styles.miniLocation}>{selectedSwapShift.location}</Text>
                  <View style={styles.miniRoleRow}>
                    <View style={[styles.miniRoleDot, { backgroundColor: selectedSwapShift.color }]} />
                    <Text style={styles.miniRoleText}>{selectedSwapShift.role}</Text>
                  </View>
                </View>
              </View>
            </View>

            <Text style={styles.suggestTitle}>Gợi ý đồng nghiệp</Text>

            <View style={styles.suggestList}>
              {SUGGESTED_SWAP_STAFF.map((staff, idx) => {
                const isSelected = selectedSwapStaff === staff.name && idx === 0;

                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.suggestItem, isSelected && styles.suggestItemSelected]}
                    onPress={() => setSelectedSwapStaff(staff.name)}
                    activeOpacity={0.7}
                  >
                    <Image source={staff.avatar} style={styles.suggestAvatar} />
                    <View style={styles.suggestInfo}>
                      <Text style={styles.suggestName}>{staff.name}</Text>
                      <Text style={styles.suggestRole}>{staff.role}</Text>
                    </View>
                    {isSelected && <Text style={styles.suggestCheckmark}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmitSwap}
              activeOpacity={0.8}
            >
              <Text style={styles.submitBtnText}>Gửi yêu cầu</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── MODAL 3: Yêu cầu xin vắng (Ảnh 4 - CÓ THỂ CHỌN CA CỦA MÌNH) ──── */}
      <Modal
        visible={absentModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setAbsentModalVisible(false)}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setAbsentModalVisible(false)}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Yêu cầu xin vắng</Text>
            </View>

            <View style={styles.headerDivider} />

            {/* Ca làm việc cần xin vắng */}
            <View style={styles.shiftSelectorHeaderRow}>
              <Text style={styles.shiftSelectorHeaderTitle}>Ca xin vắng:</Text>
              <TouchableOpacity
                style={styles.changeShiftBtn}
                onPress={() => setShowAbsentShiftPicker(!showAbsentShiftPicker)}
                activeOpacity={0.7}
              >
                <Text style={styles.changeShiftBtnText}>
                  {showAbsentShiftPicker ? 'Đóng danh sách ▲' : 'Đổi ca khác ▼'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Dropdown danh sách ca của tôi */}
            {showAbsentShiftPicker && (
              <View style={styles.shiftPickerDropdown}>
                {MY_AVAILABLE_SHIFTS.map((shift) => {
                  const isSelected = selectedAbsentShift.id === shift.id;
                  return (
                    <TouchableOpacity
                      key={shift.id}
                      style={[styles.shiftPickerItem, isSelected && styles.shiftPickerItemSelected]}
                      onPress={() => {
                        setSelectedAbsentShift(shift);
                        setShowAbsentShiftPicker(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.shiftPickerDot, { backgroundColor: shift.color }]} />
                      <Text style={[styles.shiftPickerItemText, isSelected && styles.shiftPickerItemTextSelected]}>
                        {shift.dayLabel} : {shift.timeRange} ({shift.role})
                      </Text>
                      {isSelected && <Text style={styles.shiftPickerCheck}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Requester & Shift Preview */}
            <View style={styles.requesterShiftBox}>
              <View style={styles.avatarCol}>
                <Image source={avatarDilan} style={styles.avatarImg} />
                <Text style={styles.avatarName}>Dilan. Jon</Text>
              </View>

              <View style={styles.shiftCardMini}>
                <View style={[styles.miniBar, { backgroundColor: selectedAbsentShift.color }]} />
                <View style={styles.miniInfo}>
                  <Text style={styles.miniTime}>
                    {selectedAbsentShift.dayLabel} - {selectedAbsentShift.timeRange}
                  </Text>
                  <Text style={styles.miniLocation}>{selectedAbsentShift.location}</Text>
                  <View style={styles.miniRoleRow}>
                    <View style={[styles.miniRoleDot, { backgroundColor: selectedAbsentShift.color }]} />
                    <Text style={styles.miniRoleText}>{selectedAbsentShift.role}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.headerDivider} />

            <Text style={styles.sectionHeader}>Lý do:</Text>
            <TextInput
              style={styles.reasonTextArea}
              value={absentReason}
              onChangeText={setAbsentReason}
              placeholder="Nhập lý do xin vắng ca này..."
              multiline
              numberOfLines={4}
            />

            {/* Warning Note Box */}
            <View style={styles.warningNoteBox}>
              <Text style={styles.warningNoteTitle}>Lưu ý:</Text>
              <Text style={styles.warningNoteText}>
                Yêu cầu vắng ca của bạn cần được Quản lý phê duyệt. Trong lúc chờ duyệt, bạn vẫn chịu trách nhiệm với ca làm.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmitAbsent}
              activeOpacity={0.8}
            >
              <Text style={styles.submitBtnText}>Gửi yêu cầu</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── MODAL 4: Chi tiết yêu cầu (Ảnh 5 trong docx) ─────────────── */}
      <Modal
        visible={detailModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalCard}>
            <TouchableOpacity
              style={styles.detailCloseBtn}
              onPress={() => setDetailModalVisible(false)}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>

            <View style={styles.detailHeaderCenter}>
              <Image
                source={AVATAR_MAP[selectedRequest?.requesterName] || avatarDilan}
                style={styles.detailAvatar}
              />
              <Text style={styles.detailTitle}>{selectedRequest?.typeLabel || 'Xin nghỉ'}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Ngày bắt đầu:</Text>
              <Text style={styles.detailValue}>{selectedRequest?.startDate || selectedRequest?.date}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Ngày kết thúc:</Text>
              <Text style={styles.detailValue}>{selectedRequest?.endDate || selectedRequest?.date}</Text>
            </View>

            <Text style={styles.detailSectionHeading}>Lý do:</Text>
            <View style={styles.detailReasonBox}>
              <Text style={styles.detailReasonText}>{selectedRequest?.description}</Text>
            </View>

            <View style={[
              styles.detailStatusButton,
              selectedRequest?.status === 'APPROVED' && styles.detailStatusButtonApproved,
              selectedRequest?.status === 'REJECTED' && styles.detailStatusButtonRejected,
              selectedRequest?.status === 'PENDING' && styles.detailStatusButtonPending,
            ]}>
              <Text style={[
                styles.detailStatusButtonText,
                selectedRequest?.status === 'APPROVED' && styles.detailStatusButtonTextApproved,
                selectedRequest?.status === 'REJECTED' && styles.detailStatusButtonTextRejected,
                selectedRequest?.status === 'PENDING' && styles.detailStatusButtonTextPending,
              ]}>
                {selectedRequest?.statusText || 'Chờ Duyệt'}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── StyleSheet ──────────────────────────────────────────────────────────────
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },

  // ── Custom Toast ──
  toastOverlay: {
    position: 'absolute',
    top: 20,
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECF9E8',
    borderColor: '#51A33D',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  toastCardWarning: {
    backgroundColor: '#FFFDF5',
    borderColor: '#F59E0B',
  },
  toastCardError: {
    backgroundColor: '#FFF5F5',
    borderColor: '#EF4444',
  },
  toastIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#51A33D',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  toastIconCircleWarning: {
    backgroundColor: '#F59E0B',
  },
  toastIconCircleError: {
    backgroundColor: '#EF4444',
  },
  toastIconText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  toastTextContainer: {
    flex: 1,
  },
  toastTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222222',
  },
  toastMessage: {
    fontSize: 12.5,
    color: '#444444',
    marginTop: 2,
  },

  // ── Header ──
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 40,
  },
  closeBtn: {
    position: 'absolute',
    left: 0,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E1E1E',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000000',
  },
  headerDivider: {
    height: 1.5,
    backgroundColor: 'rgba(240, 236, 236, 0.8)',
    marginVertical: 14,
  },

  // ── Top 3 Filter Cards ──
  filterCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 6,
  },
  filterCard: {
    flex: 1,
    backgroundColor: '#ECF9E8',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingVertical: 10,
    paddingHorizontal: 8,
    height: 64,
  },
  filterCardActive: {
    borderColor: '#51A33D',
    backgroundColor: '#DEF4D7',
  },
  filterCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
  },
  filterCardText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E1E1E',
    lineHeight: 16,
  },
  filterCardIcon: {
    width: 30,
    height: 30,
  },

  // ── 3 Action Buttons (Tạo yêu cầu mới) ──
  actionSectionContainer: {
    marginTop: 10,
    marginBottom: 6,
  },
  actionSectionHeading: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 10,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionCardPill: {
    flex: 1,
    backgroundColor: '#ECF9E8',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(81, 163, 61, 0.2)',
  },
  actionCardPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333333',
    lineHeight: 16,
  },
  actionCardPillIcon: {
    width: 28,
    height: 28,
  },

  // ── Danh sách yêu cầu ──
  requestListHeading: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 10,
  },
  requestList: {
    display: 'flex',
    flexDirection: 'column',
  },
  emptyBox: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13.5,
    color: '#888888',
  },
  requestItemCard: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(240, 236, 236, 0.8)',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  requestItemCardRejected: {
    backgroundColor: 'rgba(242, 240, 240, 0.5)',
    borderRadius: 6,
    paddingHorizontal: 8,
  },
  requestItemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  requestItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E1E1E',
  },
  requestItemDate: {
    fontSize: 12,
    color: '#888888',
  },
  requestItemBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  requestItemDesc: {
    flex: 1,
    fontSize: 12.5,
    color: '#666666',
    lineHeight: 16,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
    minWidth: 76,
    alignItems: 'center',
  },
  statusBadgeApproved: {
    backgroundColor: '#ECF9E8',
  },
  statusBadgeRejected: {
    backgroundColor: '#F5E8D7',
  },
  statusBadgePending: {
    backgroundColor: '#E5E5E5',
  },
  statusBadgeText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#333333',
  },
  statusBadgeTextApproved: {
    color: '#2E7D32',
  },
  statusBadgeTextRejected: {
    color: '#B45309',
  },
  statusBadgeTextPending: {
    color: '#555555',
  },

  // ── Modals Common ──
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 44,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  formValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
    marginTop: 10,
    marginBottom: 6,
  },
  dateInput: {
    fontSize: 15,
    color: '#333333',
    fontWeight: '500',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingVertical: 4,
    minWidth: 100,
    textAlign: 'right',
  },
  reasonTextArea: {
    backgroundColor: 'rgba(236, 249, 232, 0.4)',
    borderWidth: 1.5,
    borderColor: 'rgba(81, 163, 61, 0.7)',
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
    color: '#222222',
    textAlignVertical: 'top',
    minHeight: 120,
    marginBottom: 20,
  },
  submitBtn: {
    backgroundColor: '#ECF9E8',
    borderRadius: 10,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  submitBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E1E1E',
  },

  // ── Shift Selector (Chọn ca của mình) ──
  shiftSelectorHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  shiftSelectorHeaderTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#333333',
  },
  changeShiftBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#ECF9E8',
  },
  changeShiftBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E7D32',
  },
  shiftPickerDropdown: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 6,
    marginBottom: 12,
  },
  shiftPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  shiftPickerItemSelected: {
    backgroundColor: '#ECF9E8',
  },
  shiftPickerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  shiftPickerItemText: {
    flex: 1,
    fontSize: 13,
    color: '#444444',
  },
  shiftPickerItemTextSelected: {
    fontWeight: '700',
    color: '#1E1E1E',
  },
  shiftPickerCheck: {
    fontSize: 14,
    fontWeight: '700',
    color: '#51A33D',
  },

  // ── Shift Preview Box ──
  requesterShiftBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  avatarCol: {
    alignItems: 'center',
    width: 58,
    marginRight: 10,
  },
  avatarImg: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: '#000000',
    marginBottom: 3,
  },
  avatarName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
  },
  shiftCardMini: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniBar: {
    width: 3,
    height: 34,
    borderRadius: 3,
    backgroundColor: '#8DD9CC',
    marginRight: 12,
  },
  miniInfo: {
    flex: 1,
  },
  miniTime: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#222222',
  },
  miniLocation: {
    fontSize: 12,
    color: 'rgba(51, 51, 51, 0.7)',
    marginVertical: 2,
  },
  miniRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  miniRoleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8DD9CC',
  },
  miniRoleText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: 'rgba(51, 51, 51, 0.6)',
  },

  // ── Suggestion list ──
  suggestTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 10,
    marginTop: 12,
  },
  suggestList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginBottom: 16,
  },
  suggestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(240, 236, 236, 0.7)',
  },
  suggestItemSelected: {
    backgroundColor: '#F5F5F5',
  },
  suggestAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  suggestInfo: {
    flex: 1,
  },
  suggestName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222222',
  },
  suggestRole: {
    fontSize: 13,
    color: '#666666',
    marginTop: 2,
  },
  suggestCheckmark: {
    fontSize: 16,
    fontWeight: '700',
    color: '#51A33D',
  },

  // ── Warning Note ──
  warningNoteBox: {
    backgroundColor: '#FFFDF5',
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    padding: 12,
    borderRadius: 6,
    marginBottom: 20,
  },
  warningNoteTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D97706',
    marginBottom: 4,
  },
  warningNoteText: {
    fontSize: 13,
    color: '#555555',
    lineHeight: 18,
  },

  // ── Detail Modal Overlay (Image 5) ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  detailModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    width: '100%',
    maxWidth: 380,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  detailCloseBtn: {
    position: 'absolute',
    right: 14,
    top: 14,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  detailHeaderCenter: {
    alignItems: 'center',
    marginBottom: 16,
  },
  detailAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    borderColor: '#000000',
    marginBottom: 8,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E1E1E',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555555',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222222',
  },
  detailSectionHeading: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555555',
    marginTop: 10,
    marginBottom: 6,
  },
  detailReasonBox: {
    backgroundColor: '#F9FBF8',
    borderWidth: 1,
    borderColor: 'rgba(81, 163, 61, 0.4)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 18,
    minHeight: 60,
  },
  detailReasonText: {
    fontSize: 13.5,
    color: '#333333',
    lineHeight: 18,
  },
  detailStatusButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0E0E0',
  },
  detailStatusButtonApproved: {
    backgroundColor: '#ECF9E8',
  },
  detailStatusButtonRejected: {
    backgroundColor: '#F5E8D7',
  },
  detailStatusButtonPending: {
    backgroundColor: '#E5E5E5',
  },
  detailStatusButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333333',
  },
  detailStatusButtonTextApproved: {
    color: '#2E7D32',
  },
  detailStatusButtonTextRejected: {
    color: '#B45309',
  },
  detailStatusButtonTextPending: {
    color: '#555555',
  },

  // ── Loading ──
  loadingBox: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13.5,
    color: '#888888',
  },
});
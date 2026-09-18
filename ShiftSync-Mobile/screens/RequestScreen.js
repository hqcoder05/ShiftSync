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
import { Ionicons } from '@expo/vector-icons';
import { getMyRequests, createStaffRequest } from '../services/requestService';
import { getMyShifts } from '../services/shiftService';
import { getMyProfile } from '../services/profileService';
import BottomNavbar from '../components/BottomNavbar';

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

const EMPTY_SHIFT = {
  id: 'no-shift',
  dayLabel: 'Chưa có ca',
  timeRange: '—',
  location: 'Cửa hàng được phân công',
  role: 'Nhân viên',
  color: '#8DD9CC',
};

const SUGGESTED_SWAP_STAFF = [
  { name: 'Mew. Ama', role: 'Barista', avatar: avatarMew },
  { name: 'Thia. Ago', role: 'Cashier', avatar: avatarThia },
  { name: 'Paul. Lee', role: 'Cashier', avatar: avatarPaul },
  { name: 'Thia. Ago', role: 'Parking Staff', avatar: avatarThia },
  { name: 'Mew. Ama', role: 'Server', avatar: avatarMew },
];

export default function RequestScreen({ navigation, route }) {
  const [requests, setRequests] = useState([]);
  const [availableShifts, setAvailableShifts] = useState([]);
  const [currentUserName, setCurrentUserName] = useState('');
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
  const [selectedSwapShift, setSelectedSwapShift] = useState(EMPTY_SHIFT);
  const [showShiftPicker, setShowShiftPicker] = useState(false);
  const [selectedSwapStaff, setSelectedSwapStaff] = useState('Mew. Ama');

  // ── Form States (Xin vắng - Image 4) ──
  const [selectedAbsentShift, setSelectedAbsentShift] = useState(EMPTY_SHIFT);
  const [showAbsentShiftPicker, setShowAbsentShiftPicker] = useState(false);
  const [absentReason, setAbsentReason] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Check if opened with an action from ScheduleScreen
    if (route?.params?.action === 'open_swap') {
      if (route.params.shift) {
        setSelectedSwapShift(route.params.shift);
      }
      setSwapModalVisible(true);
    } else if (route?.params?.action === 'open_absent') {
      if (route.params.shift) {
        setSelectedAbsentShift(route.params.shift);
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

  const loadData = async () => {
    try {
      setLoading(true);
      const [reqData, profileRes, shiftsRes] = await Promise.allSettled([
        getMyRequests(),
        getMyProfile(),
        getMyShifts(),
      ]);

      if (reqData.status === 'fulfilled') {
        setRequests(reqData.value || []);
      }

      if (profileRes.status === 'fulfilled' && profileRes.value?.data) {
        setCurrentUserName(profileRes.value.data.fullName || 'Nhân viên');
      }

      if (shiftsRes.status === 'fulfilled' && Array.isArray(shiftsRes.value?.data)) {
        const mapped = shiftsRes.value.data.map((s, idx) => {
          const d = s.shiftDate ? new Date(s.shiftDate) : new Date();
          const dow = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][d.getDay()];
          const dayStr = String(d.getDate()).padStart(2, '0');
          const monthStr = String(d.getMonth() + 1).padStart(2, '0');
          return {
            id: s.id || `shift-${idx}`,
            dayLabel: `${dow} (${dayStr}/${monthStr})`,
            timeRange: `${String(s.startTime).slice(0, 5)} - ${String(s.endTime).slice(0, 5)}`,
            location: s.storeAddress || s.storeName || 'Highlands Tây Thạnh Tân Phú',
            role: s.skillName || s.requiredSkillName || 'Barista',
            color: '#8DD9CC',
          };
        });

        if (mapped.length > 0) {
          setAvailableShifts(mapped);
          setSelectedSwapShift(mapped[0]);
          setSelectedAbsentShift(mapped[0]);
        }
      }
    } catch (e) {
      console.log('Error loading data:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadRequests = loadData;

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
        requesterName: currentUserName || 'Nhân viên',
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
        requesterName: currentUserName || 'Nhân viên',
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
        requesterName: currentUserName || 'Nhân viên',
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
        {/* ── 1. Header (Quản lý yêu cầu) ── */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => navigation?.goBack?.()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quản lý yêu cầu</Text>
        </View>

        <View style={styles.headerDivider} />

        {/* ── 2. Khu vực Tạo Yêu Cầu Mới ── */}
        <View style={styles.actionSectionContainer}>
          <Text style={styles.actionSectionHeading}>Tạo yêu cầu mới</Text>
          <View style={styles.actionButtonsRow}>
            {/* 1. Đổi ca */}
            <TouchableOpacity
              style={styles.actionCardPill}
              onPress={() => setSwapModalVisible(true)}
              activeOpacity={0.8}
            >
              <View style={[styles.actionCardIconWrap, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="swap-horizontal" size={18} color="#0284C7" />
              </View>
              <View style={styles.actionCardTextWrap}>
                <Text style={styles.actionCardPillTitle}>Đổi ca</Text>
                <Text style={styles.actionCardPillSub}>Đổi với bạn</Text>
              </View>
            </TouchableOpacity>

            {/* 2. Xin vắng ca */}
            <TouchableOpacity
              style={styles.actionCardPill}
              onPress={() => setAbsentModalVisible(true)}
              activeOpacity={0.8}
            >
              <View style={[styles.actionCardIconWrap, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="alert-circle-outline" size={18} color="#D97706" />
              </View>
              <View style={styles.actionCardTextWrap}>
                <Text style={styles.actionCardPillTitle}>Xin vắng</Text>
                <Text style={styles.actionCardPillSub}>Vắng ca trực</Text>
              </View>
            </TouchableOpacity>

            {/* 3. Xin nghỉ phép */}
            <TouchableOpacity
              style={styles.actionCardPill}
              onPress={() => setLeaveModalVisible(true)}
              activeOpacity={0.8}
            >
              <View style={[styles.actionCardIconWrap, { backgroundColor: '#F3E8FF' }]}>
                <Ionicons name="calendar-outline" size={18} color="#7C3AED" />
              </View>
              <View style={styles.actionCardTextWrap}>
                <Text style={styles.actionCardPillTitle}>Nghỉ phép</Text>
                <Text style={styles.actionCardPillSub}>Nhiều ngày</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 3. Thanh Lọc Trạng Thái (Segmented Filter Bar) ── */}
        <View style={styles.filterSegmentContainer}>
          <TouchableOpacity
            style={[
              styles.filterSegmentBtn,
              filterStatus === null && styles.filterSegmentBtnActive,
            ]}
            onPress={() => setFilterStatus(null)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterSegmentText,
                filterStatus === null && styles.filterSegmentTextActive,
              ]}
            >
              Tất cả ({requests.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterSegmentBtn,
              filterStatus === 'PENDING' && styles.filterSegmentBtnActive,
            ]}
            onPress={() => handleFilterToggle('PENDING')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterSegmentText,
                filterStatus === 'PENDING' && styles.filterSegmentTextActive,
              ]}
            >
              Chờ duyệt
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterSegmentBtn,
              filterStatus === 'APPROVED' && styles.filterSegmentBtnActive,
            ]}
            onPress={() => handleFilterToggle('APPROVED')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterSegmentText,
                filterStatus === 'APPROVED' && styles.filterSegmentTextActive,
              ]}
            >
              Đã duyệt
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterSegmentBtn,
              filterStatus === 'REJECTED' && styles.filterSegmentBtnActive,
            ]}
            onPress={() => handleFilterToggle('REJECTED')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterSegmentText,
                filterStatus === 'REJECTED' && styles.filterSegmentTextActive,
              ]}
            >
              Từ chối
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── 4. Danh sách Yêu cầu ── */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.requestListHeading}>Lịch sử gửi yêu cầu</Text>
          <Text style={styles.requestListCount}>{filteredRequests.length} yêu cầu</Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#51A33D" />
            <Text style={styles.loadingText}>Đang tải danh sách yêu cầu...</Text>
          </View>
        ) : (
          <View style={styles.requestList}>
            {filteredRequests.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="document-text-outline" size={36} color="#9CA3AF" style={{ marginBottom: 8 }} />
                <Text style={styles.emptyTitle}>Chưa có yêu cầu nào</Text>
                <Text style={styles.emptyText}>
                  {filterStatus
                    ? 'Không có yêu cầu nào khớp với bộ lọc đang chọn.'
                    : 'Nhấn vào các nút phía trên để tạo yêu cầu mới.'}
                </Text>
              </View>
            ) : (
              filteredRequests.map((item) => {
                const isApproved = item.status === 'APPROVED';
                const isRejected = item.status === 'REJECTED';
                const isPending = item.status === 'PENDING' || !item.status;

                const statusLabel = isApproved
                  ? 'Đã duyệt'
                  : isRejected
                  ? 'Từ chối'
                  : 'Chờ duyệt';

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.requestItemCard,
                      isRejected && styles.requestItemCardRejected,
                    ]}
                    onPress={() => {
                      setSelectedRequest(item);
                      setDetailModalVisible(true);
                    }}
                    activeOpacity={0.85}
                  >
                    <View style={styles.requestItemTopRow}>
                      <View style={styles.requestTypeBadge}>
                        <Text style={styles.requestTypeBadgeText}>
                          {item.typeLabel || (item.type === 'SWAP' ? 'Đổi ca' : item.type === 'ABSENT' ? 'Xin vắng' : 'Nghỉ phép')}
                        </Text>
                      </View>
                      <Text style={styles.requestItemDate}>{item.date || item.startDate || ''}</Text>
                    </View>

                    <Text style={styles.requestItemDesc} numberOfLines={2}>
                      {item.description || item.reason || 'Không có mô tả chi tiết'}
                    </Text>

                    <View style={styles.requestItemBottomRow}>
                      <Text style={styles.detailLinkText}>Xem chi tiết ›</Text>

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
                          {statusLabel}
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
                {availableShifts.length === 0 ? (
                  <Text style={{ padding: 12, color: '#7B8490', fontSize: 13, textAlign: 'center' }}>
                    Chưa có ca làm việc được phân công.
                  </Text>
                ) : (
                  availableShifts.map((shift) => {
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
                  })
                )}
              </View>
            )}

            {/* Preview Thẻ Ca đã chọn */}
            <View style={styles.requesterShiftBox}>
              <View style={styles.avatarCol}>
                <Image source={avatarDilan} style={styles.avatarImg} />
                <Text style={styles.avatarName}>{currentUserName || 'Nhân viên'}</Text>
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
                {availableShifts.length === 0 ? (
                  <Text style={{ padding: 12, color: '#7B8490', fontSize: 13, textAlign: 'center' }}>
                    Chưa có ca làm việc được phân công.
                  </Text>
                ) : (
                  availableShifts.map((shift) => {
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
                  })
                )}
              </View>
            )}

            {/* Requester & Shift Preview */}
            <View style={styles.requesterShiftBox}>
              <View style={styles.avatarCol}>
                <Image source={avatarDilan} style={styles.avatarImg} />
                <Text style={styles.avatarName}>{currentUserName || 'Nhân viên'}</Text>
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
      <BottomNavbar navigation={navigation} activeRoute="Request" />
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
    paddingBottom: 95,
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
    fontWeight: '700',
    color: '#1E1E1E',
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },

  // ── 3 Action Buttons (Tạo yêu cầu mới) ──
  actionSectionContainer: {
    marginTop: 4,
    marginBottom: 14,
  },
  actionSectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionCardPill: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  actionCardIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCardIconEmoji: {
    fontSize: 16,
  },
  actionCardTextWrap: {
    flex: 1,
  },
  actionCardPillTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  actionCardPillSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },

  // ── Segmented Filter Bar ──
  filterSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
  },
  filterSegmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  filterSegmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterSegmentText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterSegmentTextActive: {
    color: '#111827',
    fontWeight: '700',
  },

  // ── Danh sách yêu cầu ──
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  requestListHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  requestListCount: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  requestList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  emptyBox: {
    paddingVertical: 36,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  requestItemCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
  },
  requestItemCardRejected: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  requestItemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  requestTypeBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  requestTypeBadgeText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1F2937',
  },
  requestItemDate: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  requestItemDesc: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 8,
  },
  requestItemBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 8,
  },
  detailLinkText: {
    fontSize: 12.5,
    color: '#2563EB',
    fontWeight: '600',
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
import { colors as uiColors } from '../theme/koreanPalette';
import { createAppStyles } from '../theme/appTheme';
import { ensureTouchTarget } from '../utils/touchTarget';
import { useCallback, useEffect, useState, useRef } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import BottomNavbar, { useBottomNavbarPadding } from '../components/BottomNavbar';
import UserAvatar from '../components/UserAvatar';
import { validatePersonalInfo } from '../utils/profileValidation';
import { savePersonalDraft } from '../services/profileDrafts';
import { clearShiftReminders } from '../services/localReminders';
import { publishUnreadCount } from '../services/notificationService';
import { resetMessagingUnread } from '../services/messagingService';
import { AVATAR_OPTIONS } from '../components/avatarConfigs';
import { getMyProfile, getMyStores } from '../services/profileService';
import { runApiSessionChange } from '../services/api';
import { logout as logoutApi } from '../services/authService';
import { getStoredAvatar, resolveProfileAvatar, saveAvatar } from '../services/avatarSync';
import { formatDateDMY } from '../utils/currency';
import useResumeRefresh from '../utils/useResumeRefresh';

const INITIAL_PROFILE = {
  fullName: '',
  storeName: '',
  staffCode: '',
  position: '',
  storeAddress: '',
  birthDate: '',
  birthPlace: '',
  phone: '',
  gender: '',
  email: '',
};

function EditableRow({ label, value, onChangeText, placeholder, keyboardType, last, secureTextEntry, editable = true }) {
  return (
    <View style={[styles.row, last && styles.lastRow]}>
      <Text style={styles.rowLabel}>{label}</Text>
      {editable ? (
        <TextInput
          style={styles.rowInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder || `Nhập ${label.toLowerCase()}...`}
          placeholderTextColor={uiColors.muted}
          keyboardType={keyboardType || 'default'}
          secureTextEntry={secureTextEntry}
          textAlign="right"
        />
      ) : (
        <Text style={styles.rowStaticValue}>{value || '—'}</Text>
      )}
    </View>
  );
}

export default function ProfileScreen({ navigation }) {
  useResumeRefresh(navigation, () => loadProfile(false));
  const bottomNavbarPadding = useBottomNavbarPadding();
  const [profile, setProfile] = useState(INITIAL_PROFILE);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [selectedAvatarId, setSelectedAvatarId] = useState('dilan');
  const [previewAvatarId, setPreviewAvatarId] = useState('dilan');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(true);
  const [motionPreferenceReady, setMotionPreferenceReady] = useState(false);
  const entrance = useRef(new Animated.Value(1)).current;
  const hasEntered = useRef(false);
  const lastSavedDraft = useRef('');
  const savingDraft = useRef(Promise.resolve());
  const draftRevision = useRef(0);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) { setReduceMotion(value); setMotionPreferenceReady(true); }
    }).catch(() => { if (active) setMotionPreferenceReady(true); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      setReduceMotion(value);
      if (value) { entrance.stopAnimation(); entrance.setValue(1); }
    });
    return () => { active = false; subscription.remove(); entrance.stopAnimation(); };
  }, [entrance]);
  useEffect(() => {
    if (loading || !motionPreferenceReady || hasEntered.current) return;
    hasEntered.current = true;
    if (reduceMotion) { entrance.setValue(1); return; }
    entrance.setValue(0);
    Animated.timing(entrance, { toValue: 1, duration: 380, useNativeDriver: true }).start();
  }, [loading, motionPreferenceReady, reduceMotion, entrance]);
  const [editForm, setEditForm] = useState({
    birthDate: '',
    birthPlace: '',
    phone: '',
    gender: '',
  });

  const handleSelectAvatar = async (avatarId) => {
    setSelectedAvatarId(avatarId);
    setShowAvatarPicker(false);
    setSaveStatus('Đang lưu...');
    // Đồng bộ tức thời vào local cache + background API
    const ok = await saveAvatar(avatarId, currentUserId);
    setSaveStatus(ok ? 'Đã đồng bộ' : 'Đã lưu');
    setTimeout(() => setSaveStatus(''), 2000);
  };

  // Load custom profile from Backend API & user-specific AsyncStorage
  const loadProfile = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    // 0. Nạp avatar từ local cache trước để hiển thị tức thì
    const cachedAvatar = await getStoredAvatar(currentUserId);
    setSelectedAvatarId(cachedAvatar);

    try {
      // 1. Fetch real user from Backend API
      const { data: apiUser } = await getMyProfile();
      if (apiUser) {
        const userId = apiUser.id;
        setCurrentUserId(userId);

        setSelectedAvatarId(await resolveProfileAvatar(apiUser));

        // 3. Load custom data specifically for this user
        const userStorageKey = `@user_profile_custom_${userId}`;
        const savedData = await AsyncStorage.getItem(userStorageKey);
        let customData = {};
        if (savedData) {
          try {
            customData = JSON.parse(savedData) || {};
          } catch (e) {
            customData = {};
          }
        }

        // 4. Fetch store & position (vị trí phân công thực tế từ web)
        let storeName = 'Chưa phân công chi nhánh';
        let storeAddress = 'Chưa có địa chỉ';
        let position = 'Chưa phân công vị trí';

        try {
          const { data: stores } = await getMyStores(userId);
          const storeList = Array.isArray(stores) ? stores : (stores?.content || []);
          const activeStore = storeList.find((s) => s.status === 'ACTIVE') || storeList[0];
          if (activeStore) {
            storeName = activeStore.storeName || activeStore.name || storeName;
            storeAddress = activeStore.storeAddress || activeStore.address || storeAddress;
            if (activeStore.skillName) {
              position = activeStore.skillName;
            } else if (activeStore.employmentType) {
              const typeMap = {
                FULL_TIME: 'Toàn thời gian',
                PART_TIME: 'Bán thời gian',
                SEASONAL: 'Thời vụ',
                INTERN: 'Thực tập',
              };
              position = typeMap[activeStore.employmentType] || activeStore.employmentType;
            }
          }
        } catch (stErr) {
          console.log('Error fetching user stores:', stErr?.message);
        }

        setProfile({
          fullName: apiUser.fullName || '',
          email: apiUser.email || '',
          phone: customData.pendingPhone ? customData.phone || '' : ('phone' in apiUser ? apiUser.phone || '' : customData.phone || ''),
          staffCode: userId ? `NV-${String(userId).slice(0, 6).toUpperCase()}` : '',
          storeName,
          storeAddress,
          position,
          birthDate: customData.pendingPersonalInfo || !('birthDate' in apiUser) ? customData.birthDate || '' : apiUser.birthDate || '',
          birthPlace: customData.pendingPersonalInfo || !('birthPlace' in apiUser) ? customData.birthPlace || '' : apiUser.birthPlace || '',
          gender: customData.pendingPersonalInfo || !('gender' in apiUser) ? customData.gender || '' : ({ MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' }[apiUser.gender] || apiUser.gender || ''),
        });
      }
    } catch (apiErr) {
      console.log('Backend offline or failed to fetch profile:', apiErr?.message);
      // Giữ nguyên avatar đã lưu trong local storage, tuyệt đối không reset về 'dilan'
      const fallbackAvatar = await getStoredAvatar(currentUserId);
      setSelectedAvatarId(fallbackAvatar);
      setProfile(INITIAL_PROFILE);
    } finally {
      // Clear legacy shared key if still exists to prevent ghost data leakage
      AsyncStorage.removeItem('@user_profile_custom_data').catch(() => {});
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    // Đọc avatar từ local cache ngay khi component mount
    getStoredAvatar().then((av) => {
      if (av) setSelectedAvatarId(av);
    });
    loadProfile();
  }, [loadProfile]);

  useEffect(() => navigation.addListener('focus', () => loadProfile(false)), [navigation, loadProfile]);

  const personalErrors = validatePersonalInfo(editForm);
  const saveDraft = (close = false) => {
    if (Object.keys(validatePersonalInfo(editForm)).length) { setSaveStatus('Kiểm tra thông tin'); return; }
    const snapshot = { ...editForm };
    const signature = JSON.stringify(snapshot);
    if (signature === lastSavedDraft.current) { if (close) setShowEditModal(false); return; }
    lastSavedDraft.current = signature;
    const revision = ++draftRevision.current;
    setSaveStatus('Đang lưu...');
    // Persist each debounced edit immediately; the service serializes writes and drains newer drafts.
    savingDraft.current = (async () => {
      try {
        const synced = await savePersonalDraft(currentUserId, snapshot);
        if (!mounted.current || revision !== draftRevision.current) return;
        setProfile((prev) => ({ ...prev, ...snapshot }));
        setSaveStatus(synced ? 'Đã lưu' : 'Đã lưu trên máy');
      } catch { if (mounted.current && revision === draftRevision.current) { lastSavedDraft.current = ''; setSaveStatus('Chưa lưu được'); } }
    })();
    if (close) setShowEditModal(false);
  };
  const handleSavePersonalInfo = () => saveDraft(true);
  const closeEditor = () => {
    if (Object.keys(validatePersonalInfo(editForm)).length) setShowEditModal(false);
    else saveDraft(true);
  };
  useEffect(() => {
    if (!showEditModal || !currentUserId || Object.keys(personalErrors).length) return;
    const signature = JSON.stringify(editForm);
    if (signature === lastSavedDraft.current) return;
    const timer = setTimeout(() => saveDraft(false), 500);
    return () => clearTimeout(timer);
  }, [editForm, showEditModal, currentUserId]);

  const handleLogout = async () => {
    if (loggingOut) return;

    const performLogout = async () => {
      setLoggingOut(true);
      await clearShiftReminders().catch(() => {});
      publishUnreadCount(0);
      resetMessagingUnread();
      const storageKeys = [
        'accessToken',
        'refreshToken',
        'userRole',
        'userEmail',
        '@user_profile_custom_data',
        '@user_profile_avatar',
      ];


      try {
        const storedRefreshToken = await AsyncStorage.getItem('refreshToken');
        if (storedRefreshToken) {
          await logoutApi(storedRefreshToken).catch(() => {});
        }
      } catch (_) {}

      try {
        await runApiSessionChange(() => AsyncStorage.multiRemove(storageKeys));
      } catch (e) {
        // ignore
      } finally {
        setLoggingOut(false);
      }

      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    };

    if (Platform.OS === 'web') {
      await performLogout();
      return;
    }

    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: performLogout },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      {/* Header */}
      <View style={styles.header}>
        <Pressable accessibilityRole="button"
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('MainTabs', { screen: 'Dashboard' });
            }
          }}
          hitSlop={15}
          style={ensureTouchTarget(styles.closeBtn)}
          accessibilityLabel="Đóng hồ sơ"
        >
          <Ionicons name="chevron-back" size={23} color={uiColors.ink} />
        </Pressable>
        <Text style={styles.title}>Hồ sơ</Text>
        <View style={styles.saveStatusWrap}>
          {saveStatus ? <Text style={styles.saveStatusText}>{saveStatus}</Text> : <View style={{ width: 40 }} />}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={uiColors.primaryStrong} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomNavbarPadding }]} showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
          <View style={styles.identityCard}>
            <View style={styles.portraitBanner}>
              <View pointerEvents="box-none" style={styles.bannerTopline}>
                <Text style={styles.bannerCaption}>Ảnh đại diện</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Đổi ảnh đại diện"
                  accessibilityHint="Mở bộ sưu tập nhân vật để chọn ảnh cho hồ sơ"
                  onPress={() => {
                    setPreviewAvatarId(selectedAvatarId || 'dilan');
                    setShowAvatarPicker(true);
                  }}
                  style={ensureTouchTarget(({ pressed }) => [styles.avatarEditBadge, pressed && styles.actionPressed])}
                >
                  <Ionicons name="pencil-outline" size={18} color={uiColors.ink} />
                </Pressable>
              </View>
              <View style={styles.bannerPortraitWrap}>
                <UserAvatar avatarId={selectedAvatarId} framing="full" size={230} style={styles.bannerAvatar} />
              </View>
            </View>
            <View style={styles.identityContent}>
              <Text style={styles.nameDisplay}>{profile.fullName || 'Nhân viên'}</Text>
              <Text style={styles.identityStore}>{profile.storeName || 'Chưa phân công chi nhánh'}</Text>
              <Text style={styles.positionSubtitle}>{profile.position || 'Chưa phân công vị trí'}</Text>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}><Ionicons name="briefcase-outline" size={19} color={uiColors.secondary} /></View>
              <View style={styles.sectionHeadingCopy}>
                <Text style={styles.sectionTitle}>Công việc</Text>
                <Text style={styles.sectionSubtitle}>Thông tin tại chi nhánh</Text>
              </View>
            </View>
            {[
              ['Mã nhân viên', profile.staffCode],
              ['Chi nhánh', profile.storeName],
              ['Địa chỉ', profile.storeAddress],
            ].map(([label, value], index) => (
              <View key={label} style={[styles.inlineWorkRow, index === 2 && styles.lastRow]}>
                <Text style={styles.workLabel}>{label}</Text>
                <Text style={styles.inlineWorkValue}>{value || '—'}</Text>
              </View>
            ))}
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}><Ionicons name="person-outline" size={19} color={uiColors.secondary} /></View>
              <View style={styles.sectionHeadingCopy}>
                <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Chỉnh sửa thông tin cá nhân" style={ensureTouchTarget(({ pressed }) => [styles.editProfileBtn, pressed && styles.actionPressed])} onPress={() => {
              const initialForm = {
                birthDate: profile.birthDate || '',
                birthPlace: profile.birthPlace || '',
                phone: profile.phone || '',
                gender: profile.gender || '',
              };
              lastSavedDraft.current = JSON.stringify(initialForm);
              setEditForm(initialForm);
              setShowEditModal(true);
              }}>
                <Ionicons name="pencil-outline" size={14} color={uiColors.primaryStrong} />
                <Text style={styles.editProfileText}>Chỉnh sửa</Text>
              </Pressable>
            </View>
            <EditableRow label="Ngày sinh" value={/^\d{4}-\d{2}-\d{2}$/.test(profile.birthDate) ? formatDateDMY(profile.birthDate) : profile.birthDate} editable={false} />
            <EditableRow label="Nơi sinh" value={profile.birthPlace} editable={false} />
            <EditableRow label="Điện thoại" value={profile.phone} editable={false} />
            <EditableRow label="Giới tính" value={profile.gender} editable={false} last />
          </View>

          {/* ═══ THÔNG TIN ĐĂNG NHẬP (Group 138) ═══ */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}><Ionicons name="shield-checkmark-outline" size={19} color={uiColors.secondary} /></View>
              <View style={styles.sectionHeadingCopy}>
                <Text style={styles.sectionTitle}>Thông tin đăng nhập</Text>
              </View>
            </View>
            <EditableRow
              label="Email"
              value={profile.email}
              editable={false}
              placeholder="Chưa cập nhật email"
              keyboardType="email-address"
            />
            <EditableRow
              label="Mật khẩu"
              value="••••••••••••••••"
              editable={false}
              last
            />
          </View>

          {/* ═══ ĐĂNG XUẤT (Group 139) ═══ */}
          <Pressable accessibilityRole="button"
            onPress={handleLogout}
            disabled={loggingOut}
            style={ensureTouchTarget(({ pressed }) => [styles.logoutBtn, loggingOut && styles.logoutBtnDisabled, pressed && styles.actionPressed])}
          >
            <View style={styles.logoutLabel}>
              {loggingOut ? <ActivityIndicator size="small" color={uiColors.dangerText} /> : <Ionicons name="log-out-outline" size={20} color={uiColors.dangerText} />}
              <Text style={styles.logoutText}>Đăng xuất</Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color={uiColors.dangerText} />
          </Pressable>
          </Animated.View>
        </ScrollView>
      )}
      {/* ═══ MODAL CHỌN ẢNH ĐẠI DIỆN 3D ═══ */}
      <Modal
        visible={showAvatarPicker}
        transparent
        animationType={reduceMotion ? 'none' : 'slide'}
        onRequestClose={() => setShowAvatarPicker(false)}
      >
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerSheet}>
            {/* Header */}
            <View style={styles.pickerHeaderRow}>
              <View style={styles.pickerHeadingCopy}>
                <Text style={styles.pickerTitle}>Ảnh đại diện</Text>
                <Text style={styles.pickerSubtitle}>Chọn nhân vật của bạn</Text>
              </View>
              <TouchableOpacity accessibilityLabel="Đóng chọn ảnh đại diện" accessibilityRole="button"
                onPress={() => setShowAvatarPicker(false)}
                hitSlop={12}
                style={ensureTouchTarget(styles.pickerCloseCircle)}
              >
                <Ionicons name="close" size={21} color={uiColors.secondary} />
              </TouchableOpacity>
            </View>

            {(() => {
              const isCurrent = selectedAvatarId === previewAvatarId;
              const preview = AVATAR_OPTIONS.find((item) => item.id === previewAvatarId) || AVATAR_OPTIONS[0];
              return (
                <>
                  <View style={styles.spotlightCard}>
                    <View style={styles.avatarPreviewWrap}>
                      <UserAvatar avatarId={preview.id} framing="full" size={150} style={styles.spotlightPortrait} />
                      {isCurrent && <View style={styles.spotlightUsingTag}><Text style={styles.spotlightUsingText}>✓ Đang dùng</Text></View>}
                    </View>
                    <Text style={styles.spotlightName}>{preview.label}</Text>
                    <Text style={styles.spotlightHint} numberOfLines={2}>{preview.description}</Text>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`Dùng ảnh đại diện ${preview.label}`}
                      disabled={isCurrent}
                      style={ensureTouchTarget([styles.spotlightSelectBtn, isCurrent && styles.spotlightSelectBtnActive])}
                      onPress={() => handleSelectAvatar(previewAvatarId)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.spotlightSelectBtnText, isCurrent && styles.spotlightSelectBtnTextActive]}>
                        {isCurrent ? 'Ảnh đại diện hiện tại' : 'Dùng ảnh đại diện này'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.pickerGridHeading}>
                    <Text style={styles.pickerGridTitle}>Chọn phong cách của bạn</Text>
                    <Text style={styles.pickerGridCount}>{AVATAR_OPTIONS.length} nhân vật</Text>
                  </View>
                  <FlatList
                    data={AVATAR_OPTIONS}
                    keyExtractor={(item) => item.id}
                    extraData={`${previewAvatarId}:${selectedAvatarId}`}
                    numColumns={3}
                    columnWrapperStyle={styles.pickerGridRow}
                    showsVerticalScrollIndicator={false}
                    style={styles.pickerList}
                    contentContainerStyle={styles.pickerGridContent}
                    initialNumToRender={9}
                    windowSize={3}
                    renderItem={({ item }) => {
                      const isPreviewing = previewAvatarId === item.id;
                      const isSelected = selectedAvatarId === item.id;
                      return (
                        <TouchableOpacity
                          accessibilityRole="radio"
                          accessibilityLabel={`Ảnh đại diện ${item.label}${isSelected ? ', đang sử dụng' : ''}`}
                          accessibilityState={{ selected: isPreviewing }} aria-selected={isPreviewing}
                          style={ensureTouchTarget([styles.pickerCard, isPreviewing && styles.pickerCardPreviewing])}
                          onPress={() => setPreviewAvatarId(item.id)}
                          activeOpacity={0.7}
                        >
                          {isSelected && <View style={styles.pickerCardCheck}><Text style={styles.pickerCardCheckText}>✓</Text></View>}
                          <UserAvatar animated={false} avatarId={item.id} framing="full" size={78} style={styles.pickerPortrait} />
                          <Text numberOfLines={2} style={[styles.pickerCardName, isPreviewing && styles.pickerCardNameActive]}>{item.label}</Text>
                        </TouchableOpacity>
                      );
                    }}
                  />
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* ═══ MODAL CHỈNH SỬA THÔNG TIN CÁ NHÂN (MẶT SAU THẺ 3D) ═══ */}
      <Modal
        visible={showEditModal}
        transparent
        animationType={reduceMotion ? 'none' : 'fade'}
        onRequestClose={closeEditor}
      >
        <View style={styles.editModalOverlay}>
          <View style={styles.editInfoSheet}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeadingCopy}>
                <Text style={styles.editModalTitle}>Chỉnh sửa thông tin cá nhân</Text>
                <Text style={styles.editModalSubtitle}>Cập nhật thông tin cá nhân của bạn</Text>
              </View>
              <TouchableOpacity accessibilityLabel="Đóng chỉnh sửa thông tin" accessibilityRole="button"
                onPress={closeEditor}
                hitSlop={12}
                style={ensureTouchTarget(styles.modalCloseBtn)}
              >
                <Ionicons name="close" size={21} color={uiColors.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalFormContent}>
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Ngày sinh</Text>
                <TextInput
                  style={styles.modalTextInput}
                  value={editForm.birthDate}
                  onChangeText={(text) => setEditForm((prev) => ({ ...prev, birthDate: text }))}
                  placeholder="VD: 15/08/1998"
                  placeholderTextColor={uiColors.muted}
                />
                {personalErrors.birthDate && <Text style={{ color: uiColors.dangerText, fontSize: 12, marginTop: 5 }}>{personalErrors.birthDate}</Text>}
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Nơi sinh</Text>
                <TextInput
                  style={styles.modalTextInput}
                  value={editForm.birthPlace}
                  maxLength={160}
                  onChangeText={(text) => setEditForm((prev) => ({ ...prev, birthPlace: text }))}
                  placeholder="VD: TP. Hồ Chí Minh"
                  placeholderTextColor={uiColors.muted}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Số điện thoại</Text>
                <TextInput
                  style={styles.modalTextInput}
                  value={editForm.phone}
                  onChangeText={(text) => setEditForm((prev) => ({ ...prev, phone: text }))}
                  placeholder="VD: 0912 345 678"
                  placeholderTextColor={uiColors.muted}
                  keyboardType="phone-pad"
                />
                {personalErrors.phone && <Text style={{ color: uiColors.dangerText, fontSize: 12, marginTop: 5 }}>{personalErrors.phone}</Text>}
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Giới tính</Text>
                <View style={styles.genderPillsRow}>
                  {['Nam', 'Nữ', 'Khác'].map((g) => {
                    const isSelected = editForm.gender === g;
                    return (
                      <TouchableOpacity accessibilityRole="button"
                        key={g}
                        style={ensureTouchTarget([styles.genderPill, isSelected && styles.genderPillActive])}
                        onPress={() => setEditForm((prev) => ({ ...prev, gender: g }))}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.genderPillText, isSelected && styles.genderPillTextActive]}>
                          {g}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <TouchableOpacity accessibilityRole="button"
                style={ensureTouchTarget(styles.modalSaveBtn)}
                onPress={handleSavePersonalInfo}
                activeOpacity={0.8}
              >
                <Text style={styles.modalSaveBtnText}>Lưu thay đổi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <BottomNavbar navigation={navigation} activeRoute="Profile" />
    </SafeAreaView>
  );
}

const styles = createAppStyles({
  safe: { flex: 1, backgroundColor: uiColors.canvas },
  content: { paddingTop: 16 },
  header: { height: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: uiColors.surface, borderBottomWidth: 1, borderBottomColor: uiColors.line },
  closeBtn: { marginLeft: -6, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '600', color: uiColors.ink },
  saveStatusWrap: { minWidth: 40, maxWidth: 100, alignItems: 'flex-end' },
  saveStatusText: { fontSize: 11, textAlign: 'right', color: uiColors.successText, fontWeight: '500' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  identityCard: { marginHorizontal: 16, marginBottom: 14, padding: 12, borderRadius: 20, backgroundColor: uiColors.surface },
  portraitBanner: { height: 244, borderRadius: 14, backgroundColor: uiColors.peach, overflow: 'hidden', position: 'relative' },
  bannerTopline: { position: 'absolute', top: 10, left: 14, right: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 },
  bannerCaption: { fontSize: 12, lineHeight: 18, fontWeight: '500', color: uiColors.secondary },
  bannerPortraitWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bannerAvatar: { borderRadius: 0, backgroundColor: 'transparent' },
  avatarEditBadge: { width: 48, height: 48, borderRadius: 12, backgroundColor: uiColors.surface, alignItems: 'center', justifyContent: 'center' },
  identityContent: { minWidth: 0, paddingHorizontal: 6, paddingTop: 18, paddingBottom: 8 },
  nameDisplay: { minWidth: 0, fontSize: 23, lineHeight: 31, fontWeight: '700', letterSpacing: -0.5, color: uiColors.ink },
  identityStore: { color: uiColors.secondary, fontSize: 13, lineHeight: 20, marginTop: 6 },
  positionSubtitle: { color: uiColors.muted, fontSize: 12, lineHeight: 19, marginTop: 3 },
  sectionCard: { marginHorizontal: 16, marginBottom: 14, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 5, backgroundColor: uiColors.surface, borderRadius: 18 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5, minHeight: 40 },
  sectionIcon: { width: 24, height: 28, alignItems: 'center', justifyContent: 'center' },
  sectionHeadingCopy: { flex: 1, minWidth: 0 },
  sectionTitle: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: uiColors.ink },
  sectionSubtitle: { fontSize: 11, lineHeight: 17, color: uiColors.muted, marginTop: 1 },
  inlineWorkRow: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 49, paddingVertical: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: uiColors.line },
  workLabel: { width: 83, flexShrink: 0, fontSize: 12, lineHeight: 20, color: uiColors.muted },
  inlineWorkValue: { flex: 1, minWidth: 0, fontSize: 13, lineHeight: 20, color: uiColors.ink, fontWeight: '500' },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: uiColors.line },
  lastRow: { borderBottomWidth: 0 },
  rowLabel: { width: 83, fontSize: 12, lineHeight: 20, color: uiColors.muted },
  rowInput: { flex: 1, minWidth: 0, fontSize: 14, color: uiColors.ink, paddingVertical: 4, paddingHorizontal: 8 },
  rowStaticValue: { flex: 1, minWidth: 0, textAlign: 'right', fontSize: 13, lineHeight: 20, color: uiColors.ink, fontWeight: '500' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 2, marginBottom: 20, paddingVertical: 16, paddingHorizontal: 18, borderRadius: 18, backgroundColor: uiColors.surface },
  logoutLabel: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoutBtnDisabled: { opacity: 0.55 },
  logoutText: { fontSize: 14, color: uiColors.dangerText, fontWeight: '500' },
  actionPressed: { opacity: 0.65 },
  editProfileBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginRight: -5 },
  editProfileText: { fontSize: 11, fontWeight: '600', color: uiColors.primaryStrong },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(25, 31, 40, 0.38)', justifyContent: 'center', alignItems: 'center', padding: 12 },
  pickerSheet: { width: '100%', maxWidth: 430, height: '92%', maxHeight: 820, backgroundColor: uiColors.surface, borderRadius: 24, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 12, overflow: 'hidden' },
  pickerHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 14 },
  pickerHeadingCopy: { flex: 1, minWidth: 0 },
  pickerTitle: { fontSize: 20, fontWeight: '700', color: uiColors.ink },
  pickerSubtitle: { fontSize: 12, lineHeight: 18, color: uiColors.muted, marginTop: 4 },
  pickerCloseCircle: { width: 32, height: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  spotlightCard: { alignItems: 'center', backgroundColor: uiColors.canvas, borderRadius: 16, padding: 12, marginBottom: 16 },
  avatarPreviewWrap: { width: 156, height: 152, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  spotlightPortrait: { borderRadius: 0, backgroundColor: 'transparent' },
  spotlightUsingTag: { position: 'absolute', bottom: 0, backgroundColor: uiColors.surface, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  spotlightUsingText: { fontSize: 10, color: uiColors.primaryStrong, fontWeight: '600' },
  spotlightName: { fontSize: 18, lineHeight: 24, fontWeight: '700', color: uiColors.ink },
  spotlightHint: { fontSize: 11, color: uiColors.muted, marginTop: 3, textAlign: 'center', lineHeight: 16 },
  spotlightSelectBtn: { width: '100%', minHeight: 44, borderRadius: 11, backgroundColor: uiColors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  spotlightSelectBtnActive: { backgroundColor: uiColors.line },
  spotlightSelectBtnText: { color: uiColors.white, fontSize: 13, fontWeight: '600' },
  spotlightSelectBtnTextActive: { color: uiColors.secondary },
  pickerGridHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 12 },
  pickerGridTitle: { fontSize: 13, fontWeight: '600', color: uiColors.ink, flexShrink: 1 },
  pickerGridCount: { fontSize: 11, color: uiColors.muted },
  pickerList: { flex: 1, minHeight: 80 },
  pickerGridContent: { paddingBottom: 8 },
  pickerGridRow: { justifyContent: 'space-between', marginBottom: 9 },
  pickerCard: { width: '31.5%', minHeight: 112, borderRadius: 12, borderWidth: 1.5, borderColor: 'transparent', backgroundColor: uiColors.canvas, alignItems: 'center', justifyContent: 'center', position: 'relative', paddingTop: 5, paddingBottom: 8 },
  pickerCardPreviewing: { borderColor: uiColors.primary, backgroundColor: uiColors.peach },
  pickerPortrait: { borderRadius: 0, backgroundColor: 'transparent' },
  pickerCardName: { fontSize: 10.5, lineHeight: 14, fontWeight: '500', textAlign: 'center', color: uiColors.secondary, marginTop: 3, paddingHorizontal: 3 },
  pickerCardNameActive: { color: uiColors.primaryStrong, fontWeight: '700' },
  pickerCardCheck: { position: 'absolute', top: 5, right: 5, backgroundColor: uiColors.primary, borderRadius: 8, width: 16, height: 16, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  pickerCardCheckText: { color: uiColors.white, fontSize: 10, fontWeight: 'bold' },
  editModalOverlay: { flex: 1, backgroundColor: 'rgba(25, 31, 40, 0.38)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  editInfoSheet: { width: '100%', maxWidth: 440, backgroundColor: uiColors.surface, borderRadius: 20, padding: 20 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 16 },
  modalHeadingCopy: { flex: 1, minWidth: 0 },
  editModalTitle: { fontSize: 17, lineHeight: 24, fontWeight: '700', color: uiColors.ink },
  editModalSubtitle: { fontSize: 12, lineHeight: 18, color: uiColors.muted, marginTop: 2 },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalFormContent: { gap: 14 },
  modalInputGroup: { gap: 6 },
  modalInputLabel: { fontSize: 13, fontWeight: '600', color: uiColors.secondary },
  modalTextInput: { height: 46, borderWidth: 1, borderColor: uiColors.lineStrong, borderRadius: 11, paddingHorizontal: 14, fontSize: 14, color: uiColors.ink, backgroundColor: uiColors.surface },
  genderPillsRow: { flexDirection: 'row', gap: 10 },
  genderPill: { flex: 1, height: 40, borderRadius: 10, borderWidth: 1, borderColor: uiColors.lineStrong, backgroundColor: uiColors.surface, alignItems: 'center', justifyContent: 'center' },
  genderPillActive: { borderColor: uiColors.primary, backgroundColor: uiColors.peach },
  genderPillText: { fontSize: 13, fontWeight: '500', color: uiColors.secondary },
  genderPillTextActive: { color: uiColors.primaryStrong, fontWeight: '600' },
  modalSaveBtn: { height: 46, backgroundColor: uiColors.primary, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  modalSaveBtnText: { fontSize: 15, fontWeight: '600', color: uiColors.white },
});

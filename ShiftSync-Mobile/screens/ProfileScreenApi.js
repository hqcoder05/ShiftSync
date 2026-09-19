import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import BottomNavbar from '../components/BottomNavbar';
import Avatar3D from '../components/Avatar3D';
import { AVATAR_OPTIONS, getAvatar3DProps } from '../components/avatarConfigs';
import { getAllAvatarThumbnails } from '../components/avatarThumbnails';
import { getMyProfile, getMyStores, updateMyProfile } from '../services/profileService';
import { getStoredAvatar, saveAvatar } from '../services/avatarSync';

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

function ProfileRow({ label, value, placeholder, isReadOnly = true, last }) {
  return (
    <View style={[styles.row, last && styles.lastRow]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowValueContainer}>
        <Text style={[styles.rowStaticValue, !value && styles.placeholderValue]}>
          {value || placeholder || '—'}
        </Text>
        {isReadOnly && <Text style={styles.readOnlyBadge}>Cố định</Text>}
      </View>
    </View>
  );
}

function EditableRowInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  last,
  error,
  required,
}) {
  return (
    <View style={[styles.editRowBlock, last && styles.lastRowBlock]}>
      <View style={styles.editRowHeader}>
        <Text style={styles.editRowLabel}>
          {label} {required && <Text style={styles.requiredStar}>*</Text>}
        </Text>
        {error ? <Text style={styles.fieldErrorText}>{error}</Text> : null}
      </View>
      <TextInput
        style={[styles.editInput, error && styles.editInputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || `Nhập ${label.toLowerCase()}...`}
        placeholderTextColor="#9E9E9E"
        keyboardType={keyboardType}
        autoCapitalize="none"
      />
    </View>
  );
}

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(INITIAL_PROFILE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState('');
  const [selectedAvatarId, setSelectedAvatarId] = useState('dilan');
  const [previewAvatarId, setPreviewAvatarId] = useState('dilan');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    birthDate: '',
    birthPlace: '',
    gender: '',
  });
  const [validationErrors, setValidationErrors] = useState({});

  const handleSelectAvatar = async (avatarId) => {
    setSelectedAvatarId(avatarId);
    setShowAvatarPicker(false);
    setSaveStatus('Đang lưu avatar...');
    const ok = await saveAvatar(avatarId, currentUserId);
    setSaveStatus(ok ? 'Đã đổi avatar' : 'Đã lưu');
    setTimeout(() => setSaveStatus(''), 2500);
  };

  // Load profile from Backend API & user-specific AsyncStorage
  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch real authenticated user profile from Backend
      const { data: apiUser } = await getMyProfile();
      if (!apiUser) {
        throw new Error('Không nhận được dữ liệu từ máy chủ.');
      }

      const userId = apiUser.id;
      setCurrentUserId(userId);

      // 2. Load avatar
      if (apiUser.avatarId && AVATAR_OPTIONS.some((a) => a.id === apiUser.avatarId)) {
        setSelectedAvatarId(apiUser.avatarId);
        await AsyncStorage.setItem('@user_profile_avatar', apiUser.avatarId);
        await AsyncStorage.setItem(`@user_profile_avatar_${userId}`, apiUser.avatarId);
      } else {
        const savedAvatar = await getStoredAvatar(userId);
        setSelectedAvatarId(savedAvatar);
      }

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

      // 4. Fetch store & position
      let storeName = 'Chưa phân công chi nhánh';
      let storeAddress = 'Chưa có địa chỉ';
      let position = apiUser.systemRole === 'MANAGER' ? 'Quản lý cửa hàng' : 'Nhân viên';

      try {
        const { data: stores } = await getMyStores(userId);
        const storeList = Array.isArray(stores) ? stores : stores?.content || [];
        const activeStore = storeList.find((s) => s.status === 'ACTIVE') || storeList[0];
        if (activeStore) {
          storeName = activeStore.storeName || activeStore.name || storeName;
          storeAddress = activeStore.storeAddress || activeStore.address || storeAddress;
          if (activeStore.contractType?.name) {
            position = activeStore.contractType.name;
          } else if (activeStore.systemRole === 'MANAGER') {
            position = 'Quản lý cửa hàng';
          }
        }
      } catch (stErr) {
        console.log('Error fetching user stores:', stErr?.message);
      }

      const loadedProfile = {
        fullName: apiUser.fullName || '',
        email: apiUser.email || '',
        phone: apiUser.phone || customData.phone || '',
        staffCode: userId ? `NV-${String(userId).slice(0, 6).toUpperCase()}` : '—',
        storeName,
        storeAddress,
        position,
        birthDate: customData.birthDate || '',
        birthPlace: customData.birthPlace || '',
        gender: customData.gender || '',
      };

      setProfile(loadedProfile);
    } catch (apiErr) {
      console.log('Failed to fetch profile:', apiErr?.message);
      setError(
        apiErr.response?.data?.message ||
          'Không thể tải thông tin hồ sơ. Vui lòng kiểm tra kết nối mạng.'
      );
      const fallbackAvatar = await getStoredAvatar();
      setSelectedAvatarId(fallbackAvatar);
    } finally {
      AsyncStorage.removeItem('@user_profile_custom_data').catch(() => {});
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
    const unsub = navigation?.addListener?.('focus', () => {
      loadProfile();
    });
    return unsub;
  }, [navigation, loadProfile]);

  // Start Edit Mode
  const handleStartEdit = () => {
    setEditForm({
      fullName: profile.fullName || '',
      phone: profile.phone || '',
      birthDate: profile.birthDate || '',
      birthPlace: profile.birthPlace || '',
      gender: profile.gender || '',
    });
    setValidationErrors({});
    setIsEditing(true);
  };

  // Cancel Edit Mode
  const handleCancelEdit = () => {
    setEditForm({
      fullName: profile.fullName || '',
      phone: profile.phone || '',
      birthDate: profile.birthDate || '',
      birthPlace: profile.birthPlace || '',
      gender: profile.gender || '',
    });
    setValidationErrors({});
    setIsEditing(false);
  };

  // Validate & Save Profile
  const handleSaveProfile = async () => {
    const errors = {};

    // 1. Full name validation (required)
    if (!editForm.fullName || !editForm.fullName.trim()) {
      errors.fullName = 'Họ và tên không được để trống';
    }

    // 2. Phone validation (if provided, must be 9-12 digits)
    if (editForm.phone && editForm.phone.trim()) {
      const cleanPhone = editForm.phone.trim();
      const phoneRegex = /^(0|\+84)[0-9]{8,11}$/;
      if (!phoneRegex.test(cleanPhone)) {
        errors.phone = 'SĐT không hợp lệ (VD: 0902123456)';
      }
    }

    // 3. Birth date format validation (if provided: DD/MM/YYYY)
    if (editForm.birthDate && editForm.birthDate.trim()) {
      const dateRegex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
      if (!dateRegex.test(editForm.birthDate.trim())) {
        errors.birthDate = 'Định dạng ngày sinh phải là DD/MM/YYYY';
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      Alert.alert('Thông tin chưa hợp lệ', 'Vui lòng kiểm tra lại các trường thông tin có đánh dấu đỏ.');
      return;
    }

    setSaving(true);
    setValidationErrors({});

    try {
      // Build request body matching UserUpdateRequest
      const updatePayload = {
        fullName: editForm.fullName.trim(),
        email: profile.email,
        phone: editForm.phone ? editForm.phone.trim() : '',
        avatarId: selectedAvatarId,
      };

      // 1. Call real Backend API: PUT /api/users/me
      const { data: updatedUser } = await updateMyProfile(updatePayload);

      // 2. Save user-specific custom fields to AsyncStorage
      if (currentUserId) {
        const userStorageKey = `@user_profile_custom_${currentUserId}`;
        await AsyncStorage.setItem(
          userStorageKey,
          JSON.stringify({
            birthDate: editForm.birthDate.trim(),
            birthPlace: editForm.birthPlace.trim(),
            gender: editForm.gender.trim(),
            phone: editForm.phone ? editForm.phone.trim() : '',
          })
        );
      }

      // 3. Update local UI state
      setProfile((prev) => ({
        ...prev,
        fullName: updatedUser?.fullName || editForm.fullName.trim(),
        phone: updatedUser?.phone || editForm.phone.trim(),
        birthDate: editForm.birthDate.trim(),
        birthPlace: editForm.birthPlace.trim(),
        gender: editForm.gender.trim(),
      }));

      setIsEditing(false);
      setSaveStatus('Đã cập nhật hồ sơ');
      Alert.alert('Thành công', 'Cập nhật thông tin hồ sơ thành công!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (apiErr) {
      console.log('Update profile error:', apiErr?.response?.data || apiErr?.message);
      const msg =
        apiErr.response?.data?.message ||
        (typeof apiErr.response?.data === 'string' ? apiErr.response?.data : null) ||
        'Không thể cập nhật hồ sơ. Vui lòng thử lại sau.';
      Alert.alert('Lỗi cập nhật', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.multiRemove([
              'accessToken',
              'refreshToken',
              '@user_profile_custom_data',
            ]);
          } catch (e) {
            // ignore
          }
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      {/* Header */}
      <View style={styles.header}>
        {isEditing ? (
          <TouchableOpacity onPress={handleCancelEdit} hitSlop={15} style={styles.headerBtn}>
            <Text style={styles.headerBtnTextCancel}>Hủy</Text>
          </TouchableOpacity>
        ) : (
          <Pressable
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('MainTabs', { screen: 'Dashboard' });
              }
            }}
            hitSlop={15}
            style={styles.closeBtn}
            accessibilityLabel="Đóng hồ sơ"
          >
            <Text style={styles.closeIcon}>✕</Text>
          </Pressable>
        )}

        <Text style={styles.title}>{isEditing ? 'Chỉnh sửa hồ sơ' : 'Hồ sơ'}</Text>

        <View style={styles.headerRightWrap}>
          {isEditing ? (
            <TouchableOpacity
              onPress={handleSaveProfile}
              disabled={saving}
              style={[styles.headerSaveBtn, saving && styles.headerSaveBtnDisabled]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.headerSaveBtnText}>Lưu</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleStartEdit}
              style={styles.headerEditBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.headerEditBtnText}>✎ Sửa</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Save Status Banner */}
      {saveStatus ? (
        <View style={styles.statusBanner}>
          <Text style={styles.statusBannerText}>{saveStatus}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#428531" />
        </View>
      ) : error ? (
        <View style={styles.errorCenter}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Lỗi tải dữ liệu hồ sơ</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadProfile} activeOpacity={0.8}>
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* ═══ YELLOW PROFILE CARD ═══ */}
          <View style={styles.profileCard}>
            <View style={styles.nameLine}>
              {/* Avatar – tap to open picker */}
              <Pressable
                onPress={() => {
                  setPreviewAvatarId(selectedAvatarId || 'dilan');
                  setShowAvatarPicker(true);
                }}
                style={styles.avatarWrapper}
                accessibilityLabel="Chọn ảnh đại diện"
              >
                <View style={styles.avatar}>
                  <Avatar3D size={84} {...getAvatar3DProps(selectedAvatarId)} />
                </View>
                <View style={styles.avatarEditBadge}>
                  <Text style={styles.avatarEditIcon}>✎</Text>
                </View>
              </Pressable>

              <View style={{ flex: 1 }}>
                <Text style={styles.nameDisplay} numberOfLines={1}>
                  {isEditing ? editForm.fullName || 'Nhập họ và tên...' : profile.fullName || 'Nhân viên'}
                </Text>
                <Text style={styles.positionSubtitle} numberOfLines={1}>
                  {profile.position || 'Chưa phân công'}
                </Text>
                {isEditing && (
                  <Text style={styles.editingBadgeText}>Đang chỉnh sửa</Text>
                )}
              </View>
            </View>

            <View style={styles.cardLine} />

            <View style={styles.workDetails}>
              <View style={styles.inlineWorkRow}>
                <Text style={styles.workLabel}>Cửa hàng:</Text>
                <Text style={styles.inlineWorkValue} numberOfLines={1}>
                  {profile.storeName || 'Chưa phân công chi nhánh'}
                </Text>
              </View>

              <View style={styles.inlineWorkRow}>
                <Text style={styles.workLabel}>Mã nhân viên:</Text>
                <Text style={styles.inlineWorkValue}>{profile.staffCode || '—'}</Text>
              </View>

              <View style={styles.inlineWorkRow}>
                <Text style={styles.workLabel}>Vị trí:</Text>
                <Text style={styles.inlineWorkValue}>
                  {profile.position || 'Chưa phân công vị trí'}
                </Text>
              </View>

              <View style={styles.inlineWorkRow}>
                <Text style={styles.workLabel}>Địa chỉ làm việc:</Text>
                <Text style={styles.inlineWorkValue} numberOfLines={2}>
                  {profile.storeAddress || 'Chưa có địa chỉ'}
                </Text>
              </View>
            </View>
          </View>

          {/* ═══ THÔNG TIN CÁ NHÂN ═══ */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
            {!isEditing && (
              <TouchableOpacity onPress={handleStartEdit} hitSlop={10}>
                <Text style={styles.sectionActionText}>Chỉnh sửa</Text>
              </TouchableOpacity>
            )}
          </View>

          {isEditing ? (
            <View style={styles.editWhiteBlock}>
              <EditableRowInput
                label="Họ và tên"
                value={editForm.fullName}
                onChangeText={(t) => setEditForm((prev) => ({ ...prev, fullName: t }))}
                placeholder="Nhập họ và tên đầy đủ..."
                required
                error={validationErrors.fullName}
              />

              <EditableRowInput
                label="Số điện thoại"
                value={editForm.phone}
                onChangeText={(t) => setEditForm((prev) => ({ ...prev, phone: t }))}
                placeholder="0902xxxxxx"
                keyboardType="phone-pad"
                error={validationErrors.phone}
              />

              <EditableRowInput
                label="Ngày sinh"
                value={editForm.birthDate}
                onChangeText={(t) => setEditForm((prev) => ({ ...prev, birthDate: t }))}
                placeholder="DD/MM/YYYY (VD: 15/08/2000)"
                error={validationErrors.birthDate}
              />

              <EditableRowInput
                label="Nơi sinh"
                value={editForm.birthPlace}
                onChangeText={(t) => setEditForm((prev) => ({ ...prev, birthPlace: t }))}
                placeholder="Tỉnh / Thành phố..."
              />

              <View style={styles.editRowBlock}>
                <Text style={styles.editRowLabel}>Giới tính</Text>
                <View style={styles.genderSelectRow}>
                  {['Nam', 'Nữ', 'Khác'].map((g) => {
                    const isSelected = editForm.gender === g;
                    return (
                      <TouchableOpacity
                        key={g}
                        style={[styles.genderChip, isSelected && styles.genderChipSelected]}
                        onPress={() => setEditForm((prev) => ({ ...prev, gender: g }))}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.genderChipText,
                            isSelected && styles.genderChipTextSelected,
                          ]}
                        >
                          {g}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.whiteBlock}>
              <ProfileRow
                label="Họ và tên"
                value={profile.fullName}
                isReadOnly={false}
              />
              <ProfileRow
                label="Số điện thoại"
                value={profile.phone}
                placeholder="Chưa cập nhật SĐT"
                isReadOnly={false}
              />
              <ProfileRow
                label="Ngày sinh"
                value={profile.birthDate}
                placeholder="Chưa cập nhật ngày sinh"
                isReadOnly={false}
              />
              <ProfileRow
                label="Nơi sinh"
                value={profile.birthPlace}
                placeholder="Chưa cập nhật nơi sinh"
                isReadOnly={false}
              />
              <ProfileRow
                label="Giới tính"
                value={profile.gender}
                placeholder="Chưa cập nhật giới tính"
                isReadOnly={false}
                last
              />
            </View>
          )}

          {/* ═══ THÔNG TIN ĐĂNG NHẬP ═══ */}
          <Text style={styles.sectionTitle}>Thông tin đăng nhập</Text>
          <View style={styles.whiteBlock}>
            <ProfileRow
              label="Email"
              value={profile.email}
              isReadOnly={true}
            />
            <ProfileRow
              label="Mật khẩu"
              value="••••••••••••••••"
              isReadOnly={true}
              last
            />
          </View>

          {/* ═══ EDIT MODE ACTION BUTTONS ═══ */}
          {isEditing ? (
            <View style={styles.editActionContainer}>
              <TouchableOpacity
                style={styles.cancelActionBtn}
                onPress={handleCancelEdit}
                disabled={saving}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelActionBtnText}>Hủy bỏ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveActionBtn, saving && styles.saveActionBtnDisabled]}
                onPress={handleSaveProfile}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveActionBtnText}>Lưu thay đổi</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.editProfileBtn}
              onPress={handleStartEdit}
              activeOpacity={0.8}
            >
              <Text style={styles.editProfileBtnText}>✎ Chỉnh sửa hồ sơ</Text>
            </TouchableOpacity>
          )}

          {/* ═══ ĐĂNG XUẤT ═══ */}
          {!isEditing && (
            <Pressable onPress={handleLogout} style={styles.logoutBtn}>
              <Text style={styles.logoutText}>Đăng xuất</Text>
            </Pressable>
          )}
          <View style={{ height: 90 }} />
        </ScrollView>
      )}

      {/* ═══ MODAL CHỌN ẢNH ĐẠI DIỆN 3D ═══ */}
      <Modal
        visible={showAvatarPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAvatarPicker(false)}
      >
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerSheet}>
            {/* Header */}
            <View style={styles.pickerHeaderRow}>
              <View>
                <Text style={styles.pickerTitle}>Bộ sưu tập Avatar 3D</Text>
                <Text style={styles.pickerSubtitle}>Chọn diện mạo 3D phù hợp với bạn</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAvatarPicker(false)}
                hitSlop={12}
                style={styles.pickerCloseCircle}
              >
                <Text style={styles.pickerCloseX}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* ── TOP SPOTLIGHT 3D STAGE ── */}
            {(() => {
              const isCurrent = selectedAvatarId === previewAvatarId;
              const thumbnails = getAllAvatarThumbnails();

              return (
                <>
                  <View style={styles.spotlightCard}>
                    <View style={styles.spotlight3DWrap}>
                      <Avatar3D size={105} {...getAvatar3DProps(previewAvatarId)} isHovered={true} />
                    </View>
                    <View style={styles.spotlightInfo}>
                      <View style={styles.spotlightNameRow}>
                        <Text style={styles.spotlightName}>Xem trước 3D</Text>
                        {profile.fullName ? (
                          <Text style={styles.spotlightFullName} numberOfLines={1}>
                            ({profile.fullName})
                          </Text>
                        ) : null}
                        {isCurrent && (
                          <View style={styles.spotlightUsingTag}>
                            <Text style={styles.spotlightUsingText}>Đang dùng</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.spotlightHint}>💡 Kéo xoay 360° • Biểu cảm chớp mắt & cười tươi</Text>

                      <TouchableOpacity
                        style={[
                          styles.spotlightSelectBtn,
                          isCurrent && styles.spotlightSelectBtnActive,
                        ]}
                        onPress={() => handleSelectAvatar(previewAvatarId)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.spotlightSelectBtnText}>
                          {isCurrent ? '✓ Đang sử dụng' : 'Áp dụng làm ảnh đại diện'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={styles.pickerGridTitle}>Chọn diện mạo 3D ({AVATAR_OPTIONS.length}):</Text>

                  {/* ── GRID 18 ẢNH 3D THỰC TẾ ── */}
                  <FlatList
                    data={AVATAR_OPTIONS}
                    keyExtractor={(item) => item.id}
                    numColumns={3}
                    columnWrapperStyle={styles.pickerGridRow}
                    showsVerticalScrollIndicator={true}
                    style={{ flex: 1, maxHeight: 420 }}
                    renderItem={({ item }) => {
                      const isPreviewing = previewAvatarId === item.id;
                      const isSelected = selectedAvatarId === item.id;
                      const imgUrl = thumbnails[item.id];

                      return (
                        <TouchableOpacity
                          style={[
                            styles.pickerCard,
                            isPreviewing && styles.pickerCardPreviewing,
                            isSelected && styles.pickerCardSelected,
                          ]}
                          onPress={() => setPreviewAvatarId(item.id)}
                          activeOpacity={0.7}
                        >
                          {isSelected && (
                            <View style={styles.pickerCardCheck}>
                              <Text style={styles.pickerCardCheckText}>✓</Text>
                            </View>
                          )}
                          {imgUrl ? (
                            <Image
                              source={{ uri: imgUrl }}
                              style={styles.pickerThumbImg}
                            />
                          ) : (
                            <View style={styles.pickerBadgeIcon}>
                              <Text style={styles.pickerEmojiText}>{item.icon || '👤'}</Text>
                            </View>
                          )}
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

      <BottomNavbar navigation={navigation} activeRoute="Profile" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F3EFF0',
  },
  content: {
    paddingBottom: 50,
  },
  header: {
    height: 64,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3EFF0',
  },
  closeBtn: {
    padding: 6,
  },
  closeIcon: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E1E1E',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#161616',
  },
  headerBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  headerBtnTextCancel: {
    fontSize: 15,
    color: '#666666',
    fontWeight: '600',
  },
  headerRightWrap: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  headerEditBtn: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  headerEditBtnText: {
    color: '#2E7D32',
    fontSize: 13.5,
    fontWeight: '700',
  },
  headerSaveBtn: {
    backgroundColor: '#428531',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    minWidth: 50,
    alignItems: 'center',
  },
  headerSaveBtnDisabled: {
    opacity: 0.6,
  },
  headerSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  statusBanner: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  statusBannerText: {
    color: '#2E7D32',
    fontSize: 13,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E1E1E',
    marginBottom: 6,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  retryBtn: {
    backgroundColor: '#428531',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  /* ═══ Profile Card (Yellow #FFF8E1) ═══ */
  profileCard: {
    marginHorizontal: 18,
    marginTop: 8,
    padding: 20,
    borderRadius: 15,
    backgroundColor: '#FFF8E1',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#428531',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF8E1',
  },
  avatarEditIcon: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
  nameDisplay: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E1E1E',
  },
  positionSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#428531',
    marginTop: 2,
  },
  editingBadgeText: {
    fontSize: 11.5,
    color: '#E65100',
    fontWeight: '600',
    marginTop: 2,
  },
  cardLine: {
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    marginVertical: 14,
  },
  workDetails: {
    gap: 6,
  },
  inlineWorkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 30,
  },
  workLabel: {
    fontSize: 14,
    color: 'rgba(51, 51, 51, 0.75)',
    fontWeight: '500',
    minWidth: 125,
  },
  inlineWorkValue: {
    flex: 1,
    fontSize: 14,
    color: '#222222',
    fontWeight: '600',
    paddingVertical: 2,
  },

  /* ═══ Section Titles & Rows ═══ */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 10,
  },
  sectionActionText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
  },

  /* ═══ View Mode White Block ═══ */
  whiteBlock: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#EFEAEB',
  },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F2F3',
    paddingVertical: 8,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    fontSize: 14.5,
    color: '#444444',
    fontWeight: '500',
    minWidth: 110,
  },
  rowValueContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  rowStaticValue: {
    fontSize: 14.5,
    color: '#1E1E1E',
    fontWeight: '600',
    textAlign: 'right',
  },
  placeholderValue: {
    color: '#9E9E9E',
    fontWeight: '400',
  },
  readOnlyBadge: {
    fontSize: 10,
    color: '#757575',
    backgroundColor: '#EEEEEE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
  },

  /* ═══ Edit Mode White Block ═══ */
  editWhiteBlock: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#EFEAEB',
    gap: 12,
  },
  editRowBlock: {
    borderBottomWidth: 1,
    borderBottomColor: '#F5F2F3',
    paddingBottom: 12,
  },
  lastRowBlock: {
    borderBottomWidth: 0,
    paddingBottom: 4,
  },
  editRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  editRowLabel: {
    fontSize: 13.5,
    color: '#333333',
    fontWeight: '600',
  },
  requiredStar: {
    color: '#D32F2F',
    fontWeight: '700',
  },
  fieldErrorText: {
    fontSize: 11.5,
    color: '#D32F2F',
    fontWeight: '600',
  },
  editInput: {
    backgroundColor: '#F9F9FB',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14.5,
    color: '#1E1E1E',
  },
  editInputError: {
    borderColor: '#D32F2F',
    backgroundColor: '#FFF8F8',
  },
  genderSelectRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  genderChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#F9F9FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderChipSelected: {
    borderColor: '#428531',
    backgroundColor: '#E8F5E9',
  },
  genderChipText: {
    fontSize: 13.5,
    color: '#555555',
    fontWeight: '500',
  },
  genderChipTextSelected: {
    color: '#2E7D32',
    fontWeight: '700',
  },

  /* ═══ Action Buttons ═══ */
  editProfileBtn: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editProfileBtnText: {
    color: '#2E7D32',
    fontSize: 15,
    fontWeight: '700',
  },
  editActionContainer: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 24,
  },
  cancelActionBtn: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelActionBtnText: {
    color: '#555555',
    fontSize: 15,
    fontWeight: '600',
  },
  saveActionBtn: {
    flex: 1.6,
    backgroundColor: '#428531',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveActionBtnDisabled: {
    opacity: 0.6,
  },
  saveActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  /* ═══ Logout Button ═══ */
  logoutBtn: {
    alignSelf: 'center',
    marginTop: 36,
    marginBottom: 20,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  logoutText: {
    fontSize: 17,
    color: 'rgba(198, 13, 28, 0.9)',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },

  /* ═══ 3D Avatar Picker Modal Styles ═══ */
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '88%',
    maxHeight: '92%',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 24,
    display: 'flex',
    flexDirection: 'column',
  },
  pickerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#161616',
  },
  pickerSubtitle: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  pickerCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerCloseX: {
    fontSize: 16,
    fontWeight: '700',
    color: '#555555',
  },
  spotlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FB',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E5E9F0',
    gap: 12,
    marginBottom: 14,
  },
  spotlight3DWrap: {
    width: 105,
    height: 105,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotlightInfo: {
    flex: 1,
  },
  spotlightNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  spotlightName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
  },
  spotlightFullName: {
    fontSize: 13,
    color: '#555555',
    fontWeight: '600',
  },
  spotlightUsingTag: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  spotlightUsingText: {
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: '700',
  },
  spotlightHint: {
    fontSize: 11.5,
    color: '#777777',
    marginTop: 3,
  },
  spotlightSelectBtn: {
    backgroundColor: '#428531',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  spotlightSelectBtnActive: {
    backgroundColor: '#2E7D32',
  },
  spotlightSelectBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  pickerGridTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#444444',
    marginBottom: 8,
  },
  pickerGridRow: {
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  pickerCard: {
    width: '31.5%',
    height: 94,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: 4,
  },
  pickerCardPreviewing: {
    borderColor: '#428531',
    backgroundColor: '#EDF7EB',
    borderWidth: 2,
  },
  pickerCardSelected: {
    borderColor: '#428531',
  },
  pickerCardCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#428531',
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  pickerCardCheckText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  pickerThumbImg: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  pickerBadgeIcon: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerEmojiText: {
    fontSize: 30,
  },
});


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
import { getMyProfile, getMyStores, updateMyAvatar } from '../services/profileService';
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
          placeholderTextColor="#A0A0A0"
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
  const [profile, setProfile] = useState(INITIAL_PROFILE);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [selectedAvatarId, setSelectedAvatarId] = useState('dilan');
  const [previewAvatarId, setPreviewAvatarId] = useState('dilan');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

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
  const loadProfile = useCallback(async () => {
    setLoading(true);
    // 0. Nạp avatar từ local cache trước để hiển thị tức thì
    const cachedAvatar = await getStoredAvatar(currentUserId);
    setSelectedAvatarId(cachedAvatar);

    try {
      // 1. Fetch real user from Backend API
      const { data: apiUser } = await getMyProfile();
      if (apiUser) {
        const userId = apiUser.id;
        setCurrentUserId(userId);

        // 2. Ưu tiên load avatar từ Backend API, fallback sang AsyncStorage
        if (apiUser.avatarId && AVATAR_OPTIONS.some(a => a.id === apiUser.avatarId)) {
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
          phone: apiUser.phone || customData.phone || '',
          staffCode: userId ? `NV-${String(userId).slice(0, 6).toUpperCase()}` : '',
          storeName,
          storeAddress,
          position,
          birthDate: customData.birthDate || '',
          birthPlace: customData.birthPlace || '',
          gender: customData.gender || '',
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

  // Update field directly inline and save to user-specific AsyncStorage
  const updateField = (key, val) => {
    setProfile((prev) => {
      const next = { ...prev, [key]: val };
      if (currentUserId) {
        const userStorageKey = `@user_profile_custom_${currentUserId}`;
        AsyncStorage.setItem(userStorageKey, JSON.stringify({
          birthDate: next.birthDate,
          birthPlace: next.birthPlace,
          gender: next.gender,
          phone: next.phone,
        })).catch(() => {});
      }
      return next;
    });
    setSaveStatus('Đã lưu');
    setTimeout(() => setSaveStatus(''), 2000);
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
              '@user_profile_custom_data'
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
        <Text style={styles.title}>Hồ sơ</Text>
        <View style={styles.saveStatusWrap}>
          {saveStatus ? <Text style={styles.saveStatusText}>{saveStatus}</Text> : <View style={{ width: 40 }} />}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#428531" />
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
                  {profile.fullName || 'Nhân viên'}
                </Text>
                <Text style={styles.positionSubtitle} numberOfLines={1}>
                  {profile.position || 'Chưa phân công'}
                </Text>
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
                <Text style={styles.inlineWorkValue}>
                  {profile.staffCode || '—'}
                </Text>
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

          {/* ═══ THÔNG TIN CÁ NHÂN (Group 136) ═══ */}
          <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
          <View style={styles.whiteBlock}>
            <EditableRow
              label="Ngày sinh"
              value={profile.birthDate}
              onChangeText={(t) => updateField('birthDate', t)}
              placeholder="Chưa cập nhật (VD: DD/MM/YYYY)"
            />
            <EditableRow
              label="Nơi sinh"
              value={profile.birthPlace}
              onChangeText={(t) => updateField('birthPlace', t)}
              placeholder="Chưa cập nhật nơi sinh"
            />
            <EditableRow
              label="Thông tin liên hệ"
              value={profile.phone}
              onChangeText={(t) => updateField('phone', t)}
              placeholder="Chưa cập nhật SĐT"
              keyboardType="phone-pad"
            />
            <EditableRow
              label="Giới tính"
              value={profile.gender}
              onChangeText={(t) => updateField('gender', t)}
              placeholder="Chưa cập nhật giới tính"
              last
            />
          </View>

          {/* ═══ THÔNG TIN ĐĂNG NHẬP (Group 138) ═══ */}
          <Text style={styles.sectionTitle}>Thông tin đăng nhập</Text>
          <View style={styles.whiteBlock}>
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
          <Pressable onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </Pressable>
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

            {/* ── TOP SPOTLIGHT 3D STAGE (1 WEBGL CONTEXT DUY NHẤT) ── */}
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

                  {/* ── GRID 18 ẢNH 3D THỰC TẾ (KHÔNG ICON, KHÔNG TÊN ẢO) ── */}
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
    fontSize: 22,
    fontWeight: '600',
    color: '#161616',
  },
  saveStatusWrap: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
  saveStatusText: {
    fontSize: 13,
    color: '#428531',
    fontWeight: '600',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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

  /* ═══ Avatar Picker Modal (Spotlight 3D Stage) ═══ */
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    maxHeight: '90%',
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
    color: '#1A1A1A',
  },
  pickerSubtitle: {
    fontSize: 12,
    color: '#666',
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
    fontSize: 15,
    fontWeight: '600',
    color: '#555',
  },

  /* ── Featured Spotlight Stage ── */
  spotlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F8FA',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E8ECF0',
    marginBottom: 14,
  },
  spotlight3DWrap: {
    width: 110,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotlightInfo: {
    flex: 1,
    marginLeft: 12,
  },
  spotlightNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  spotlightIcon: {
    fontSize: 18,
  },
  spotlightName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222',
  },
  spotlightUsingTag: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  spotlightUsingText: {
    fontSize: 10.5,
    color: '#2E7D32',
    fontWeight: '700',
  },
  spotlightDesc: {
    fontSize: 12,
    color: '#555',
    marginTop: 3,
    lineHeight: 16,
  },
  spotlightHint: {
    fontSize: 10.5,
    color: '#888',
    marginTop: 3,
  },
  spotlightSelectBtn: {
    marginTop: 8,
    backgroundColor: '#428531',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  spotlightSelectBtnActive: {
    backgroundColor: '#2E7D32',
  },
  spotlightSelectBtnText: {
    color: '#FFF',
    fontSize: 12.5,
    fontWeight: '700',
  },

  pickerGridTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#444',
    marginBottom: 8,
  },
  pickerGridRow: {
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pickerCard: {
    width: '31%',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    borderWidth: 1.5,
    borderColor: '#EEEEEE',
    position: 'relative',
  },
  pickerCardPreviewing: {
    borderColor: '#428531',
    backgroundColor: '#F1F8EE',
  },
  pickerCardSelected: {
    borderColor: '#428531',
  },
  pickerCardCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#428531',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerCardCheckText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
  },
  pickerBadgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  pickerHairAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 12,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  pickerEmojiText: {
    fontSize: 18,
    marginTop: 4,
  },
  pickerCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginTop: 6,
  },
  pickerCardLabelActive: {
    color: '#428531',
    fontWeight: '700',
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
  nameInput: {
    flex: 1,
    fontSize: 22,
    color: '#333333',
    fontWeight: '600',
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
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
    minHeight: 32,
  },
  workLabel: {
    fontSize: 14.5,
    color: 'rgba(51, 51, 51, 0.75)',
    fontWeight: '500',
    minWidth: 125,
  },
  inlineWorkValue: {
    flex: 1,
    fontSize: 14.5,
    color: '#222222',
    fontWeight: '600',
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  inlineWorkInput: {
    flex: 1,
    fontSize: 14.5,
    color: '#333333',
    fontWeight: '600',
    paddingVertical: 2,
    paddingHorizontal: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },

  /* ═══ Section Titles ═══ */
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 10,
  },

  /* ═══ White Block Container ═══ */
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
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    fontSize: 15,
    color: '#333333',
    fontWeight: '500',
  },
  rowInput: {
    flex: 1,
    fontSize: 15,
    color: 'rgba(51, 51, 51, 0.85)',
    fontWeight: '500',
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginLeft: 16,
  },
  rowStaticValue: {
    fontSize: 15,
    color: 'rgba(51, 51, 51, 0.75)',
    fontWeight: '500',
  },

  /* ═══ Logout Button ═══ */
  logoutBtn: {
    alignSelf: 'center',
    marginTop: 40,
    marginBottom: 20,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  logoutText: {
    fontSize: 20,
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

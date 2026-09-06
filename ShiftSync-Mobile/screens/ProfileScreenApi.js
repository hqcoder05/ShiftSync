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
const AVATAR_OPTIONS = [
  { id: 'dilan', source: require('../assets/avatar-dilan-jon.png'), label: 'Dilan' },
  { id: 'mew',   source: require('../assets/avatar-mew-ama.png'),   label: 'Mew'   },
  { id: 'paul',  source: require('../assets/avatar-paul-lee.png'),  label: 'Paul'  },
  { id: 'thia',  source: require('../assets/avatar-thia-ago.png'),  label: 'Thia'  },
];

const AVATAR_STORAGE_KEY = '@user_profile_avatar';
import BottomNavbar from '../components/BottomNavbar';
import { getMyProfile, getMyStores } from '../services/profileService';

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
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Derived avatar source from selectedAvatarId
  const currentAvatar = AVATAR_OPTIONS.find(a => a.id === selectedAvatarId)?.source ?? AVATAR_OPTIONS[0].source;

  const handleSelectAvatar = async (avatarId) => {
    setSelectedAvatarId(avatarId);
    setShowAvatarPicker(false);
    if (currentUserId) {
      try {
        await AsyncStorage.setItem(`@user_profile_avatar_${currentUserId}`, avatarId);
      } catch (e) { /* ignore */ }
    }
  };

  // Load custom profile from Backend API & user-specific AsyncStorage
  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch real user from Backend API
      const { data: apiUser } = await getMyProfile();
      if (apiUser) {
        const userId = apiUser.id;
        setCurrentUserId(userId);

        // 2. Load avatar specifically for this user
        const avatarKey = `@user_profile_avatar_${userId}`;
        const savedAvatar = await AsyncStorage.getItem(avatarKey);
        if (savedAvatar && AVATAR_OPTIONS.some(a => a.id === savedAvatar)) {
          setSelectedAvatarId(savedAvatar);
        } else {
          setSelectedAvatarId('dilan');
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
      setProfile(INITIAL_PROFILE);
    } finally {
      // Clear legacy shared key if still exists to prevent ghost data leakage
      AsyncStorage.removeItem('@user_profile_custom_data').catch(() => {});
      setLoading(false);
    }
  }, []);

  useEffect(() => {
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
          onPress={() => navigation.goBack()}
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
                onPress={() => setShowAvatarPicker(true)}
                style={styles.avatarWrapper}
                accessibilityLabel="Chọn ảnh đại diện"
              >
                <Image source={currentAvatar} style={styles.avatar} />
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

            {/* ── Avatar Picker Modal ── */}
            <Modal
              visible={showAvatarPicker}
              transparent
              animationType="fade"
              onRequestClose={() => setShowAvatarPicker(false)}
            >
              <Pressable style={styles.pickerOverlay} onPress={() => setShowAvatarPicker(false)}>
                <View style={styles.pickerSheet}>
                  <Text style={styles.pickerTitle}>Chọn ảnh đại diện</Text>
                  <FlatList
                    data={AVATAR_OPTIONS}
                    keyExtractor={item => item.id}
                    numColumns={2}
                    scrollEnabled={false}
                    columnWrapperStyle={styles.pickerRow}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.pickerItem,
                          selectedAvatarId === item.id && styles.pickerItemSelected,
                        ]}
                        onPress={() => handleSelectAvatar(item.id)}
                        activeOpacity={0.75}
                      >
                        <Image source={item.source} style={styles.pickerAvatar} />
                        <Text style={styles.pickerLabel}>{item.label}</Text>
                        {selectedAvatarId === item.id && (
                          <View style={styles.pickerCheckBadge}>
                            <Text style={styles.pickerCheckIcon}>✓</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    )}
                  />
                  <TouchableOpacity
                    style={styles.pickerCancelBtn}
                    onPress={() => setShowAvatarPicker(false)}
                  >
                    <Text style={styles.pickerCancelText}>Hủy</Text>
                  </TouchableOpacity>
                </View>
              </Pressable>
            </Modal>

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
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: '#1D1D1D',
    backgroundColor: '#fff',
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

  /* ═══ Avatar Picker Modal ═══ */
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 34,
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222',
    textAlign: 'center',
    marginBottom: 20,
  },
  pickerRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  pickerItem: {
    width: '46%',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#F7F7F7',
  },
  pickerItemSelected: {
    borderColor: '#428531',
    backgroundColor: '#EEF7EA',
  },
  pickerAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 8,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  pickerCheckBadge: {
    position: 'absolute',
    top: 8,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#428531',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerCheckIcon: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  pickerCancelBtn: {
    marginTop: 8,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 32,
  },
  pickerCancelText: {
    fontSize: 16,
    color: '#C60D1C',
    fontWeight: '600',
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
});

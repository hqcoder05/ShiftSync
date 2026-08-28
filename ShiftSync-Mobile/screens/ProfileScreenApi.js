import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import avatar from '../assets/avatar-dilan-jon.png';
import { getMyProfile, getMyStores } from '../services/profileService';

const STORAGE_KEY = '@user_profile_custom_data';

const DEFAULT_PROFILE = {
  fullName: 'Dilan . Jon',
  storeName: 'HighLands',
  staffCode: 'HL30102005',
  position: 'Barista',
  storeAddress: '71/D9 Tây Thạnh, Tân Phú',
  birthDate: '04-03-2005',
  birthPlace: 'Đồng Tháp',
  phone: '0369961599',
  gender: 'Nữ',
  email: '12345@gmail.com',
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
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  // Load custom profile from AsyncStorage & API
  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      // 1. First load from AsyncStorage
      const savedData = await AsyncStorage.getItem(STORAGE_KEY);
      let localProfile = DEFAULT_PROFILE;
      if (savedData) {
        try {
          localProfile = { ...DEFAULT_PROFILE, ...JSON.parse(savedData) };
        } catch (e) {
          // ignore parse error
        }
      }

      // 2. Fetch real user from Backend API
      try {
        const { data: apiUser } = await getMyProfile();
        if (apiUser) {
          let storeName = localProfile.storeName;
          let storeAddress = localProfile.storeAddress;
          try {
            const { data: stores } = await getMyStores(apiUser.id);
            const activeStore = stores?.find((s) => s.status === 'ACTIVE') || stores?.[0];
            if (activeStore) {
              storeName = activeStore.storeName || storeName;
              storeAddress = activeStore.storeAddress || storeAddress;
            }
          } catch (stErr) {
            // ignore
          }

          localProfile = {
            ...localProfile,
            fullName: apiUser.fullName || localProfile.fullName,
            email: apiUser.email || localProfile.email,
            phone: apiUser.phone || localProfile.phone,
            staffCode: apiUser.id ? `HL${String(apiUser.id).slice(0, 8).toUpperCase()}` : localProfile.staffCode,
            storeName,
            storeAddress,
          };
        }
      } catch (apiErr) {
        // Backend offline
      }

      setProfile(localProfile);
    } catch (e) {
      setProfile(DEFAULT_PROFILE);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Update field directly inline and save to AsyncStorage
  const updateField = (key, val) => {
    setProfile((prev) => {
      const next = { ...prev, [key]: val };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
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
            await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
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
          {/* ═══ YELLOW PROFILE CARD (Chỉnh sửa trực tiếp) ═══ */}
          <View style={styles.profileCard}>
            <View style={styles.nameLine}>
              <Image source={avatar} style={styles.avatar} />
              <TextInput
                style={styles.nameInput}
                value={profile.fullName}
                onChangeText={(t) => updateField('fullName', t)}
                placeholder="Họ và tên..."
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.cardLine} />

            <View style={styles.workDetails}>
              <View style={styles.inlineWorkRow}>
                <Text style={styles.workLabel}>Cửa hàng:</Text>
                <TextInput
                  style={styles.inlineWorkInput}
                  value={profile.storeName}
                  onChangeText={(t) => updateField('storeName', t)}
                  placeholder="Tên cửa hàng..."
                  placeholderTextColor="#777"
                />
              </View>

              <View style={styles.inlineWorkRow}>
                <Text style={styles.workLabel}>Mã nhân viên:</Text>
                <TextInput
                  style={styles.inlineWorkInput}
                  value={profile.staffCode}
                  onChangeText={(t) => updateField('staffCode', t)}
                  placeholder="Mã NV..."
                  placeholderTextColor="#777"
                />
              </View>

              <View style={styles.inlineWorkRow}>
                <Text style={styles.workLabel}>Vị trí:</Text>
                <TextInput
                  style={styles.inlineWorkInput}
                  value={profile.position}
                  onChangeText={(t) => updateField('position', t)}
                  placeholder="Vị trí làm việc..."
                  placeholderTextColor="#777"
                />
              </View>

              <View style={styles.inlineWorkRow}>
                <Text style={styles.workLabel}>Địa chỉ làm việc:</Text>
                <TextInput
                  style={styles.inlineWorkInput}
                  value={profile.storeAddress}
                  onChangeText={(t) => updateField('storeAddress', t)}
                  placeholder="Địa chỉ làm việc..."
                  placeholderTextColor="#777"
                />
              </View>
            </View>
          </View>

          {/* ═══ THÔNG TIN CÁ NHÂN (Group 136 - Chỉnh sửa trực tiếp) ═══ */}
          <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
          <View style={styles.whiteBlock}>
            <EditableRow
              label="Ngày sinh"
              value={profile.birthDate}
              onChangeText={(t) => updateField('birthDate', t)}
              placeholder="04-03-2005"
            />
            <EditableRow
              label="Nơi sinh"
              value={profile.birthPlace}
              onChangeText={(t) => updateField('birthPlace', t)}
              placeholder="Đồng Tháp"
            />
            <EditableRow
              label="Thông tin liên hệ"
              value={profile.phone}
              onChangeText={(t) => updateField('phone', t)}
              placeholder="0369961599"
              keyboardType="phone-pad"
            />
            <EditableRow
              label="Giới tính"
              value={profile.gender}
              onChangeText={(t) => updateField('gender', t)}
              placeholder="Nữ / Nam"
              last
            />
          </View>

          {/* ═══ THÔNG TIN ĐĂNG NHẬP (Group 138 - Chỉnh sửa trực tiếp) ═══ */}
          <Text style={styles.sectionTitle}>Thông tin đăng nhập</Text>
          <View style={styles.whiteBlock}>
            <EditableRow
              label="Email"
              value={profile.email}
              onChangeText={(t) => updateField('email', t)}
              placeholder="12345@gmail.com"
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
        </ScrollView>
      )}
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
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: '#1D1D1D',
    backgroundColor: '#fff',
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

import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Platform } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { login } from '../services/authService';
import { getBaseUrl } from '../services/api';
import { validateLoginForm } from '../utils/validators';
import AsyncStorage from '@react-native-async-storage/async-storage';

let LoginMascot3D = null;
if (Platform.OS === 'web') {
  try { LoginMascot3D = require('../components/LoginMascot3D.web').default; } catch (e) {}
}

// Logo giống hệt bên Web, vẽ bằng react-native-svg thay vì thẻ <svg> HTML
function LogoIcon({ size = 32, color = '#4CAF50' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="4" width="8" height="3" rx="1" fill={color} />
      <Rect x="12" y="4" width="10" height="3" rx="1" fill={color} />
      <Rect x="2" y="10" width="14" height="3" rx="1" fill={color} />
      <Rect x="18" y="10" width="4" height="3" rx="1" fill={color} />
      <Rect x="2" y="16" width="6" height="3" rx="1" fill={color} />
      <Rect x="10" y="16" width="12" height="3" rx="1" fill={color} />
    </Svg>
  );
}

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [mascotStatus, setMascotStatus] = useState('idle');

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    const errMsg = validateLoginForm(trimmedEmail, trimmedPassword);
    if (errMsg) {
      setError(errMsg);
      setMascotStatus('error');
      setTimeout(() => setMascotStatus('idle'), 2200);
      return;
    }

    try {
      const res = await login(trimmedEmail, trimmedPassword);
      const { accessToken, refreshToken, role, email: userEmail } = res.data;
      await AsyncStorage.multiSet([
        ['accessToken', accessToken || ''],
        ['refreshToken', refreshToken || ''],
        ['userRole', role || ''],
        ['userEmail', userEmail || ''],
      ]);
      setMascotStatus('success');
      setTimeout(() => {
        navigation.replace('MainTabs');
      }, 1000);
    } catch (err) {
      console.log('LOGIN ERROR:', err.message);
      setMascotStatus('error');
      setTimeout(() => setMascotStatus('idle'), 2200);
      const status = err.response?.status;
      if (status === 401) {
        setError('Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.');
      } else if (status === 0 || !err.response) {
        setError(`Không kết nối được server (${getBaseUrl()}). Hãy đảm bảo backend đang chạy tại cổng 8080 và thiết bị cùng Wi-Fi.`);
      } else {
        setError('Đăng nhập thất bại. Vui lòng thử lại.');
      }
    }
  };

  const handleQuickLogin = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
    setMascotStatus('idle');
  };

  return (
    <View style={styles.page}>
      <View style={styles.logoRow}>
        <LogoIcon />
        <Text style={styles.logoText}>ShiftSync</Text>
      </View>

      {LoginMascot3D && (
        <View style={{ marginBottom: -10, overflow: 'visible', alignItems: 'center' }}>
          <LoginMascot3D
            status={mascotStatus}
            emailLength={email.length}
            width={280}
            height={160}
          />
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, emailFocused && styles.inputFocused]}
          value={email}
          onChangeText={setEmail}
          onFocus={() => { setEmailFocused(true); setMascotStatus('email'); }}
          onBlur={() => { setEmailFocused(false); setMascotStatus('idle'); }}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Nhập email..."
        />

        <Text style={styles.label}>Mật khẩu</Text>
        <TextInput
          style={[styles.input, passwordFocused && styles.inputFocused]}
          value={password}
          onChangeText={setPassword}
          onFocus={() => { setPasswordFocused(true); setMascotStatus('password'); }}
          onBlur={() => { setPasswordFocused(false); setMascotStatus('idle'); }}
          secureTextEntry
          placeholder="Nhập mật khẩu..."
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={handleLogin}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed, // hiệu ứng khi nhấn giữ, tương đương :active bên Web
          ]}
        >
          {({ pressed }) => (
            <Text style={[styles.buttonText, pressed && styles.buttonTextPressed]}>
              Đăng nhập
            </Text>
          )}
        </Pressable>

        <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: '#EEEEEE', paddingTop: 14 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 8, textAlign: 'center' }}>
            Tài khoản mẫu (Đăng nhập thật):
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
            <Pressable
              onPress={() => handleQuickLogin('emp01@shiftsync.com', 'password123')}
              style={{ backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 }}
            >
              <Text style={{ fontSize: 12, color: '#166534', fontWeight: '600' }}>Staff (emp01)</Text>
            </Pressable>
            <Pressable
              onPress={() => handleQuickLogin('manager@shiftsync.com', 'password123')}
              style={{ backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 }}
            >
              <Text style={{ fontSize: 12, color: '#1E40AF', fontWeight: '600' }}>Manager CN1</Text>
            </Pressable>
            <Pressable
              onPress={() => handleQuickLogin('admin@shiftsync.com', 'password123')}
              style={{ backgroundColor: '#FAF5FF', borderWidth: 1, borderColor: '#E9D5FF', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 }}
            >
              <Text style={{ fontSize: 12, color: '#6B21A8', fontWeight: '600' }}>Admin</Text>
            </Pressable>
          </View>
        </View>

        <Text style={{ marginTop: 12, textAlign: 'center', fontSize: 11, color: '#999' }}>
          Server: {getBaseUrl()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#EAF6EA',
    justifyContent: 'center',   // căn giữa theo chiều dọc
    alignItems: 'center',       // căn giữa theo chiều ngang
    paddingHorizontal: 20,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  logoText: { fontSize: 24, fontWeight: 'bold', color: '#222' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 380,
  },
  label: { fontSize: 13, color: '#555', marginBottom: 6 },
  input: {
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#f7f7f7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 15,
  },
  inputFocused: {
    borderColor: '#51A33D',  // giống hiệu ứng :focus bên Web
  },
  button: {
    backgroundColor: '#EAF6EA',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonPressed: {
    backgroundColor: '#51A33D', // đổi màu khi nhấn, giống :hover/:active bên Web
    transform: [{ scale: 0.97 }],
  },
  buttonText: { fontWeight: 'bold', color: '#333', fontSize: 16 },
  buttonTextPressed: { color: '#ffffff' },
  error: { color: '#d32f2f', fontSize: 13, marginBottom: 10 },
});
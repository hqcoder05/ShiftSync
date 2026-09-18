import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { login } from '../services/authService';
import { validateLoginForm } from '../utils/validators';
import AsyncStorage from '@react-native-async-storage/async-storage';

// LoginMascot3D chỉ hiển thị trên web runtime (Three.js)
let LoginMascot3D = null;
if (Platform.OS === 'web') {
  try {
    LoginMascot3D = require('../components/LoginMascot3D.web').default;
  } catch (e) {
    LoginMascot3D = null;
  }
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
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [mascotStatus, setMascotStatus] = useState('idle'); // 'idle'|'email'|'password'|'showPassword'|'error'|'success'

  // Xác định trạng thái mascot dựa theo focus và nội dung
  const handleEmailFocus = () => {
    setEmailFocused(true);
    setMascotStatus('email');
  };
  const handleEmailBlur = () => {
    setEmailFocused(false);
    if (!passwordFocused) setMascotStatus('idle');
  };
  const handlePasswordFocus = () => {
    setPasswordFocused(true);
    setMascotStatus(showPassword ? 'showPassword' : 'password');
  };
  const handlePasswordBlur = () => {
    setPasswordFocused(false);
    if (!emailFocused) setMascotStatus('idle');
  };
  const handleTogglePassword = () => {
    const next = !showPassword;
    setShowPassword(next);
    if (passwordFocused) {
      setMascotStatus(next ? 'showPassword' : 'password');
    }
  };

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
      await AsyncStorage.setItem('accessToken', res.data.accessToken);
      setMascotStatus('success');
      setTimeout(() => navigation.replace('MainTabs'), 1400);
    } catch (err) {
      console.log('LOGIN ERROR:', err.message);
      const status = err.response?.status;
      if (status === 401) {
        setError('Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.');
      } else if (status === 0 || !err.response) {
        setError('Không kết nối được server. Hãy đảm bảo backend đang chạy tại cổng 8080.');
      } else {
        setError('Đăng nhập thất bại. Vui lòng thử lại.');
      }
      setMascotStatus('error');
      setTimeout(() => setMascotStatus('idle'), 2500);
    }
  };

  const handleDemoAccess = async () => {
    await AsyncStorage.setItem('accessToken', 'demo-token');
    navigation.replace('MainTabs');
  };

  return (
    <View style={styles.page}>
      <View style={styles.logoRow}>
        <LogoIcon />
        <Text style={styles.logoText}>ShiftSync</Text>
      </View>

      {/* 🎭 Mascot 3D tương tác theo form (chỉ trên Web/Expo Web) */}
      {LoginMascot3D && (
        <View style={styles.mascotContainer}>
          <LoginMascot3D
            status={mascotStatus}
            emailLength={email.length}
            width={260}
            height={180}
          />
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, emailFocused && styles.inputFocused]}
          value={email}
          onChangeText={setEmail}
          onFocus={handleEmailFocus}
          onBlur={handleEmailBlur}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Nhập email..."
        />

        <Text style={styles.label}>Mật khẩu</Text>
        <TextInput
          style={[styles.input, passwordFocused && styles.inputFocused]}
          value={password}
          onChangeText={setPassword}
          onFocus={handlePasswordFocus}
          onBlur={handlePasswordBlur}
          secureTextEntry={true}
          placeholder="Nhập mật khẩu..."
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={handleLogin}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
        >
          {({ pressed }) => (
            <Text style={[styles.buttonText, pressed && styles.buttonTextPressed]}>
              Đăng nhập
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={handleDemoAccess}
          style={{ marginTop: 14, padding: 8, alignItems: 'center' }}
        >
          <Text style={{ color: '#51A33D', fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' }}>
            Vào thẳng Lịch làm việc (Demo Mode) →
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#EAF6EA',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  logoText: { fontSize: 24, fontWeight: 'bold', color: '#222' },
  mascotContainer: {
    marginBottom: 4,
    alignItems: 'center',
  },
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
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputPassword: {
    flex: 1,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#f7f7f7',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  eyeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginLeft: 6,
  },
  eyeIcon: {
    fontSize: 20,
  },
  inputFocused: {
    borderColor: '#51A33D',
  },
  button: {
    backgroundColor: '#EAF6EA',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonPressed: {
    backgroundColor: '#51A33D',
    transform: [{ scale: 0.97 }],
  },
  buttonText: { fontWeight: 'bold', color: '#333', fontSize: 16 },
  buttonTextPressed: { color: '#ffffff' },
  error: { color: '#d32f2f', fontSize: 13, marginBottom: 10 },
});
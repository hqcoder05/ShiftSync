import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { login } from '../services/authService';
import { validateLoginForm } from '../utils/validators';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    const errMsg = validateLoginForm(trimmedEmail, trimmedPassword);
    if (errMsg) { setError(errMsg); return; }

    try {
      const res = await login(trimmedEmail, trimmedPassword);
      await AsyncStorage.setItem('accessToken', res.data.accessToken);
      navigation.replace('MainTabs');
    } catch (err) {
      console.log('LOGIN ERROR:', err.message, JSON.stringify(err.response?.data || {}));
      setError('Sai email hoặc mật khẩu');
    }
  };

  return (
    <View style={styles.page}>
      <View style={styles.logoRow}>
        <LogoIcon />
        <Text style={styles.logoText}>ShiftSync</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, emailFocused && styles.inputFocused]}
          value={email}
          onChangeText={setEmail}
          onFocus={() => setEmailFocused(true)}
          onBlur={() => setEmailFocused(false)}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Mật khẩu</Text>
        <TextInput
          style={[styles.input, passwordFocused && styles.inputFocused]}
          value={password}
          onChangeText={setPassword}
          onFocus={() => setPasswordFocused(true)}
          onBlur={() => setPasswordFocused(false)}
          secureTextEntry
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
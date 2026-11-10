import { colors as uiColors } from '../theme/koreanPalette';
import { createAppStyles } from '../theme/appTheme';
import { ensureTouchTarget } from '../utils/touchTarget';
import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { runApiSessionChange } from '../services/api';
import { login } from '../services/authService';
import { validateLoginForm } from '../utils/validators';
import { registerForPushNotificationsAsync } from '../services/pushNotificationHelper';
import { resetMessagingUnread } from '../services/messagingService';
import { publishUnreadCount } from '../services/notificationService';
import ThreeIllustration from '../components/ThreeIllustration';

function LogoIcon() {
  return (
    <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" accessibilityElementsHidden>
      <Rect x="2" y="4" width="8" height="3" rx="1" fill={uiColors.orange} />
      <Rect x="12" y="4" width="10" height="3" rx="1" fill={uiColors.orange} />
      <Rect x="2" y="10" width="14" height="3" rx="1" fill={uiColors.orange} />
      <Rect x="18" y="10" width="4" height="3" rx="1" fill={uiColors.orange} />
      <Rect x="2" y="16" width="6" height="3" rx="1" fill={uiColors.orange} />
      <Rect x="10" y="16" width="12" height="3" rx="1" fill={uiColors.orange} />
    </Svg>
  );
}

export default function LoginScreen({ navigation }) {
  const passwordRef = useRef(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (submitting) return;
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const validationError = validateLoginForm(trimmedEmail, trimmedPassword);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await login(trimmedEmail, trimmedPassword);
      const { accessToken, refreshToken, role, email: userEmail } = res.data;
      if (!accessToken) throw new Error('Missing access token');
      await runApiSessionChange(() => AsyncStorage.multiSet([
        ['accessToken', accessToken],
        ['refreshToken', refreshToken || ''],
        ['userRole', role || ''],
        ['userEmail', (userEmail || trimmedEmail).trim().toLowerCase()],
      ]));
      publishUnreadCount(0);
      resetMessagingUnread();
      registerForPushNotificationsAsync().catch(() => {});
      navigation.replace('MainTabs');
    } catch (loginError) {
      if (loginError.response?.status === 401) {
        setError('Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.');
      } else if (!loginError.response) {
        setError('Không thể kết nối. Kiểm tra mạng và thử đăng nhập lại.');
      } else {
        setError('Đăng nhập thất bại. Vui lòng thử lại.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={styles.keyboardArea} behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.page}>
          <View style={styles.form}>
            <View style={styles.logoRow}><LogoIcon /><Text style={styles.logoText}>ShiftSync</Text></View>
            <View style={styles.loginArt}><ThreeIllustration kind="calendar" size={112} /><View style={styles.loginArtAccent}><ThreeIllustration kind="clock" size={72} /></View></View>
            <Text accessibilityRole="header" style={styles.title}>Đăng nhập</Text>
            <Text style={styles.subtitle}>Lịch làm việc và đội ngũ của bạn, ở một nơi.</Text>

            <Text style={styles.label}>Email</Text>
            <TextInput accessibilityLabel="Email" style={[styles.input, emailFocused && styles.inputFocused]} value={email} onChangeText={setEmail} onFocus={() => setEmailFocused(true)} onBlur={() => setEmailFocused(false)} autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" keyboardType="email-address" returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} placeholder="Email của bạn" placeholderTextColor={uiColors.muted} editable={!submitting} />

            <Text style={styles.label}>Mật khẩu</Text>
            <View style={[styles.passwordField, passwordFocused && styles.inputFocused]}>
              <TextInput ref={passwordRef} accessibilityLabel="Mật khẩu" style={styles.passwordInput} value={password} onChangeText={setPassword} onFocus={() => setPasswordFocused(true)} onBlur={() => setPasswordFocused(false)} autoCapitalize="none" autoCorrect={false} autoComplete="password" textContentType="password" secureTextEntry={!passwordVisible} returnKeyType="go" onSubmitEditing={handleLogin} placeholder="Mật khẩu của bạn" placeholderTextColor={uiColors.muted} editable={!submitting} />
              <Pressable accessibilityRole="button" accessibilityLabel={passwordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onPress={() => setPasswordVisible((visible) => !visible)} style={ensureTouchTarget(styles.passwordToggle)}>
                <Ionicons name={passwordVisible ? 'eye-off-outline' : 'eye-outline'} size={22} color={uiColors.secondary} accessible={false} />
              </Pressable>
            </View>

            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: submitting, busy: submitting }} aria-disabled={submitting} aria-busy={submitting} disabled={submitting} onPress={handleLogin} style={ensureTouchTarget(({ pressed }) => [styles.button, pressed && styles.buttonPressed, submitting && styles.buttonDisabled])}>
              {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Đăng nhập</Text>}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = createAppStyles({
  safe: { flex: 1, backgroundColor: uiColors.surface },
  keyboardArea: { flex: 1 },
  page: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 36 },
  form: { width: '100%', maxWidth: 420, alignSelf: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 24 },
  loginArt: { height: 130, backgroundColor: uiColors.peach, borderRadius: 24, marginBottom: 28, justifyContent: 'center', alignItems: 'center' },
  loginArtAccent: { position: 'absolute', bottom: 6, right: 24, transform: [{ rotate: '12deg' }] },
  logoText: { fontSize: 25, color: uiColors.ink, fontWeight: '600', letterSpacing: -0.6 },
  title: { fontSize: 30, lineHeight: 38, fontWeight: '600', color: uiColors.ink, marginBottom: 10 },
  subtitle: { fontSize: 14, lineHeight: 21, color: uiColors.muted, marginBottom: 34 },
  label: { fontSize: 14, lineHeight: 20, color: uiColors.ink, marginBottom: 8 },
  input: { minHeight: 52, borderWidth: 1, borderColor: uiColors.lineStrong, borderRadius: 5, backgroundColor: uiColors.surface, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 22, fontSize: 15, color: uiColors.ink },
  inputFocused: { borderColor: uiColors.orange },
  passwordField: { flexDirection: 'row', alignItems: 'center', minHeight: 52, borderWidth: 1, borderColor: uiColors.lineStrong, borderRadius: 5, backgroundColor: uiColors.surface, marginBottom: 22 },
  passwordInput: { flex: 1, minWidth: 0, paddingHorizontal: 14, paddingVertical: 12, minHeight: 50, color: uiColors.ink, fontSize: 15, outlineStyle: 'none' },
  passwordToggle: { width: 48, minHeight: 50, alignItems: 'center', justifyContent: 'center' },
  button: { minHeight: 54, backgroundColor: uiColors.orange, borderRadius: 14, borderBottomWidth: 3, borderBottomColor: uiColors.primaryStrong, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  buttonPressed: { backgroundColor: uiColors.orange },
  buttonDisabled: { opacity: 0.65 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  error: { color: uiColors.dangerText, fontSize: 13, lineHeight: 19, marginBottom: 14 },
});

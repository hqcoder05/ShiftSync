import { colors as uiColors } from '../theme/koreanPalette';
import { createAppStyles } from '../theme/appTheme';
import { ensureTouchTarget } from '../utils/touchTarget';
import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { register } from '../services/authService';
import { validateEmail } from '../utils/validators';

function validateRegistration({ fullName, email, phone, password, confirmPassword }) {
  if (fullName.trim().length < 2) return 'Họ và tên cần ít nhất 2 ký tự.';
  if (!validateEmail(email.trim())) return 'Email không hợp lệ.';
  if (phone.trim() && !/^(?:0|\+84)(?:3|5|7|8|9)\d{8}$/.test(phone.replace(/[\s.-]/g, ''))) return 'Số điện thoại Việt Nam chưa đúng định dạng.';
  if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/.test(password)) return 'Mật khẩu cần từ 8 ký tự, gồm chữ và số.';
  if (password !== confirmPassword) return 'Xác nhận mật khẩu chưa khớp.';
  return '';
}

export default function RegisterScreen({ navigation }) {
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const set = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async () => {
    if (submitting) return;
    const validation = validateRegistration(form);
    if (validation) { setError(validation); return; }
    setSubmitting(true); setError('');
    try {
      await register({ fullName: form.fullName.trim(), email: form.email.trim().toLowerCase(), phone: form.phone.replace(/[\s.-]/g, ''), password: form.password });
      navigation.replace('Login', { email: form.email.trim().toLowerCase(), registered: true });
    } catch (failure) {
      if (failure.response?.status === 409) setError('Email này đã được sử dụng.');
      else if (failure.response?.status === 400) setError(failure.response?.data?.message || 'Thông tin đăng ký chưa hợp lệ.');
      else if (!failure.response) setError('Không thể kết nối máy chủ. Vui lòng thử lại.');
      else setError('Không thể tạo tài khoản. Vui lòng thử lại.');
    } finally { setSubmitting(false); }
  };
  return <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
    <StatusBar style="dark" />
    <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
        <View style={styles.form}>
          <Pressable accessibilityRole="button" accessibilityLabel="Quay lại đăng nhập" onPress={() => navigation.goBack()} style={ensureTouchTarget(styles.back)}><Ionicons accessible={false} name="arrow-back" size={20} color={uiColors.secondary} /><Text style={styles.backText}>Đăng nhập</Text></Pressable>
          <Text accessibilityRole="header" style={styles.title}>Tạo tài khoản Staff</Text>
          <Text style={styles.subtitle}>Dùng tài khoản này để xem lịch, chấm công và nhận thông báo.</Text>
          <Text style={styles.label}>Họ và tên</Text>
          <TextInput accessibilityLabel="Họ và tên" style={styles.input} value={form.fullName} onChangeText={set('fullName')} editable={!submitting} autoComplete="name" returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()} placeholder="Nguyễn Văn A" placeholderTextColor={uiColors.muted} />
          <Text style={styles.label}>Email</Text>
          <TextInput ref={emailRef} accessibilityLabel="Email đăng ký" style={styles.input} value={form.email} onChangeText={set('email')} editable={!submitting} autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" keyboardType="email-address" returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} placeholder="email@cuahang.vn" placeholderTextColor={uiColors.muted} />
          <Text style={styles.label}>Số điện thoại (không bắt buộc)</Text>
          <TextInput accessibilityLabel="Số điện thoại" style={styles.input} value={form.phone} onChangeText={set('phone')} editable={!submitting} autoComplete="tel" textContentType="telephoneNumber" keyboardType="phone-pad" returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} placeholder="0900000000" placeholderTextColor={uiColors.muted} />
          <Text style={styles.label}>Mật khẩu</Text>
          <View style={styles.passwordField}><TextInput ref={passwordRef} accessibilityLabel="Mật khẩu đăng ký" style={styles.passwordInput} value={form.password} onChangeText={set('password')} editable={!submitting} autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" secureTextEntry={!showPassword} returnKeyType="next" onSubmitEditing={() => confirmRef.current?.focus()} placeholder="Ít nhất 8 ký tự, gồm chữ và số" placeholderTextColor={uiColors.muted} /><Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onPress={() => setShowPassword((value) => !value)} style={ensureTouchTarget(styles.eye)}><Ionicons accessible={false} name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={uiColors.secondary} /></Pressable></View>
          <Text style={styles.label}>Xác nhận mật khẩu</Text>
          <TextInput ref={confirmRef} accessibilityLabel="Xác nhận mật khẩu" style={styles.input} value={form.confirmPassword} onChangeText={set('confirmPassword')} editable={!submitting} autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" secureTextEntry={!showPassword} returnKeyType="go" onSubmitEditing={submit} placeholder="Nhập lại mật khẩu" placeholderTextColor={uiColors.muted} />
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: submitting, busy: submitting }} disabled={submitting} onPress={submit} style={ensureTouchTarget(({ pressed }) => [styles.button, pressed && styles.pressed, submitting && styles.disabled])}>{submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Tạo tài khoản</Text>}</Pressable>
          <Text style={styles.hint}>Tài khoản mới được tạo với vai trò Nhân viên (Staff).</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = createAppStyles({
  safe: { flex: 1, backgroundColor: uiColors.surface }, keyboard: { flex: 1 }, page: { flexGrow: 1, paddingHorizontal: 28, paddingVertical: 32 }, form: { width: '100%', maxWidth: 420, alignSelf: 'center' }, back: { minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 24 }, backText: { color: uiColors.secondary, fontSize: 14 }, title: { color: uiColors.ink, fontSize: 28, fontWeight: '600', marginBottom: 10 }, subtitle: { color: uiColors.muted, fontSize: 14, lineHeight: 21, marginBottom: 28 }, label: { color: uiColors.ink, fontSize: 13, marginBottom: 7 }, input: { minHeight: 52, color: uiColors.ink, fontSize: 15, borderWidth: 1, borderColor: uiColors.lineStrong, borderRadius: 7, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 18 }, passwordField: { minHeight: 52, borderWidth: 1, borderColor: uiColors.lineStrong, borderRadius: 7, flexDirection: 'row', alignItems: 'center', marginBottom: 18 }, passwordInput: { minWidth: 0, flex: 1, color: uiColors.ink, fontSize: 15, paddingHorizontal: 14, paddingVertical: 12 }, eye: { minHeight: 50, width: 50, justifyContent: 'center', alignItems: 'center' }, error: { color: uiColors.dangerText, fontSize: 13, lineHeight: 19, marginBottom: 14 }, button: { minHeight: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: uiColors.orange, borderBottomColor: uiColors.primaryStrong, borderBottomWidth: 3, marginTop: 4 }, pressed: { opacity: 0.88 }, disabled: { opacity: 0.6 }, buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' }, hint: { color: uiColors.muted, fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 16 },
});

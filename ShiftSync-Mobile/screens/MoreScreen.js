import { colors as uiColors } from '../theme/koreanPalette';
import { createAppStyles } from '../theme/appTheme';
import { ensureTouchTarget } from '../utils/touchTarget';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import BottomNavbar, { useBottomNavbarPadding } from '../components/BottomNavbar';
import { getMyProfile } from '../services/profileService';
import * as Haptics from 'expo-haptics';
import { useI18n } from '../i18n';
import UserAvatar from '../components/UserAvatar';

const sections = [
  {
    title: 'CÔNG VIỆC',
    items: [
      { label: 'Nhắn tin chi nhánh', icon: 'chatbubbles-outline', screen: 'Messaging' },
      { label: 'Chấm công', icon: 'time-outline', screen: 'Attendance', tab: true },
      { label: 'Chợ ca', icon: 'swap-horizontal-outline', screen: 'Marketplace' },
      { label: 'Yêu cầu của tôi', icon: 'document-text-outline', screen: 'Request', tab: true },
      { label: 'Báo cáo sự cố', icon: 'alert-circle-outline', screen: 'IncidentReport' },
      { label: 'Hoạt động của tôi', icon: 'time-outline', screen: 'ActivityTimeline' },
      { label: 'Lịch sử điều chỉnh ca', icon: 'calendar-outline', screen: 'ScheduleHistory' },
      { label: 'Thời gian rảnh', icon: 'calendar-clear-outline', screen: 'Availability' },
      { label: 'Phiếu lương', icon: 'wallet-outline', screen: 'Payroll', tab: true },
    ],
  },
  {
    title: 'TÀI KHOẢN',
    items: [
      { label: 'Hồ sơ của tôi', icon: 'person-circle-outline', screen: 'Profile' },
      { label: 'Thông báo', icon: 'notifications-outline', screen: 'Notification' },
      { label: 'Kiểm tra thiết bị', icon: 'pulse-outline', screen: 'DeviceDiagnostics' },
      { label: 'Trung tâm trợ giúp', icon: 'help-circle-outline', screen: 'HelpCenter' },
    ],
  },
];

export default function MoreScreen({ navigation }) {
  const { t, language, setLanguage } = useI18n();
  const [languageError, setLanguageError] = useState(false);
  const bottomPadding = useBottomNavbarPadding();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const loadProfile = () => getMyProfile()
      .then((res) => { if (active) setProfile(res.data); })
      .catch(() => {}).finally(() => { if (active) setLoading(false); });
    loadProfile();
    const unsubscribe = navigation.addListener('focus', loadProfile);
    return () => { active = false; unsubscribe(); };
  }, [navigation]);

  const open = (item) => { Haptics.selectionAsync().catch(() => {}); return item.tab
    ? navigation.navigate('MainTabs', { screen: item.screen }, { pop: true })
    : navigation.navigate(item.screen, undefined, { pop: true }); };
  const name = profile?.fullName || profile?.name || t('yourAccount');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <View style={styles.header}><Text accessibilityRole="header" style={styles.title}>{t('More')}</Text></View>
      <ScrollView contentContainerStyle={{ paddingBottom: bottomPadding }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('viewProfile')} onPress={() => navigation.navigate('Profile', undefined, { pop: true })} style={ensureTouchTarget(styles.profile)}>
          <View style={styles.avatar}><UserAvatar avatarId={profile?.avatarId || 'dilan'} size={64} /></View>
          <View style={styles.copy}>
            {loading ? <ActivityIndicator color={uiColors.primaryStrong} style={{ alignSelf: 'flex-start' }} /> : <Text style={styles.name}>{name}</Text>}
            <Text numberOfLines={1} style={styles.email}>{profile?.email || t('editProfile')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={19} color={uiColors.muted} accessible={false} />
        </Pressable>
        {sections.map((section) => <View key={section.title}>
          <Text style={styles.sectionTitle}>{t(section.title === 'CÔNG VIỆC' ? 'work' : 'account')}</Text>
          <View style={styles.menuCard}>
          {section.items.map((item, index) => <Pressable key={item.screen} accessibilityRole="button" accessibilityLabel={t(item.screen)} onPress={() => open(item)} style={ensureTouchTarget(({ pressed }) => [styles.row, index === section.items.length - 1 && styles.rowLast, pressed && styles.pressed])}>
            <View style={styles.menuIcon}><Ionicons name={item.icon} size={23} color={uiColors.secondary} accessible={false} /></View>
            <Text style={styles.rowText}>{t(item.screen)}</Text>
            <Ionicons name="chevron-forward" size={16} color={uiColors.muted} accessible={false} />
          </Pressable>)}
          </View>
        </View>)}
        <View style={styles.languageCard}>
          <Text accessibilityRole="header" style={styles.languageTitle}>{t('language')}</Text>
          <Text style={[styles.email, { marginBottom: 10 }]}>{t('languageHint')}</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {[['vi', 'Tiếng Việt'], ['en', 'English']].map(([value, label]) => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: language === value }} aria-checked={language === value} onPress={() => { setLanguageError(false); setLanguage(value).catch(() => setLanguageError(true)); }} style={ensureTouchTarget([styles.languageOption, language === value && styles.languageOptionSelected])}><Text style={[styles.languageOptionText, language === value && styles.languageOptionTextSelected]}>{label}</Text></Pressable>)}
          </View>
          {languageError && <Text accessibilityRole="alert" style={styles.email}>Chưa lưu được ngôn ngữ. Vui lòng chọn lại.</Text>}
        </View>
        <Text style={styles.brand}>ShiftSync</Text>
      </ScrollView>
      <BottomNavbar navigation={navigation} activeRoute="More" />
    </SafeAreaView>
  );
}

const styles = createAppStyles({
  safe: { flex: 1, backgroundColor: uiColors.canvas },
  header: { minHeight: 64, justifyContent: 'center', paddingHorizontal: 24, backgroundColor: uiColors.surface },
  title: { fontSize: 24, color: uiColors.ink, fontWeight: '700', letterSpacing: -0.5 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, marginHorizontal: 20, marginTop: 16, marginBottom: 8, borderRadius: 20, backgroundColor: uiColors.surface, minHeight: 108 },
  avatar: { width: 68, height: 68, backgroundColor: uiColors.canvas, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  menuIcon: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  name: { color: uiColors.ink, fontSize: 18, lineHeight: 25, fontWeight: '600', letterSpacing: -0.3 },
  email: { color: uiColors.muted, fontSize: 12, lineHeight: 18, marginTop: 5 },
  sectionTitle: { paddingHorizontal: 24, paddingTop: 22, paddingBottom: 10, color: uiColors.secondary, fontSize: 12, fontWeight: '600' },
  menuCard: { marginHorizontal: 20, borderRadius: 20, backgroundColor: uiColors.surface, paddingHorizontal: 18, overflow: 'hidden' },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: uiColors.line },
  rowLast: { borderBottomWidth: 0 },
  rowText: { flex: 1, minWidth: 0, color: uiColors.ink, fontSize: 14, lineHeight: 21, fontWeight: '500' },
  pressed: { backgroundColor: uiColors.canvas },
  languageCard: { marginHorizontal: 20, marginTop: 20, padding: 18, backgroundColor: uiColors.surface, borderRadius: 20 },
  languageTitle: { color: uiColors.ink, fontSize: 15, fontWeight: '600' },
  languageOption: { flex: 1, minHeight: 48, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: uiColors.line, backgroundColor: uiColors.surface, justifyContent: 'center', alignItems: 'center' },
  languageOptionSelected: { borderColor: uiColors.primary, backgroundColor: uiColors.peach },
  languageOptionText: { color: uiColors.secondary, fontSize: 13, fontWeight: '500' },
  languageOptionTextSelected: { color: uiColors.primaryStrong },
  brand: { textAlign: 'center', fontSize: 12, color: uiColors.muted, paddingVertical: 26 },
});

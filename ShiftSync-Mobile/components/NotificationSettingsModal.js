import React from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ThreeIllustration from './ThreeIllustration';
import { colors } from '../theme/appTheme';
import { ensureTouchTarget } from '../utils/touchTarget';

const preferenceCopy = {
  SCHEDULE_PUBLISHED: { title: 'Lịch làm mới', body: 'Biết ngay khi lịch làm được phát hành.', label: 'Thông báo lịch làm' },
  SHIFT_SWAP_UPDATED: { title: 'Trao đổi ca làm', body: 'Theo dõi phản hồi về yêu cầu đổi ca.', label: 'Thông báo đổi ca' },
  OPEN_SHIFT_AVAILABLE: { title: 'Ca làm đang mở', body: 'Cập nhật khi cửa hàng cần thêm người.', label: 'Thông báo ca mở' },
  SHIFT_REMINDER: { title: 'Nhắc lịch làm', body: 'Nhận lời nhắc ca từ cửa hàng.', label: 'Thông báo nhắc ca' },
  PAYROLL_COMPLETED: { title: 'Phiếu lương', body: 'Biết khi có phiếu lương mới.', label: 'Thông báo phiếu lương' },
  LEAVE_REQUEST_UPDATED: { title: 'Yêu cầu nghỉ phép', body: 'Nhận kết quả xét duyệt nghỉ phép.', label: 'Thông báo nghỉ phép' },
  ATTENDANCE_ADJUSTMENT_UPDATED: { title: 'Điều chỉnh chấm công', body: 'Theo dõi phản hồi về giờ vào và ra ca.', label: 'Thông báo điều chỉnh chấm công' },
  WORKFORCE_REQUEST_UPDATED: { title: 'Hỗ trợ nhân sự', body: 'Nhận cập nhật về yêu cầu hỗ trợ ca làm.', label: 'Thông báo hỗ trợ nhân sự' },
};

function PreferenceRow({ title, body, label, value, disabled, onChange, saving, last }) {
  return <View style={[styles.optionRow, last && styles.lastOption]}>
    <View style={styles.optionCopy}>
      <Text style={styles.optionTitle}>{title}</Text>
      <Text style={styles.optionBody}>{body}</Text>
      {saving && <Text accessibilityLiveRegion="polite" style={styles.savingText}>Đang lưu…</Text>}
    </View>
    <View style={styles.switchTarget}><Switch
      accessibilityLabel={label}
      value={!!value}
      disabled={!!disabled}
      onValueChange={onChange}
      trackColor={{ false: colors.line, true: colors.primaryTrack }}
      thumbColor={value ? colors.orange : colors.surface}
      ios_backgroundColor={colors.line}
      hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
      style={styles.optionSwitch}
    /></View>
  </View>;
}

export default function NotificationSettingsModal({
  visible,
  onClose,
  preferences = [],
  remindersEnabled,
  onTogglePreference,
  onToggleReminders,
  busy = {},
  loading = false,
  error = null,
  onRetry,
}) {
  const { width, height } = useWindowDimensions();
  const options = Array.isArray(preferences) ? preferences.filter(item => item?.notificationType) : [];
  const saving = !!busy.reminders || options.some(item => !!busy[`preference:${item.notificationType}`]);
  const openAlarmSettings = () => Linking.sendIntent('android.settings.REQUEST_SCHEDULE_EXACT_ALARM').catch(() => Linking.openSettings());

  return <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
    <View style={styles.overlay}>
      <Pressable accessible={false} importantForAccessibility="no" style={StyleSheet.absoluteFill} onPress={onClose} />
      <View
        testID="notification-settings-modal"
        accessibilityViewIsModal
        style={[styles.sheet, { width: Math.min(440, width - 28), maxHeight: height * 0.9 }]}
      >
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.headerTitle}>Cài đặt thông báo</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Đóng cài đặt thông báo" onPress={onClose} style={ensureTouchTarget(styles.close)}>
            <Ionicons name="close" size={23} color={colors.secondary} accessible={false} />
          </Pressable>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
          <View style={styles.hero}>
            <View style={styles.heroRow}>
              <View style={styles.heroCopy}>
                <Text style={styles.eyebrow}>LỰA CHỌN CỦA BẠN</Text>
                <Text style={styles.heroTitle}>Thông báo theo cách của bạn</Text>
              </View>
              <ThreeIllustration kind="fox" size={110} animated interactive />
            </View>
            <Text style={styles.heroBody}>Giữ những cập nhật quan trọng, để mỗi ca làm nhẹ nhàng hơn.</Text>
          </View>

          <View style={styles.sectionHeading}><View style={styles.sectionDot} /><Text style={styles.sectionLabel}>TRƯỚC GIỜ VÀO CA</Text></View>
          <View style={styles.optionGroup}>
            <PreferenceRow
              title="Nhắc ca trước 60 và 30 phút"
              body={Platform.OS === 'web' ? 'Bật nhắc ca trong ứng dụng ShiftSync trên điện thoại.' : 'Nhắc bạn chuẩn bị trước khi đến giờ làm, kể cả khi không có mạng.'}
              label="Nhắc ca trước 60 và 30 phút"
              value={remindersEnabled}
              disabled={!!busy.reminders || loading || Platform.OS === 'web'}
              onChange={onToggleReminders}
              saving={!!busy.reminders}
              last
            />
          </View>
          {Platform.OS === 'web' && <Text style={styles.platformHint}>Nhắc ca trên điện thoại · Không khả dụng trên bản web</Text>}
          {Platform.OS === 'android' && <View style={styles.alarmNote}>
            <Text style={styles.alarmBody}>Cho phép “Báo thức và lời nhắc” để Android nhắc ca đúng lúc hơn.</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Cài đặt báo thức và lời nhắc" onPress={openAlarmSettings} style={ensureTouchTarget(styles.alarmButton)}><Text style={styles.alarmLink}>Mở cài đặt trên thiết bị</Text></Pressable>
          </View>}

          <View style={styles.sectionHeading}><View style={[styles.sectionDot, styles.mintDot]} /><Text style={styles.sectionLabel}>CẬP NHẬT TRONG CÔNG VIỆC</Text></View>
          {loading && <View testID="notification-settings-loading" accessibilityLiveRegion="polite" style={styles.loading}>
            <ActivityIndicator size="small" color={colors.orange} /><Text style={styles.loadingText}>Đang tải tùy chọn của bạn…</Text>
          </View>}
          {!!error && <View style={styles.errorBox}>
            <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>
            {!!onRetry && <Pressable accessibilityRole="button" accessibilityLabel="Thử lại cài đặt thông báo" onPress={onRetry} disabled={loading} style={ensureTouchTarget(styles.retry)}><Text style={styles.retryText}>Thử lại</Text></Pressable>}
          </View>}
          {options.length > 0 && <View style={styles.optionGroup}>
            {options.map((item, index) => {
              const copy = preferenceCopy[item.notificationType] || { title: 'Cập nhật khác', body: 'Những thông tin khác từ cửa hàng của bạn.', label: 'Thông báo khác' };
              const pending = !!busy[`preference:${item.notificationType}`];
              return <PreferenceRow key={item.notificationType} {...copy} value={item.enabled} disabled={pending || loading} saving={pending} onChange={enabled => onTogglePreference?.(item, enabled)} last={index === options.length - 1} />;
            })}
          </View>}
          {!loading && !error && options.length === 0 && <Text style={styles.emptyText}>Hiện chưa có thêm tùy chọn theo tài khoản của bạn.</Text>}
        </ScrollView>

        <View style={styles.footer}>
          <Text accessibilityLiveRegion="polite" style={styles.footerHint}>{saving ? 'Đang lưu lựa chọn của bạn…' : 'Thay đổi được lưu khi bạn bật hoặc tắt.'}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Xong" accessibilityState={{ disabled: saving, busy: saving }} disabled={saving} onPress={onClose} style={ensureTouchTarget(({ pressed }) => [styles.done, pressed && styles.donePressed, saving && { opacity: 0.65 }])}>
            <Text style={styles.doneText}>Xong</Text>
          </Pressable>
        </View>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  switchTarget: { width: 52, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, backgroundColor: '#28313B80' },
  sheet: { backgroundColor: colors.surface, borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: colors.surface, shadowColor: colors.ink, shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.18, shadowRadius: 28, elevation: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 60, paddingLeft: 20, paddingRight: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
  headerTitle: { flex: 1, minWidth: 0, fontSize: 17, fontWeight: '600', letterSpacing: -0.3, color: colors.ink },
  close: { alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  scroll: { flexGrow: 0, flexShrink: 1 }, scrollContent: { padding: 16, paddingBottom: 10 },
  hero: { backgroundColor: colors.peach, borderRadius: 18, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 2 }, heroCopy: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: 8, lineHeight: 12, letterSpacing: 1.1, fontWeight: '700', color: colors.primaryStrong, marginBottom: 8 },
  heroTitle: { fontSize: 21, lineHeight: 27, fontWeight: '600', letterSpacing: -0.5, color: colors.ink },
  heroBody: { fontSize: 12, lineHeight: 18, color: colors.secondary, marginTop: 9 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 22, marginBottom: 10, marginLeft: 2 }, sectionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.orange }, mintDot: { backgroundColor: colors.success }, sectionLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.9, color: colors.muted, flexShrink: 1 },
  optionGroup: { borderWidth: 1, borderColor: colors.line, borderRadius: 18, backgroundColor: colors.surface, paddingHorizontal: 13 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 13, minHeight: 78, borderBottomWidth: 1, borderBottomColor: colors.line }, lastOption: { borderBottomWidth: 0 }, optionCopy: { flex: 1, minWidth: 0 }, optionTitle: { fontSize: 13, lineHeight: 19, fontWeight: '600', color: colors.ink }, optionBody: { fontSize: 11, lineHeight: 17, color: colors.muted, marginTop: 4 }, optionSwitch: { alignSelf: 'center' }, savingText: { color: colors.primaryStrong, fontSize: 10, marginTop: 3 },
  platformHint: { alignSelf: 'flex-start', color: colors.warningText, fontSize: 10, lineHeight: 16, backgroundColor: colors.butter, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, marginTop: 8 },
  alarmNote: { marginTop: 9, borderRadius: 12, backgroundColor: colors.sky, paddingHorizontal: 11, paddingTop: 10 }, alarmBody: { color: colors.secondary, fontSize: 11, lineHeight: 17 }, alarmButton: { justifyContent: 'center', alignSelf: 'flex-start' }, alarmLink: { color: colors.primaryStrong, fontSize: 12, fontWeight: '600' },
  loading: { paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }, loadingText: { color: colors.muted, fontSize: 12, flexShrink: 1 },
  errorBox: { marginBottom: 10, paddingHorizontal: 12, paddingTop: 11, borderRadius: 13, backgroundColor: colors.rose, borderWidth: 1, borderColor: '#E8CBD0' }, errorText: { color: colors.dangerText, fontSize: 12, lineHeight: 18 }, retry: { alignSelf: 'flex-start', justifyContent: 'center' }, retryText: { color: colors.dangerText, fontSize: 12, fontWeight: '600' }, emptyText: { color: colors.muted, fontSize: 12, lineHeight: 18, padding: 12, textAlign: 'center' },
  footer: { borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 18, paddingTop: 11, paddingBottom: 16, backgroundColor: colors.surface }, footerHint: { fontSize: 10, lineHeight: 16, color: colors.muted, textAlign: 'center', marginBottom: 9 },
  done: { minHeight: 50, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: 14 }, donePressed: { opacity: 0.85 }, doneText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});

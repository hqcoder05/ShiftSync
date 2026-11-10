import { colors as uiColors } from '../theme/koreanPalette';
import ThreeIllustration from '../components/ThreeIllustration';
import { createAppStyles } from '../theme/appTheme';
import { ensureTouchTarget } from '../utils/touchTarget';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import BackIcon from '../components/BackIcon';
import BottomNavbar, { useBottomNavbarPadding } from '../components/BottomNavbar';
import { loadHelpCenterContext, saveSupportContact } from '../services/helpCenterService';
import { showAlert } from '../utils/alert';
import useActionGuard from '../utils/useActionGuard';

const FAQS = [
  { id: 'attendance', title: 'Chấm công bằng ảnh và GPS như thế nào?', icon: 'camera-outline', answer: '1. Mở Chấm công và kiểm tra đúng ca, đúng chi nhánh.\n2. Bật vị trí chính xác, cho phép Camera và Vị trí. Bạn cần ở trong phạm vi GPS do chi nhánh cấu hình.\n3. Chọn Bắt đầu ca hoặc Kết thúc ca, chụp ảnh xác nhận. Ứng dụng lấy lại vị trí khi chụp.\n4. Kiểm tra thông báo và lịch sử chấm công. Chỉ bản được máy chủ tiếp nhận mới là kết quả đã đồng bộ.' },
  { id: 'offline', title: 'Mất mạng khi chấm công thì sao?', icon: 'cloud-offline-outline', answer: 'Khi đã có ca làm, tọa độ và cấu hình cửa hàng trên thiết bị, ảnh, GPS và giờ chụp gốc có thể được lưu vào hàng đợi. Ứng dụng thử gửi lại khi có mạng hoặc khi bạn mở lại ứng dụng. Bản chờ gửi chưa phải chấm công đã được xác nhận. Nếu hiện “Cần kiểm tra”, hãy xem lý do và liên hệ quản lý; bản bị máy chủ từ chối cần được xử lý trước.' },
  { id: 'availability', title: 'Hạn đăng ký lịch rảnh là khi nào?', icon: 'calendar-outline', answer: 'Đăng ký lịch rảnh cho tuần kế tiếp từ Thứ Hai đến trước hạn 23:59 Thứ Sáu, theo giờ Việt Nam. Sau hạn, tuần đó chỉ được xem và không thể thêm, sửa hoặc xóa. Lịch rảnh không tự tạo ca làm; hãy xem Lịch làm để biết ca đã được phân công.' },
  { id: 'swap', title: 'Đổi ca có hiệu lực ngay sau khi gửi không?', icon: 'swap-horizontal-outline', answer: 'Chọn ca sắp tới của bạn và ca được phân công cho đồng nghiệp trong cùng chi nhánh. Ứng dụng kiểm tra trùng lịch trước khi gửi. Đồng nghiệp cần đồng ý, sau đó quản lý mới phê duyệt chính thức. Theo dõi trạng thái và dòng thời gian trong Yêu cầu; lịch làm chưa đổi khi yêu cầu còn chờ.' },
  { id: 'claim', title: 'Vì sao tôi không nhận được ca trên Chợ ca?', icon: 'storefront-outline', answer: 'Ca có thể đã đủ người, trùng lịch làm, không phù hợp kỹ năng hoặc vượt giới hạn giờ làm. Ứng dụng cần mạng để kiểm tra lịch mới nhất trước khi gửi nhận ca. Máy chủ kiểm tra lại các điều kiện khi xử lý; hãy tải lại Chợ ca nếu dữ liệu vừa thay đổi.' },
  { id: 'correction', title: 'Quên chấm công hoặc giờ ghi nhận chưa đúng?', icon: 'time-outline', answer: 'Mở Chấm công, kiểm tra lịch sử và các bản đang chờ gửi trước để tránh gửi trùng. Dùng mục điều chỉnh chấm công, nhập giờ và lý do đúng thực tế rồi gửi quản lý duyệt. Gửi yêu cầu điều chỉnh chưa làm thay đổi bản chấm công chính thức.' },
];

export default function HelpCenterScreen({ navigation }) {
  const bottomPadding = useBottomNavbarPadding();
  const { runAction, busy } = useActionGuard();
  const [expanded, setExpanded] = useState('attendance');
  const answerOpacity = useRef(new Animated.Value(1)).current;
  const [context, setContext] = useState(null);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [phone, setPhone] = useState('');
  const [label, setLabel] = useState('');
  const [editing, setEditing] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const selectedStore = useRef(null);
  const generation = useRef(0);

  const load = async (storeId = selectedStore.current) => {
    const request = ++generation.current;
    selectedStore.current = storeId;
    setLoading(true); setError(null); setContext(null); setEditing(false); setSaveError(null);
    try {
      const next = await loadHelpCenterContext(storeId);
      if (request !== generation.current) return;
      selectedStore.current = next.store?.storeId || next.store?.id || null;
      setContext(next); setStores(next.stores);
      setPhone(next.contact?.supportPhone || ''); setLabel(next.contact?.supportLabel || '');
    } catch (issue) {
      if (request === generation.current) {
        setError(issue.response?.data?.message || 'Chưa tải được hỗ trợ chi nhánh. Kiểm tra kết nối rồi thử lại.');
      }
    } finally { if (request === generation.current) setLoading(false); }
  };

  useEffect(() => {
    load();
    const stop = navigation.addListener?.('focus', () => load());
    return () => { generation.current += 1; answerOpacity.stopAnimation(); stop?.(); };
  }, [navigation]);

  const toggleFaq = (id) => {
    const next = expanded === id ? null : id;
    answerOpacity.stopAnimation();
    answerOpacity.setValue(next ? 0 : 1);
    setExpanded(next);
    if (next) Animated.timing(answerOpacity, { toValue: 1, duration: 180, useNativeDriver: false }).start();
  };

  const storeId = context?.store?.storeId || context?.store?.id;
  const canConfigure = ['MANAGER', 'ADMIN'].includes(context?.user?.systemRole);
  const supportPhone = context?.contact?.supportPhone;
  const dial = () => runAction('dial', async () => {
    if (!supportPhone || !/^\+?\d{3,15}$/.test(supportPhone)) return;
    try { await Linking.openURL(`tel:${supportPhone}`); }
    catch { showAlert('Không mở được ứng dụng điện thoại', `Bạn có thể nhập ${supportPhone} trong ứng dụng điện thoại để gọi hỗ trợ chi nhánh.`); }
  });
  const save = () => runAction('save-support', async () => {
    const request = generation.current;
    setSaveError(null);
    try {
      const contact = await saveSupportContact(storeId, { supportPhone: phone, supportLabel: label }, context.email);
      if (request !== generation.current) return;
      setContext((previous) => ({ ...previous, contact, supportError: null }));
      setPhone(contact.supportPhone || ''); setLabel(contact.supportLabel || ''); setEditing(false);
      showAlert('Đã lưu hotline', 'Thông tin hỗ trợ của chi nhánh đã được cập nhật.');
    } catch (issue) {
      if (request === generation.current) setSaveError(issue.response?.data?.message || issue.message || 'Chưa lưu được. Vui lòng thử lại.');
    }
  });

  return <SafeAreaView style={styles.page} edges={['top', 'left', 'right']}>
    <View style={styles.header}>
      <Pressable onPress={() => navigation.goBack()} style={ensureTouchTarget(styles.back)} accessibilityRole="button" accessibilityLabel="Quay lại"><BackIcon /></Pressable>
      <View style={styles.headerCopy}><Text style={styles.title} accessibilityRole="header">Trung tâm trợ giúp</Text><Text style={styles.subtitle}>Hướng dẫn và hỗ trợ chi nhánh</Text></View>
    </View>
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + 24 }]} keyboardShouldPersistTaps="handled">
      <View style={styles.intro}><ThreeIllustration kind="beaver" size={112} animated interactive /><View style={styles.introCopy}><Text style={styles.introTitle}>Bạn cần hỗ trợ?</Text><Text style={styles.body}>Tìm hướng dẫn nhanh hoặc mở điện thoại để liên hệ hotline của chi nhánh.</Text></View></View>
      <Text style={styles.sectionTitle} accessibilityRole="header">Liên hệ khi cần hỗ trợ khẩn cấp</Text>
      {stores.length > 1 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storePills}>{stores.map((store) => {
        const id = store.storeId || store.id, selected = String(id) === String(selectedStore.current);
        return <Pressable key={id} onPress={() => load(id)} accessibilityRole="button" accessibilityState={{ selected }} aria-selected={selected} style={ensureTouchTarget([styles.storePill, selected && styles.selectedPill])}><Text style={[styles.storeText, selected && styles.selectedText]}>{store.storeName || store.name || 'Chi nhánh'}</Text></Pressable>;
      })}</ScrollView>}
      <View style={styles.supportCard}>
        {loading ? <View style={styles.loading}><ActivityIndicator color={uiColors.primaryStrong} /><Text style={styles.body}>Đang tải hỗ trợ chi nhánh...</Text></View> : error ? <><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Pressable onPress={() => load()} style={ensureTouchTarget(styles.textButton)} accessibilityRole="button"><Text style={styles.link}>Thử lại</Text></Pressable></> : !context?.store ? <Text style={styles.body}>Bạn chưa có chi nhánh đang hoạt động để hiển thị hotline hỗ trợ.</Text> : <>
          <Text style={styles.supportStore}>{context.store.storeName || context.store.name || 'Chi nhánh của bạn'}</Text>
          {context.supportError ? <><Text style={styles.error} accessibilityRole="alert">Chưa tải được hotline của chi nhánh.</Text><Pressable onPress={() => load()} style={ensureTouchTarget(styles.textButton)} accessibilityRole="button"><Text style={styles.link}>Tải lại hotline</Text></Pressable></> : supportPhone ? <><Text style={styles.body}>{context.contact.supportLabel || 'Hotline hỗ trợ chi nhánh'}</Text><Text style={styles.phone}>{supportPhone}</Text><Pressable onPress={dial} disabled={busy.dial} accessibilityRole="button" accessibilityLabel={`Mở điện thoại gọi hỗ trợ chi nhánh ${supportPhone}`} style={ensureTouchTarget(styles.callButton)}><Ionicons name="call-outline" size={20} color="#FFFFFF" accessible={false} /><Text style={styles.callText}>Gọi hỗ trợ chi nhánh</Text></Pressable><Text style={styles.hint}>Nút mở ứng dụng điện thoại để bạn xác nhận cuộc gọi.</Text></> : <><Text style={styles.body}>Chi nhánh chưa cấu hình hotline hỗ trợ.</Text><Pressable onPress={() => navigation.navigate('Messaging', undefined, { pop: true })} style={ensureTouchTarget(styles.textButton)} accessibilityRole="button"><Text style={styles.link}>Liên hệ quản lý qua Nhắn tin</Text></Pressable></>}
          <Text style={styles.hint}>Đây là số hỗ trợ nội bộ do chi nhánh cung cấp.</Text>
          {canConfigure && !context.supportError && <>
            <Pressable onPress={() => { setEditing(!editing); setSaveError(null); }} style={ensureTouchTarget(styles.textButton)} accessibilityRole="button" accessibilityState={{ expanded: editing }} aria-expanded={editing}><Text style={styles.link}>{editing ? 'Đóng cấu hình' : 'Cấu hình hotline chi nhánh'}</Text></Pressable>
            {editing && <View style={styles.configuration}>
              <Text style={styles.inputLabel}>Tên liên hệ</Text><TextInput style={styles.input} value={label} onChangeText={setLabel} maxLength={80} accessibilityLabel="Tên liên hệ hotline" placeholder="Ví dụ: Hỗ trợ ca làm" editable={!busy['save-support']} />
              <Text style={styles.inputLabel}>Hotline công ty / chi nhánh</Text><TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" accessibilityLabel="Hotline công ty hoặc chi nhánh" placeholder="3–15 chữ số, có thể bắt đầu bằng +" editable={!busy['save-support']} />
              <Text style={styles.hint}>Chỉ dùng số được phép công bố cho nhân viên. Để trống hotline rồi lưu nếu muốn gỡ số hỗ trợ.</Text>
              {saveError && <Text style={styles.error} accessibilityRole="alert">{saveError}</Text>}
              <Pressable onPress={save} disabled={busy['save-support']} style={ensureTouchTarget(styles.saveButton)} accessibilityRole="button" accessibilityState={{ disabled: !!busy['save-support'], busy: !!busy['save-support'] }} aria-disabled={!!busy['save-support']} aria-busy={!!busy['save-support']}>{busy['save-support'] ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.callText}>Lưu hotline</Text>}</Pressable>
            </View>}
          </>}
        </>}
      </View>
      <Text style={styles.sectionTitle} accessibilityRole="header">Câu hỏi thường gặp</Text>
      {context?.configuration?.geofenceRadiusM > 0 && <View style={styles.radiusNote}><Ionicons name="location-outline" size={20} color={uiColors.successStrong} accessible={false} /><Text style={styles.radiusText}>Phạm vi chấm công của chi nhánh đang chọn: {context.configuration.geofenceRadiusM} m.</Text></View>}
      {FAQS.map((faq) => {
        const open = expanded === faq.id;
        return <View key={faq.id} style={styles.faq}>
          <Pressable style={ensureTouchTarget(styles.faqButton)} onPress={() => toggleFaq(faq.id)} accessibilityRole="button" accessibilityState={{ expanded: open }} aria-expanded={open} accessibilityLabel={faq.title}>
            <Ionicons name={faq.icon} size={21} color={uiColors.primaryStrong} accessible={false} /><Text style={styles.question}>{faq.title}</Text><Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={uiColors.muted} accessible={false} />
          </Pressable>
          {open && <Animated.Text style={[styles.answer, { opacity: answerOpacity }]}>{faq.answer}</Animated.Text>}
        </View>;
      })}
    </ScrollView>
    <BottomNavbar navigation={navigation} activeRoute="More" />
  </SafeAreaView>;
}

const styles = createAppStyles({
  page: { flex: 1, backgroundColor: uiColors.surface }, header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: uiColors.line },
  back: { width: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center', marginRight: 6 }, headerCopy: { flex: 1 }, title: { fontSize: 21, lineHeight: 28, fontWeight: '600', color: uiColors.ink }, subtitle: { fontSize: 12, lineHeight: 19, color: uiColors.muted, marginTop: 2 },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 20 }, intro: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: uiColors.peach, borderRadius: 12, padding: 17, marginBottom: 8 }, introCopy: { flex: 1 }, introTitle: { fontSize: 18, lineHeight: 26, fontWeight: '600', color: uiColors.primaryStrong, marginBottom: 3 }, body: { color: uiColors.secondary, fontSize: 14, lineHeight: 22 },
  sectionTitle: { fontSize: 17, lineHeight: 25, fontWeight: '600', color: uiColors.ink, marginTop: 24, marginBottom: 12 }, storePills: { gap: 8, paddingBottom: 12 }, storePill: { minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 22, backgroundColor: uiColors.canvas, borderWidth: 1, borderColor: uiColors.line }, selectedPill: { backgroundColor: uiColors.peach, borderColor: uiColors.orange }, storeText: { fontSize: 13, color: uiColors.secondary }, selectedText: { color: uiColors.primaryStrong, fontWeight: '600' },
  supportCard: { padding: 17, borderWidth: 1, borderColor: uiColors.line, borderRadius: 12 }, supportStore: { fontSize: 16, lineHeight: 24, color: uiColors.ink, fontWeight: '600', marginBottom: 6 }, phone: { fontSize: 25, lineHeight: 35, color: uiColors.ink, fontWeight: '600', marginTop: 7 }, loading: { flexDirection: 'row', alignItems: 'center', gap: 10 }, callButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: uiColors.orange, minHeight: 48, paddingHorizontal: 12, borderRadius: 8, marginTop: 14 }, callText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 }, hint: { color: uiColors.muted, fontSize: 12, lineHeight: 19, marginTop: 8 }, textButton: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingVertical: 8 }, link: { color: uiColors.primaryStrong, fontSize: 14, lineHeight: 21, fontWeight: '500' }, error: { color: uiColors.dangerStrong, fontSize: 13, lineHeight: 21, marginTop: 5 },
  configuration: { borderTopWidth: 1, borderTopColor: uiColors.line, paddingTop: 10 }, inputLabel: { fontSize: 13, lineHeight: 20, color: "#404B57", fontWeight: '600', marginTop: 8, marginBottom: 6 }, input: { borderWidth: 1, borderColor: uiColors.lineStrong, borderRadius: 8, minHeight: 46, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: uiColors.ink }, saveButton: { backgroundColor: uiColors.orange, minHeight: 46, justifyContent: 'center', alignItems: 'center', borderRadius: 8, marginTop: 14 },
  radiusNote: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: uiColors.mint, borderRadius: 8, padding: 12, marginBottom: 12 }, radiusText: { flex: 1, fontSize: 13, lineHeight: 20, color: uiColors.successStrong }, faq: { borderWidth: 1, borderColor: uiColors.line, borderRadius: 10, marginBottom: 10, overflow: 'hidden' }, faqButton: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 }, question: { flex: 1, color: uiColors.ink, fontSize: 14, lineHeight: 21, fontWeight: '500' }, answer: { fontSize: 14, lineHeight: 24, color: uiColors.secondary, paddingHorizontal: 16, paddingBottom: 16 },
});

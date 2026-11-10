import { colors as uiColors } from '../theme/koreanPalette';
import { createAppStyles } from '../theme/appTheme';
import { ensureTouchTarget } from '../utils/touchTarget';
import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { FlatList, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import BackIcon from '../components/BackIcon';
import BottomNavbar, { useBottomNavbarPadding } from '../components/BottomNavbar';
import { getMyProfile, getMyStores } from '../services/profileService';
import { getNetworkSnapshot, subscribeNetwork } from '../services/networkState';
import { getScheduleHistory, historyChanges, historyWeekRange, historyWeekStart, moveHistoryWeek } from '../services/scheduleHistoryService';

const statusName = { DRAFT: 'Chưa công bố', PUBLISHED: 'Đã công bố', CANCELLED: 'Đã hủy' };
const dateLabel = (value) => value ? value.split('-').reverse().join('/') : 'Chưa có ngày';
const timeLabel = (value) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
const errorMessage = (error) => error?.response?.data?.message || error?.message || 'Chưa tải được lịch sử thay đổi. Vui lòng thử lại.';
function Empty({ title, body, onRetry }) {
  return <View style={styles.empty}><View style={styles.emptyIcon}><Ionicons accessible={false} name="calendar-clear-outline" size={43} color="#8B809D" /></View><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyBody}>{body}</Text>{onRetry && <Pressable accessibilityRole="button" onPress={onRetry} style={ensureTouchTarget(styles.textButton)}><Text style={styles.orange}>Thử lại</Text></Pressable>}</View>;
}
function Snapshot({ snapshot, after }) {
  return <View style={[styles.snapshot, after && styles.after]}><Text style={[styles.snapshotLabel, after && { color: uiColors.successText }]}>{after ? 'SAU THAY ĐỔI' : 'TRƯỚC THAY ĐỔI'}</Text>{snapshot ? <><Text style={styles.snapshotDate}>{dateLabel(snapshot.shiftDate)}</Text><Text style={[styles.snapshotTime, after && { color: uiColors.successText }]}>{String(snapshot.startTime || '—').slice(0, 5)} – {String(snapshot.endTime || '—').slice(0, 5)}</Text><Text style={styles.snapshotStatus}>{statusName[snapshot.status] || snapshot.status || 'Chưa có trạng thái'}</Text><View style={styles.zones}><Ionicons accessible={false} name="location-outline" size={12} color={uiColors.muted} /><Text style={styles.zoneText}>{snapshot.zones?.length ? snapshot.zones.join(', ') : 'Chưa gắn khu vực'}</Text></View></> : <View style={styles.removed}><Ionicons accessible={false} name={after ? 'trash-outline' : 'add-circle-outline'} size={22} color={uiColors.muted} /><Text style={styles.snapshotStatus}>{after ? 'Ca đã bị xóa' : 'Ca chưa được tạo'}</Text></View>}</View>;
}
function Skeleton() {
  return <View style={{ paddingHorizontal: 20 }} accessibilityLabel="Đang tải lịch sử">{[1, 2, 3].map((key) => <View key={key} style={styles.skeletonCard}><View style={[styles.skeletonLine, { width: '60%' }]} /><View style={{ flexDirection: 'row', gap: 10 }}><View style={styles.skeletonBlock} /><View style={styles.skeletonBlock} /></View><View style={styles.skeletonLine} /></View>)}</View>;
}

export default function ScheduleHistoryScreen({ navigation, route }) {
  const bottomPadding = useBottomNavbarPadding();
  const { online } = useSyncExternalStore(subscribeNetwork, getNetworkSnapshot, getNetworkSnapshot);
  const alive = useRef(true), generation = useRef(0), selectedScope = useRef('');
  const [profile, setProfile] = useState(null), [stores, setStores] = useState([]), [storeId, setStoreId] = useState(null), [storePicker, setStorePicker] = useState(false);
  const [weekStart, setWeekStart] = useState(() => historyWeekStart(route?.params?.weekStart));
  const [identityLoading, setIdentityLoading] = useState(true), [identityError, setIdentityError] = useState('');
  const [items, setItems] = useState([]), [loading, setLoading] = useState(false), [refreshing, setRefreshing] = useState(false), [error, setError] = useState('');
  const range = historyWeekRange(weekStart), currentWeek = historyWeekStart(), store = stores.find((item) => String(item.id) === String(storeId));
  selectedScope.current = `${storeId}:${weekStart}`;
  const loadIdentity = useCallback(async () => {
    setIdentityLoading(true); setIdentityError('');
    try {
      const user = (await getMyProfile()).data;
      if (!user?.id) throw new Error('Chưa tải được tài khoản.');
      const response = await getMyStores(user.id);
      if (!alive.current) return;
      const ownStores = (Array.isArray(response.data) ? response.data : []).filter((item) => !item.status || item.status === 'ACTIVE')
        .map((item) => ({ ...item, id: item.storeId || item.id, name: item.storeName || item.name })).filter((item) => item.id);
      const requested = ownStores.find((item) => String(item.id) === String(route?.params?.storeId));
      setProfile(user); setStores(ownStores); setStoreId(requested?.id || ownStores[0]?.id || null);
    } catch (failure) { if (alive.current) setIdentityError(errorMessage(failure)); }
    finally { if (alive.current) setIdentityLoading(false); }
  }, [route?.params?.storeId]);
  useEffect(() => { alive.current = true; loadIdentity(); return () => { alive.current = false; generation.current += 1; }; }, [loadIdentity]);
  useEffect(() => { if (route?.params?.weekStart) setWeekStart(historyWeekStart(route.params.weekStart)); }, [route?.params?.weekStart]);
  const load = useCallback(async (initial = false) => {
    if (!storeId) return;
    const sequence = ++generation.current, scope = `${storeId}:${weekStart}`;
    if (initial) setLoading(true); else setRefreshing(true);
    try {
      const response = await getScheduleHistory(storeId, { ...historyWeekRange(weekStart), ownerEmail: profile?.email });
      if (!alive.current || sequence !== generation.current || selectedScope.current !== scope) return;
      setItems(response.data); setError('');
    } catch (failure) {
      if (alive.current && sequence === generation.current && selectedScope.current === scope) {
        setError(errorMessage(failure));
        if (failure.code === 'SESSION_CHANGED' || [401, 403, 404].includes(failure.response?.status)) setItems([]);
      }
    } finally { if (alive.current && sequence === generation.current && selectedScope.current === scope) { setLoading(false); setRefreshing(false); } }
  }, [storeId, weekStart, profile?.email]);
  useEffect(() => {
    if (!storeId) return undefined;
    setItems([]); setError(''); load(true);
    const focus = navigation.addListener?.('focus', () => load());
    const network = subscribeNetwork(() => { if (getNetworkSnapshot().online) load(); });
    return () => { generation.current += 1; focus?.(); network(); };
  }, [storeId, weekStart, load, navigation]);
  const header = <>
    <View style={styles.intro}><View style={styles.introIcon}><Ionicons accessible={false} name="git-compare-outline" size={27} color="#786789" /></View><View style={{ flex: 1 }}><Text style={styles.introTitle}>Nắm rõ những thay đổi</Text><Text style={styles.introBody}>Giờ làm, khu vực và trạng thái ca được cập nhật trong tuần bạn chọn.</Text></View></View>
    <Pressable accessibilityRole="button" disabled={stores.length < 2} onPress={() => setStorePicker(true)} style={ensureTouchTarget(styles.storeSelector)}><Ionicons accessible={false} name="storefront-outline" size={17} color={uiColors.muted} /><Text style={styles.storeText}>{store?.name || 'Chi nhánh của bạn'}</Text>{stores.length > 1 && <Ionicons accessible={false} name="chevron-down" size={16} color={uiColors.muted} />}</Pressable>
    <View style={styles.weekRow}><Pressable accessibilityRole="button" accessibilityLabel="Tuần trước" onPress={() => setWeekStart((current) => moveHistoryWeek(current, -1))} style={ensureTouchTarget(styles.weekArrow)}><Ionicons accessible={false} name="chevron-back" size={23} color={uiColors.muted} /></Pressable><View style={styles.weekCopy}><Text style={styles.weekTitle}>{weekStart === currentWeek ? 'Tuần này' : weekStart < currentWeek ? 'Tuần đã qua' : 'Tuần sắp tới'}</Text><Text style={styles.weekDates}>{dateLabel(range.startDate)} – {dateLabel(range.endDate)}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Tuần tiếp theo" onPress={() => setWeekStart((current) => moveHistoryWeek(current, 1))} style={ensureTouchTarget(styles.weekArrow)}><Ionicons accessible={false} name="chevron-forward" size={23} color={uiColors.muted} /></Pressable></View>
    {weekStart !== currentWeek && <Pressable accessibilityRole="button" onPress={() => setWeekStart(currentWeek)} style={ensureTouchTarget(styles.today)}><Text style={styles.orange}>Về tuần hiện tại</Text></Pressable>}
    {!online && <View style={styles.notice}><Ionicons accessible={false} name="cloud-offline-outline" size={18} color={uiColors.warningText} /><Text style={styles.noticeText}>Đang ngoại tuyến. Cần có mạng để tải lịch sử của tuần.</Text></View>}
    {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><Pressable accessibilityRole="button" onPress={() => load()} style={ensureTouchTarget(styles.textButton)}><Text style={styles.orange}>Thử lại</Text></Pressable></View>}
    <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Thay đổi trong tuần</Text><Text style={styles.count}>{items.length}</Text></View>
  </>;
  const row = ({ item }) => <View style={styles.card}>
    <View style={styles.cardHeader}><View style={styles.actorIcon}><Ionicons accessible={false} name="person-outline" size={19} color="#8B809D" /></View><View style={{ flex: 1 }}><Text style={styles.actor}>{item.actorName || 'Chưa có tên người thay đổi'}</Text><Text style={styles.changedAt}>{timeLabel(item.changedAt)}</Text></View><Ionicons accessible={false} name={item.after ? 'create-outline' : 'trash-outline'} size={20} color="#8B809D" /></View>
    <View style={styles.changes}>{historyChanges(item).map((label) => <View key={label} style={styles.changeChip}><Text style={styles.changeText}>{label}</Text></View>)}</View>
    <View style={styles.comparison}><Snapshot snapshot={item.before} /><View style={styles.arrow}><Ionicons accessible={false} name="arrow-forward" size={15} color={uiColors.muted} /></View><Snapshot snapshot={item.after} after /></View>
    <View style={styles.reason}><Ionicons accessible={false} name="chatbox-ellipses-outline" size={14} color="#746459" /><View style={{ flex: 1 }}><Text style={styles.reasonLabel}>Lý do thay đổi</Text><Text style={styles.reasonText}>{item.reason?.trim() || 'Không ghi lý do'}</Text></View></View>
  </View>;
  return <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}><StatusBar style="dark" /><View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => navigation.goBack()} style={ensureTouchTarget(styles.headerButton)}><BackIcon /></Pressable><Text accessibilityRole="header" style={styles.headerTitle}>Lịch sử đổi lịch</Text><View style={styles.headerButton} /></View>
    {identityLoading ? <ScrollView>{header}<Skeleton /></ScrollView> : identityError ? <Empty title="Chưa tải được tài khoản" body={identityError} onRetry={loadIdentity} /> : !storeId ? <Empty title="Chưa có chi nhánh" body="Lịch sử sẽ xuất hiện khi bạn được phân công vào chi nhánh." /> : <FlatList data={loading ? [] : items} renderItem={row} keyExtractor={(item) => String(item.id)} contentContainerStyle={{ flexGrow: 1, paddingBottom: bottomPadding + 16 }} ListHeaderComponent={header}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load()} tintColor={uiColors.orange} />}
      ListEmptyComponent={loading ? <Skeleton /> : <Empty title="Chưa có thay đổi được ghi nhận" body="Không có bản ghi cho tuần này. Lịch sử được lưu từ khi tính năng hoạt động; các tuần trước đó có thể chưa có dữ liệu." />}
      ListFooterComponent={items.length ? <Text style={styles.footer}>Chỉ hiển thị thay đổi được hệ thống ghi nhận.</Text> : null} />}
    <BottomNavbar navigation={navigation} activeRoute="ScheduleHistory" />
    <Modal visible={storePicker} transparent animationType="fade" onRequestClose={() => setStorePicker(false)}><View style={styles.overlay}><View style={styles.sheet}><Text style={styles.sheetTitle}>Chọn chi nhánh</Text><ScrollView>{stores.map((item) => <Pressable key={item.id} accessibilityRole="button" onPress={() => { setStorePicker(false); setStoreId(item.id); }} style={ensureTouchTarget(styles.storeChoice)}><Ionicons accessible={false} name="storefront-outline" size={21} color={uiColors.muted} /><Text style={{ flex: 1, color: "#404B57" }}>{item.name}</Text>{String(item.id) === String(storeId) && <Ionicons accessible={false} name="checkmark" size={22} color={uiColors.primaryStrong} />}</Pressable>)}</ScrollView><Pressable accessibilityRole="button" onPress={() => setStorePicker(false)} style={ensureTouchTarget(styles.textButton)}><Text style={styles.orange}>Đóng</Text></Pressable></View></View></Modal>
  </SafeAreaView>;
}

const styles = createAppStyles({
  safe: { flex: 1, backgroundColor: uiColors.surface }, header: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: uiColors.subtle }, headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, headerTitle: { color: "#404B57", fontSize: 18, fontWeight: '600' }, intro: { margin: 20, padding: 17, flexDirection: 'row', alignItems: 'center', gap: 13, borderRadius: 18, backgroundColor: uiColors.lavender }, introIcon: { height: 49, width: 49, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: uiColors.lavender }, introTitle: { color: "#70678E", fontSize: 16, fontWeight: '600' }, introBody: { color: uiColors.muted, fontSize: 12, lineHeight: 19, marginTop: 5 }, storeSelector: { flexDirection: 'row', gap: 9, alignItems: 'center', marginHorizontal: 23, marginBottom: 15 }, storeText: { flex: 1, color: uiColors.muted, fontSize: 13 },
  weekRow: { marginHorizontal: 20, paddingVertical: 12, borderWidth: 1, borderColor: uiColors.subtle, borderRadius: 15, flexDirection: 'row', alignItems: 'center' }, weekArrow: { width: 40, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, weekCopy: { flex: 1, alignItems: 'center', gap: 5 }, weekTitle: { fontSize: 14, fontWeight: '600', color: uiColors.secondary }, weekDates: { fontSize: 11, color: uiColors.muted }, today: { alignSelf: 'center', padding: 12 }, orange: { color: uiColors.primaryStrong, fontSize: 12, fontWeight: '600' }, sectionHeading: { flexDirection: 'row', gap: 8, alignItems: 'center', marginHorizontal: 22, marginVertical: 20 }, sectionTitle: { fontSize: 14, color: uiColors.secondary, fontWeight: '600' }, count: { color: uiColors.muted, fontSize: 12 },
  card: { marginHorizontal: 20, marginBottom: 15, padding: 15, borderWidth: 1, borderColor: uiColors.line, borderRadius: 17 }, cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 }, actorIcon: { height: 37, width: 37, borderRadius: 13, backgroundColor: uiColors.lavender, alignItems: 'center', justifyContent: 'center' }, actor: { color: uiColors.secondary, fontSize: 13, fontWeight: '600', lineHeight: 19 }, changedAt: { color: uiColors.muted, fontSize: 10, marginTop: 3 }, changes: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 13, marginBottom: 13 }, changeChip: { borderRadius: 6, paddingVertical: 4, paddingHorizontal: 7, backgroundColor: uiColors.peach }, changeText: { fontSize: 9, color: '#B28261' }, comparison: { flexDirection: 'row', alignItems: 'stretch' }, snapshot: { flex: 1, backgroundColor: uiColors.canvas, paddingVertical: 12, paddingHorizontal: 9, borderRadius: 11 }, after: { backgroundColor: uiColors.mint }, snapshotLabel: { color: uiColors.muted, fontSize: 8, fontWeight: '600', letterSpacing: 0.3, marginBottom: 10 }, snapshotDate: { color: uiColors.muted, fontSize: 10 }, snapshotTime: { color: "#746459", fontSize: 13, fontWeight: '600', marginTop: 6 }, snapshotStatus: { color: uiColors.muted, fontSize: 10, lineHeight: 17, marginTop: 7 }, zones: { flexDirection: 'row', gap: 3, marginTop: 8 }, zoneText: { flex: 1, fontSize: 9, lineHeight: 15, color: uiColors.muted }, arrow: { width: 23, justifyContent: 'center', alignItems: 'center' }, removed: { minHeight: 90, alignItems: 'center', justifyContent: 'center' }, reason: { flexDirection: 'row', gap: 7, marginTop: 15, paddingTop: 13, borderTopWidth: 1, borderTopColor: uiColors.subtle }, reasonLabel: { color: uiColors.muted, fontSize: 10, marginBottom: 4 }, reasonText: { color: "#746459", fontSize: 12, lineHeight: 19 },
  empty: { minHeight: 250, flex: 1, padding: 28, alignItems: 'center', justifyContent: 'center' }, emptyIcon: { height: 83, width: 83, borderRadius: 29, backgroundColor: uiColors.lavender, alignItems: 'center', justifyContent: 'center' }, emptyTitle: { color: uiColors.secondary, fontSize: 16, fontWeight: '600', marginTop: 16, textAlign: 'center' }, emptyBody: { color: uiColors.muted, fontSize: 12, lineHeight: 21, marginTop: 9, maxWidth: 290, textAlign: 'center' }, textButton: { minHeight: 44, paddingHorizontal: 13, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }, footer: { textAlign: 'center', fontSize: 10, color: uiColors.muted, padding: 15 }, notice: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 12, marginHorizontal: 20, marginTop: 14, backgroundColor: uiColors.butter }, noticeText: { flex: 1, fontSize: 12, lineHeight: 19, color: uiColors.warningText }, errorBox: { marginHorizontal: 20, backgroundColor: uiColors.dangerSoft, padding: 13, borderRadius: 12, marginTop: 14 }, errorText: { fontSize: 12, lineHeight: 19, color: uiColors.dangerText },
  skeletonCard: { borderWidth: 1, borderColor: uiColors.subtle, borderRadius: 17, padding: 16, marginBottom: 16, gap: 14 }, skeletonLine: { backgroundColor: uiColors.subtle, height: 13, borderRadius: 4 }, skeletonBlock: { backgroundColor: uiColors.canvas, height: 105, borderRadius: 11, flex: 1 }, overlay: { flex: 1, backgroundColor: "#28313B55", justifyContent: 'center', padding: 24 }, sheet: { backgroundColor: uiColors.surface, padding: 20, borderRadius: 22, maxHeight: '80%' }, sheetTitle: { color: "#404B57", fontSize: 17, fontWeight: '600', marginBottom: 15 }, storeChoice: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15 },
});

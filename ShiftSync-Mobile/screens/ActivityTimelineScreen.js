import { colors as uiColors } from '../theme/koreanPalette';
import { createAppStyles } from '../theme/appTheme';
import ThreeIllustration from '../components/ThreeIllustration';
import { ensureTouchTarget } from '../utils/touchTarget';
import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import BackIcon from '../components/BackIcon';
import BottomNavbar, { useBottomNavbarPadding } from '../components/BottomNavbar';
import { getMyProfile, getMyStores } from '../services/profileService';
import { getNetworkSnapshot, subscribeNetwork } from '../services/networkState';
import { ACTIVITY_FILTERS, activityDay, activityKind, getMyActivity, groupActivities, mergeActivities } from '../services/activityService';

const message = (error) => error?.response?.data?.message || error?.message || 'Chưa tải được hoạt động. Vui lòng thử lại.';
const time = (value) => new Date(value).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' });
function dayLabel(day) {
  if (day === activityDay(Date.now())) return 'Hôm nay';
  if (day === activityDay(Date.now() - 86400000)) return 'Hôm qua';
  return new Date(`${day}T12:00:00+07:00`).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
}
function Skeleton() {
  return <View style={styles.skeleton} accessibilityLabel="Đang tải hoạt động">{[1, 2, 3, 4, 5].map((key) => <View key={key} style={styles.skeletonRow}><View style={styles.skeletonIcon} /><View style={{ flex: 1, gap: 10 }}><View style={[styles.skeletonLine, { width: '65%' }]} /><View style={[styles.skeletonLine, { width: '90%', height: 10 }]} /></View></View>)}</View>;
}

export default function ActivityTimelineScreen({ navigation }) {
  const bottomPadding = useBottomNavbarPadding();
  const { online } = useSyncExternalStore(subscribeNetwork, getNetworkSnapshot, getNetworkSnapshot);
  const alive = useRef(true), generation = useRef(0), selectedStore = useRef(null), paging = useRef(false);
  const [profile, setProfile] = useState(null), [stores, setStores] = useState([]), [storeId, setStoreId] = useState(null);
  const [identityLoading, setIdentityLoading] = useState(true), [identityError, setIdentityError] = useState('');
  const [items, setItems] = useState([]), [cursor, setCursor] = useState(null), [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false), [refreshing, setRefreshing] = useState(false), [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(''), [fromCache, setFromCache] = useState(false), [storePicker, setStorePicker] = useState(false);
  selectedStore.current = storeId;
  const store = stores.find((item) => String(item.id) === String(storeId));
  const sections = useMemo(() => groupActivities(items, filter), [items, filter]);

  const loadIdentity = useCallback(async () => {
    setIdentityLoading(true); setIdentityError('');
    try {
      const user = (await getMyProfile()).data;
      if (!user?.id) throw new Error('Chưa tải được tài khoản.');
      const response = await getMyStores(user.id);
      if (!alive.current) return;
      const ownStores = (Array.isArray(response.data) ? response.data : []).filter((item) => !item.status || item.status === 'ACTIVE')
        .map((item) => ({ ...item, id: item.storeId || item.id, name: item.storeName || item.name })).filter((item) => item.id);
      setProfile(user); setStores(ownStores); setStoreId(ownStores[0]?.id || null);
    } catch (failure) { if (alive.current) setIdentityError(message(failure)); }
    finally { if (alive.current) setIdentityLoading(false); }
  }, []);
  useEffect(() => { alive.current = true; loadIdentity(); return () => { alive.current = false; generation.current += 1; }; }, [loadIdentity]);

  const load = useCallback(async (mode = 'refresh', before = null) => {
    if (!storeId || (mode === 'more' && paging.current)) return;
    const sequence = mode === 'more' ? generation.current : ++generation.current;
    if (mode === 'more') { paging.current = true; setLoadingMore(true); }
    else { paging.current = false; setLoadingMore(false); if (mode === 'initial') setLoading(true); else setRefreshing(true); }
    try {
      const response = await getMyActivity(storeId, { before: mode === 'more' ? before : undefined, ownerEmail: profile?.email });
      if (!alive.current || selectedStore.current !== storeId || sequence !== generation.current) return;
      setItems((current) => mergeActivities(mode === 'more' ? current : [], response.data.items));
      setCursor(response.data.nextCursor); setFromCache(!!response.fromCache); setError('');
    } catch (failure) {
      if (alive.current && selectedStore.current === storeId && sequence === generation.current) {
        setError(message(failure));
        if (failure.code === 'SESSION_CHANGED' || [401, 403, 404].includes(failure.response?.status)) { setItems([]); setCursor(null); }
      }
    } finally {
      if (alive.current && selectedStore.current === storeId && sequence === generation.current) {
        setLoading(false); setRefreshing(false); setLoadingMore(false); paging.current = false;
      }
    }
  }, [storeId, profile?.email]);
  useEffect(() => {
    if (!storeId) return undefined;
    setItems([]); setCursor(null); setError(''); setFromCache(false); load('initial');
    const focus = navigation.addListener?.('focus', () => load());
    const network = subscribeNetwork(() => { if (getNetworkSnapshot().online) load(); });
    return () => { generation.current += 1; focus?.(); network(); };
  }, [storeId, load, navigation]);
  const openEvent = (item) => {
    if (['Attendance', 'Request', 'Schedule'].includes(item.targetScreen)) navigation.navigate('MainTabs', { screen: item.targetScreen }, { pop: true });
    else if (['Marketplace', 'IncidentReport'].includes(item.targetScreen)) navigation.navigate(item.targetScreen, { entityId: item.entityId, storeId: item.storeId });
  };
  const eventRow = ({ item, index, section }) => {
    const kind = activityKind(item.type), appearance = ACTIVITY_FILTERS.find((entry) => entry.value === kind) || ACTIVITY_FILTERS[0];
    const icon = item.type === 'ATTENDANCE_IN' ? 'log-in-outline' : item.type === 'ATTENDANCE_OUT' ? 'log-out-outline' : appearance.icon;
    const canOpen = ['Attendance', 'Request', 'Schedule', 'Marketplace', 'IncidentReport'].includes(item.targetScreen);
    return <Pressable accessibilityRole={canOpen ? 'button' : undefined} disabled={!canOpen} onPress={() => openEvent(item)} style={ensureTouchTarget(styles.event)}>
      <View style={styles.track}><View style={[styles.eventIcon, { backgroundColor: appearance.background }]}><Ionicons accessible={false} name={icon} size={21} color={appearance.color} /></View>{index < section.data.length - 1 && <View style={styles.line} />}</View>
      <View style={styles.eventBody}><View style={styles.eventHeading}><Text style={styles.eventTitle}>{item.title || 'Hoạt động'}</Text><Text style={styles.eventTime}>{time(item.occurredAt)}</Text></View>
        {!!item.description && <Text style={styles.description}>{item.description}</Text>}
        <View style={styles.eventMeta}><Text style={styles.storeMeta}>{item.storeName || store?.name || 'Chi nhánh của bạn'}</Text>{canOpen && <Ionicons accessible={false} name="chevron-forward" size={14} color={uiColors.muted} />}</View>
      </View>
    </Pressable>;
  };
  const listHeader = <>
    <View style={styles.intro}><ThreeIllustration kind="raccoon" size={112} animated interactive /><View style={{ flex: 1 }}><Text style={styles.introTitle}>Mỗi bước trong ca làm</Text><Text style={styles.introBody}>Theo dõi chấm công, yêu cầu và những ca bạn đã nhận.</Text></View></View>
    {storeId && <Pressable accessibilityRole="button" disabled={stores.length < 2} onPress={() => setStorePicker(true)} style={ensureTouchTarget(styles.storeSelector)}><Ionicons accessible={false} name="storefront-outline" size={17} color={uiColors.muted} /><Text style={styles.storeText}>{store?.name || 'Chi nhánh của bạn'}</Text>{stores.length > 1 && <Ionicons accessible={false} name="chevron-down" size={15} color={uiColors.muted} />}</Pressable>}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{ACTIVITY_FILTERS.map((entry) => <Pressable key={entry.value} accessibilityLabel={entry.label} accessibilityRole="tab" accessibilityState={{ selected: filter === entry.value }} aria-selected={filter === entry.value} onPress={() => setFilter(entry.value)} style={ensureTouchTarget([styles.chip, filter === entry.value && styles.selectedChip])}><Ionicons accessible={false} name={entry.icon} size={15} color={filter === entry.value ? uiColors.orange : uiColors.muted} /><Text style={[styles.chipText, filter === entry.value && styles.selectedChipText]}>{entry.label}</Text></Pressable>)}</ScrollView>
    {(fromCache || !online) && <View style={styles.notice}><Ionicons accessible={false} name="cloud-offline-outline" size={17} color={uiColors.warningText} /><Text style={styles.noticeText}>{fromCache ? 'Đang xem hoạt động đã lưu. Kéo xuống để cập nhật khi có mạng.' : 'Đang ngoại tuyến. Hoạt động mới sẽ tải khi có mạng.'}</Text></View>}
    {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><Pressable accessibilityRole="button" onPress={() => load()} style={ensureTouchTarget(styles.retry)}><Text style={styles.orange}>Thử lại</Text></Pressable></View>}
  </>;

  return <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}><StatusBar style="dark" />
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => navigation.goBack()} style={ensureTouchTarget(styles.headerButton)}><BackIcon /></Pressable><Text accessibilityRole="header" style={styles.headerTitle}>Hoạt động của tôi</Text><View style={styles.headerButton} /></View>
    {identityLoading ? <Skeleton /> : identityError ? <View style={styles.empty}><Ionicons accessible={false} name="cloud-offline-outline" size={48} color={uiColors.muted} /><Text style={styles.emptyTitle}>Chưa tải được tài khoản</Text><Text style={styles.emptyBody}>{identityError}</Text><Pressable accessibilityRole="button" onPress={loadIdentity} style={ensureTouchTarget(styles.retry)}><Text style={styles.orange}>Thử lại</Text></Pressable></View>
      : !storeId ? <View style={styles.empty}><Ionicons accessible={false} name="storefront-outline" size={48} color={uiColors.muted} /><Text style={styles.emptyTitle}>Chưa có chi nhánh</Text><Text style={styles.emptyBody}>Hoạt động sẽ xuất hiện khi bạn được phân công vào chi nhánh.</Text></View>
        : loading ? <ScrollView>{listHeader}<Skeleton /></ScrollView> : <SectionList sections={sections} keyExtractor={(item) => String(item.id)} renderItem={eventRow} stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => <Text style={styles.dayTitle}>{dayLabel(section.title)}</Text>}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: bottomPadding + 18 }} ListHeaderComponent={listHeader}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load()} tintColor={uiColors.orange} />}
          ListEmptyComponent={<View style={styles.empty}><View style={styles.emptyIcon}><Ionicons accessible={false} name={filter === 'all' ? 'time-outline' : ACTIVITY_FILTERS.find((entry) => entry.value === filter).icon} size={42} color="#C19B87" /></View><Text style={styles.emptyTitle}>{filter === 'all' ? 'Chưa có hoạt động' : 'Chưa có hoạt động phù hợp'}</Text><Text style={styles.emptyBody}>{filter === 'all' ? 'Chấm công, gửi yêu cầu hoặc nhận ca để xem lịch sử tại đây.' : 'Đổi bộ lọc hoặc tải thêm hoạt động cũ hơn.'}</Text></View>}
          ListFooterComponent={cursor ? <Pressable accessibilityRole="button" accessibilityLabel="Xem hoạt động cũ hơn" disabled={loadingMore || refreshing || !online} onPress={() => load('more', cursor)} style={ensureTouchTarget([styles.more, (!online || loadingMore) && { opacity: 0.5 }])}>{loadingMore ? <ActivityIndicator size="small" color={uiColors.primaryStrong} /> : <Ionicons accessible={false} name="arrow-down" size={17} color={uiColors.primaryStrong} />}<Text style={styles.orange}>{loadingMore ? 'Đang tải…' : 'Xem hoạt động cũ hơn'}</Text></Pressable> : items.length > 0 ? <Text style={styles.end}>Bạn đã xem hết hoạt động hiện có</Text> : null} />}
    <BottomNavbar navigation={navigation} activeRoute="ActivityTimeline" />
    <Modal transparent visible={storePicker} animationType="fade" onRequestClose={() => setStorePicker(false)}><View style={styles.overlay}><View style={styles.sheet}><Text style={styles.sheetTitle}>Chọn chi nhánh</Text>{stores.map((item) => <Pressable key={item.id} accessibilityRole="button" onPress={() => { setStorePicker(false); setStoreId(item.id); }} style={ensureTouchTarget(styles.storeChoice)}><Ionicons accessible={false} name="storefront-outline" size={21} color={uiColors.muted} /><Text style={{ flex: 1, color: "#404B57" }}>{item.name}</Text>{item.id === storeId && <Ionicons accessible={false} name="checkmark" size={22} color={uiColors.primaryStrong} />}</Pressable>)}<Pressable accessibilityRole="button" onPress={() => setStorePicker(false)} style={ensureTouchTarget(styles.more)}><Text style={styles.orange}>Đóng</Text></Pressable></View></View></Modal>
  </SafeAreaView>;
}

const styles = createAppStyles({
  safe: { flex: 1, backgroundColor: uiColors.surface }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 58, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: uiColors.subtle }, headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, headerTitle: { fontSize: 18, fontWeight: '600', color: "#404B57" },
  intro: { margin: 20, padding: 18, gap: 14, backgroundColor: uiColors.peach, borderRadius: 19, flexDirection: 'row', alignItems: 'center' }, introIcon: { height: 52, width: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: "#EFDDD1" }, introTitle: { fontSize: 16, fontWeight: '600', color: "#404B57" }, introBody: { fontSize: 13, lineHeight: 20, color: "#746459", marginTop: 5 },
  storeSelector: { marginHorizontal: 22, marginBottom: 18, flexDirection: 'row', alignItems: 'center', gap: 9 }, storeText: { flex: 1, color: uiColors.muted, fontSize: 13 }, filters: { gap: 8, paddingHorizontal: 20, paddingBottom: 18 }, chip: { flexDirection: 'row', gap: 5, alignItems: 'center', borderWidth: 1, borderColor: uiColors.line, borderRadius: 22, paddingHorizontal: 13, minHeight: 39 }, selectedChip: { borderColor: "#E9C8B8", backgroundColor: uiColors.peach }, chipText: { fontSize: 12, color: uiColors.muted }, selectedChipText: { color: uiColors.primaryStrong, fontWeight: '600' },
  dayTitle: { color: uiColors.muted, fontSize: 12, fontWeight: '600', marginHorizontal: 22, marginTop: 15, marginBottom: 16, textTransform: 'uppercase' }, event: { flexDirection: 'row', paddingHorizontal: 22 }, track: { width: 42, alignItems: 'center', marginRight: 13 }, eventIcon: { height: 40, width: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, line: { flex: 1, minHeight: 22, width: 1.5, backgroundColor: '#F0EFED', marginVertical: 5 }, eventBody: { flex: 1, paddingBottom: 25, paddingTop: 2 }, eventHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 }, eventTitle: { color: "#404B57", fontSize: 14, fontWeight: '600', flex: 1, lineHeight: 20 }, eventTime: { color: uiColors.muted, fontSize: 11, paddingTop: 3 }, description: { color: uiColors.muted, fontSize: 13, lineHeight: 20, marginTop: 5 }, eventMeta: { flexDirection: 'row', marginTop: 8, alignItems: 'center', gap: 5 }, storeMeta: { color: uiColors.muted, fontSize: 11, flex: 1 },
  notice: { marginHorizontal: 20, marginBottom: 12, padding: 12, borderRadius: 12, backgroundColor: uiColors.butter, flexDirection: 'row', gap: 8 }, noticeText: { flex: 1, color: uiColors.warningText, fontSize: 12, lineHeight: 18 }, errorBox: { marginHorizontal: 20, padding: 14, backgroundColor: uiColors.dangerSoft, borderRadius: 12 }, errorText: { fontSize: 13, color: uiColors.dangerText, lineHeight: 20 }, retry: { alignSelf: 'center', padding: 12, minHeight: 44 }, orange: { color: uiColors.primaryStrong, fontSize: 13, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, minHeight: 260 }, emptyIcon: { height: 86, width: 86, borderRadius: 30, backgroundColor: uiColors.peach, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }, emptyTitle: { fontSize: 17, color: uiColors.secondary, fontWeight: '600', marginTop: 14 }, emptyBody: { fontSize: 13, lineHeight: 21, color: uiColors.muted, marginTop: 9, textAlign: 'center', maxWidth: 285 }, more: { minHeight: 48, paddingHorizontal: 16, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 10 }, end: { textAlign: 'center', color: "#9BA3A7", fontSize: 11, padding: 18 },
  skeleton: { paddingHorizontal: 22, paddingTop: 22 }, skeletonRow: { flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: 32 }, skeletonIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: uiColors.subtle }, skeletonLine: { height: 13, backgroundColor: uiColors.subtle, borderRadius: 4 }, overlay: { flex: 1, padding: 24, backgroundColor: "#28313B55", justifyContent: 'center' }, sheet: { padding: 20, borderRadius: 22, backgroundColor: uiColors.surface, maxHeight: '80%' }, sheetTitle: { color: "#404B57", fontSize: 17, fontWeight: '600', marginBottom: 15 }, storeChoice: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15 },
});

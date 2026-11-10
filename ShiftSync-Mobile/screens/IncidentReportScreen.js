import { colors as uiColors } from '../theme/koreanPalette';
import { createAppStyles } from '../theme/appTheme';
import { ensureTouchTarget } from '../utils/touchTarget';
import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import BackIcon from '../components/BackIcon';
import BottomNavbar, { useBottomNavbarPadding } from '../components/BottomNavbar';
import { getMyProfile, getMyStores } from '../services/profileService';
import { getMyShifts } from '../services/shiftService';
import { getNetworkSnapshot, subscribeNetwork } from '../services/networkState';
import { createIncidentRequestId, getIncidentPhoto, getIncidentReport, getIncidentReports, INCIDENT_CATEGORIES, INCIDENT_SEVERITIES, INCIDENT_STATUSES, recentIncidentShifts, submitIncident, updateIncidentStatus, validateIncident } from '../services/incidentService';
import useActionGuard from '../utils/useActionGuard';

const errorMessage = (error, fallback) => error?.response?.data?.message || error?.message || fallback;
const dateTime = (value) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Chưa có thời gian';
const defaultDraft = () => ({ category: 'EQUIPMENT', severity: 'MEDIUM', description: '', shiftId: null, photos: [] });
const shiftLabel = (shift) => `${String(shift.shiftDate || '').split('-').reverse().slice(0, 2).join('/')} · ${String(shift.startTime || '').slice(0, 5)}–${String(shift.endTime || '').slice(0, 5)}`;
function Badge({ value, options = INCIDENT_STATUSES }) {
  const item = options.find((entry) => entry.value === value);
  return <View style={[styles.badge, { backgroundColor: item?.background || uiColors.subtle }]}><Text style={[styles.badgeText, { color: item?.color || uiColors.muted }]}>{item?.label || value || 'Chưa cập nhật'}</Text></View>;
}
function Empty({ title, body, icon = 'clipboard-outline', onRetry }) {
  return <View style={styles.empty}><View style={styles.emptyIcon}><Ionicons accessible={false} name={icon} size={43} color="#BDA18F" /></View><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyBody}>{body}</Text>{onRetry && <Pressable accessibilityRole="button" onPress={onRetry} style={ensureTouchTarget(styles.textButton)}><Text style={styles.orange}>Thử lại</Text></Pressable>}</View>;
}

export default function IncidentReportScreen({ navigation, route }) {
  const bottomPadding = useBottomNavbarPadding();
  const { online } = useSyncExternalStore(subscribeNetwork, getNetworkSnapshot, getNetworkSnapshot);
  const { runAction, busy } = useActionGuard();
  const alive = useRef(true), listSequence = useRef(0), selectedStore = useRef(null), detailSequence = useRef(0), attempt = useRef(null), cameraRef = useRef(null), localPhotos = useRef([]);
  const [permission, requestPermission] = useCameraPermissions();
  const [profile, setProfile] = useState(null), [stores, setStores] = useState([]), [storeId, setStoreId] = useState(null), [storePicker, setStorePicker] = useState(false);
  const [identityLoading, setIdentityLoading] = useState(true), [identityError, setIdentityError] = useState('');
  const [reports, setReports] = useState([]), [loading, setLoading] = useState(false), [refreshing, setRefreshing] = useState(false), [listError, setListError] = useState(''), [fromCache, setFromCache] = useState(false);
  const [formVisible, setFormVisible] = useState(false), [draft, setDraft] = useState(defaultDraft), [formError, setFormError] = useState(''), [success, setSuccess] = useState('');
  const [shifts, setShifts] = useState([]), [shiftsLoading, setShiftsLoading] = useState(false), [shiftsError, setShiftsError] = useState('');
  const [cameraVisible, setCameraVisible] = useState(false), [cameraReady, setCameraReady] = useState(false), [cameraFacing, setCameraFacing] = useState('back'), [cameraError, setCameraError] = useState('');
  const [detailVisible, setDetailVisible] = useState(false), [detail, setDetail] = useState(null), [detailLoading, setDetailLoading] = useState(false), [detailError, setDetailError] = useState('');
  const [photoUris, setPhotoUris] = useState({}), [photosLoading, setPhotosLoading] = useState(false), [photoError, setPhotoError] = useState(''), [reviewStatus, setReviewStatus] = useState('OPEN'), [reviewNote, setReviewNote] = useState('');
  selectedStore.current = storeId;
  const store = stores.find((item) => String(item.id) === String(storeId));
  const manager = ['MANAGER', 'ADMIN'].includes(profile?.systemRole || profile?.role);
  const captureBusy = !!busy['capture-incident'], submitBusy = !!busy['submit-incident'], reviewBusy = !!busy['review-incident'];
  const availableShifts = recentIncidentShifts(shifts, storeId);
  const changeDraft = (patch) => { setDraft((current) => ({ ...current, ...patch })); setFormError(''); };
  useEffect(() => {
    const next = draft.photos.map((photo) => photo.uri);
    if (Platform.OS === 'web') localPhotos.current.filter((uri) => uri.startsWith('blob:') && !next.includes(uri)).forEach((uri) => globalThis.URL?.revokeObjectURL(uri));
    localPhotos.current = next;
  }, [draft.photos]);
  useEffect(() => () => { if (Platform.OS === 'web') localPhotos.current.filter((uri) => uri.startsWith('blob:')).forEach((uri) => globalThis.URL?.revokeObjectURL(uri)); }, []);

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
    } catch (error) { if (alive.current) setIdentityError(errorMessage(error, 'Chưa tải được tài khoản.')); }
    finally { if (alive.current) setIdentityLoading(false); }
  }, [route?.params?.storeId]);
  useEffect(() => { alive.current = true; loadIdentity(); return () => { alive.current = false; listSequence.current += 1; detailSequence.current += 1; }; }, [loadIdentity]);
  const loadReports = useCallback(async (initial = false) => {
    if (!storeId) return;
    const sequence = ++listSequence.current;
    if (initial) setLoading(true); else setRefreshing(true);
    try {
      const response = await getIncidentReports(storeId, { manager, ownerEmail: profile?.email });
      if (!alive.current || selectedStore.current !== storeId || sequence !== listSequence.current) return;
      setReports([...response.data].sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)));
      setFromCache(!!response.fromCache); setListError('');
    } catch (error) {
      if (alive.current && selectedStore.current === storeId && sequence === listSequence.current) {
        setListError(errorMessage(error, 'Chưa tải được báo cáo.'));
        if (error.code === 'SESSION_CHANGED' || [401, 403, 404].includes(error.response?.status)) { setReports([]); setDetailVisible(false); setPhotoUris({}); }
      }
    } finally { if (alive.current && selectedStore.current === storeId && sequence === listSequence.current) { setLoading(false); setRefreshing(false); } }
  }, [storeId, manager, profile?.email]);
  useEffect(() => {
    if (!storeId) return undefined;
    setReports([]); setListError(''); setFromCache(false); setDraft(defaultDraft()); attempt.current = null; setDetailVisible(false); setFormVisible(false); loadReports(true);
    const focus = navigation.addListener?.('focus', () => loadReports());
    const network = subscribeNetwork(() => { if (getNetworkSnapshot().online) loadReports(); });
    return () => { listSequence.current += 1; detailSequence.current += 1; focus?.(); network(); };
  }, [storeId, loadReports, navigation]);

  const loadShifts = async () => {
    const ownStore = storeId;
    setShiftsLoading(true); setShiftsError('');
    try { const response = await getMyShifts(); if (alive.current && selectedStore.current === ownStore) setShifts(Array.isArray(response.data) ? response.data : []); }
    catch (error) { if (alive.current && selectedStore.current === ownStore) setShiftsError('Chưa tải được ca đã phân công. Bạn vẫn có thể gửi báo cáo không gắn ca.'); }
    finally { if (alive.current && selectedStore.current === ownStore) setShiftsLoading(false); }
  };
  const openForm = () => { setSuccess(''); setFormError(''); setCameraError(''); setFormVisible(true); loadShifts(); };
  const openCamera = () => runAction('open-incident-camera', async () => {
    if (draft.photos.length >= 3 || submitBusy) return;
    setCameraError('');
    try {
      if (Platform.OS === 'web' && typeof globalThis.isSecureContext === 'boolean' && !globalThis.isSecureContext) throw new Error('Camera trình duyệt cần HTTPS hoặc localhost. Bạn có thể gửi báo cáo không kèm ảnh.');
      const granted = permission?.granted ? permission : await requestPermission();
      if (!granted.granted) { setCameraError(Platform.OS === 'web' ? 'Chưa có quyền camera. Cho phép camera trong cài đặt trang của trình duyệt rồi thử lại, hoặc gửi không kèm ảnh.' : 'Chưa có quyền camera. Cấp quyền trong Cài đặt để chụp ảnh, hoặc gửi báo cáo không kèm ảnh.'); return; }
      if (Platform.OS === 'web' && !(await CameraView.isAvailableAsync())) throw new Error('Thiết bị này không có camera khả dụng. Bạn vẫn có thể gửi báo cáo không kèm ảnh.');
      if (!alive.current) return;
      setCameraReady(false); setCameraVisible(true);
    } catch (error) { if (alive.current) setCameraError(errorMessage(error, 'Không mở được camera. Bạn vẫn có thể gửi báo cáo không kèm ảnh.')); }
  });
  const capture = () => runAction('capture-incident', async () => {
    if (!cameraReady || !cameraRef.current) return;
    let context, image;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!photo?.uri) throw new Error('Chưa chụp được ảnh. Vui lòng thử lại.');
      context = ImageManipulator.manipulate(photo.uri);
      image = await context.renderAsync();
      if (Math.max(image.width, image.height) > 960) {
        context.resize(image.width >= image.height ? { width: 960 } : { height: 960 });
        const original = image;
        image = await context.renderAsync();
        original.release?.();
      }
      const compressed = await image.saveAsync({ compress: 0.6, format: SaveFormat.JPEG, base64: true });
      const sizeBytes = Math.floor((compressed.base64?.length || 0) * 3 / 4);
      if (!sizeBytes || sizeBytes > 2 * 1024 * 1024) throw new Error('Ảnh chưa phù hợp dung lượng 2 MB. Vui lòng chụp lại.');
      if (!alive.current) return;
      setDraft((current) => ({ ...current, photos: [...current.photos, { uri: compressed.uri, sizeBytes, width: compressed.width, height: compressed.height }].slice(0, 3) }));
      setCameraVisible(false); setCameraError('');
    } catch (error) {
      if (alive.current) {
        if (error?.code === 'ERR_CAMERA_NOT_READY') setCameraError('Camera đang khởi động. Vui lòng đợi vài giây rồi chụp lại.');
        else { setCameraVisible(false); setCameraError(errorMessage(error, 'Chưa xử lý được ảnh. Vui lòng chụp lại.')); }
      }
    }
    finally { image?.release?.(); context?.release?.(); }
  });
  const send = () => runAction('submit-incident', async () => {
    const validation = validateIncident(draft);
    if (validation) { setFormError(validation); return; }
    if (!online) { setFormError('Chưa gửi: bạn đang ngoại tuyến. Bản nháp được giữ trên màn hình để thử lại khi có mạng.'); return; }
    const fingerprint = JSON.stringify({ storeId, ...draft, description: draft.description.trim() });
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, id: createIncidentRequestId() };
    const ownerStore = storeId;
    try {
      const response = await submitIncident(storeId, { ...draft, clientRequestId: attempt.current.id }, profile?.email);
      if (!response.data?.id) throw new Error('Máy chủ chưa xác nhận mã báo cáo.');
      if (!alive.current || selectedStore.current !== ownerStore) return;
      setFormVisible(false); setDraft(defaultDraft()); attempt.current = null; setSuccess('Đã gửi báo cáo. Quản lý sẽ tiếp nhận và cập nhật trạng thái.'); loadReports();
    } catch (error) { if (alive.current && selectedStore.current === ownerStore) setFormError(`${errorMessage(error, 'Chưa xác nhận được báo cáo đã gửi.')} Bản nháp vẫn được giữ; thử lại sẽ dùng cùng mã gửi.`); }
  });
  const openDetail = useCallback(async (id) => {
    if (!storeId || !id) return;
    const sequence = ++detailSequence.current, ownerStore = storeId;
    setDetailVisible(true); setDetail(null); setDetailLoading(true); setDetailError(''); setPhotoUris({}); setPhotoError(''); setPhotosLoading(false);
    try {
      const response = await getIncidentReport(storeId, id, profile?.email);
      if (!alive.current || selectedStore.current !== ownerStore || sequence !== detailSequence.current) return;
      setDetail(response.data); setReviewStatus(response.data.status); setReviewNote(response.data.reviewNote || ''); setDetailLoading(false);
      const photos = response.data.photos || [];
      if (photos.length) {
        setPhotosLoading(true);
        const results = await Promise.allSettled(photos.map(async (photo) => [photo.id, await getIncidentPhoto(storeId, id, photo.id, profile?.email)]));
        if (!alive.current || selectedStore.current !== ownerStore || sequence !== detailSequence.current) return;
        setPhotoUris(Object.fromEntries(results.filter((result) => result.status === 'fulfilled').map((result) => result.value)));
        if (results.some((result) => result.status === 'rejected')) setPhotoError('Một số ảnh chưa tải được. Mở lại báo cáo để thử lại khi có mạng.');
      }
    } catch (error) { if (alive.current && selectedStore.current === ownerStore && sequence === detailSequence.current) setDetailError(errorMessage(error, 'Chưa mở được báo cáo.')); }
    finally { if (alive.current && selectedStore.current === ownerStore && sequence === detailSequence.current) { setDetailLoading(false); setPhotosLoading(false); } }
  }, [storeId, profile?.email]);
  useEffect(() => { if (storeId && route?.params?.entityId) openDetail(route.params.entityId); }, [storeId, route?.params?.entityId, openDetail]);
  const saveReview = () => runAction('review-incident', async () => {
    if (!online || !manager || !detail?.id) return;
    const ownerStore = storeId, sequence = detailSequence.current;
    try {
      const response = await updateIncidentStatus(storeId, detail.id, reviewStatus, reviewNote, profile?.email);
      if (!alive.current || selectedStore.current !== ownerStore || sequence !== detailSequence.current) return;
      setDetail(response.data); setDetailError(''); setSuccess('Đã cập nhật trạng thái báo cáo.'); loadReports();
    } catch (error) { if (alive.current && selectedStore.current === ownerStore && sequence === detailSequence.current) setDetailError(errorMessage(error, 'Chưa cập nhật được trạng thái.')); }
  });

  const listHeader = <View style={styles.listHeader}>
    <View style={styles.hero}><View style={styles.heroIcon}><Ionicons accessible={false} name="megaphone-outline" size={30} color={uiColors.primaryStrong} /></View><Text style={styles.heroTitle}>Cùng giữ ca làm an toàn</Text><Text style={styles.heroBody}>Ghi nhận sự cố để đội ngũ sớm hỗ trợ.{manager ? ' Theo dõi báo cáo trong chi nhánh của bạn.' : ' Bạn có thể theo dõi mọi báo cáo đã gửi.'}</Text><Pressable accessibilityRole="button" onPress={openForm} style={ensureTouchTarget(styles.heroButton)}><Ionicons accessible={false} name="add" size={19} color="#FFFFFF" /><Text style={styles.heroButtonText}>Báo cáo sự cố</Text></Pressable></View>
    <Pressable accessibilityRole="button" disabled={stores.length < 2} onPress={() => setStorePicker(true)} style={ensureTouchTarget(styles.storeSelector)}><Ionicons accessible={false} name="storefront-outline" size={17} color={uiColors.muted} /><Text style={styles.storeText}>{store?.name || 'Chi nhánh của bạn'}</Text>{stores.length > 1 && <Ionicons accessible={false} name="chevron-down" size={16} color={uiColors.muted} />}</Pressable>
    {!!success && <View style={styles.successBox}><Ionicons accessible={false} name="checkmark-circle-outline" size={19} color={uiColors.successText} /><Text style={styles.successText}>{success}</Text></View>}
    {(fromCache || !online) && <View style={styles.notice}><Ionicons accessible={false} name="cloud-offline-outline" size={17} color={uiColors.warningText} /><Text style={styles.noticeText}>{fromCache ? 'Đang xem báo cáo đã lưu. Trạng thái có thể đã thay đổi.' : 'Đang ngoại tuyến. Cần có mạng để gửi và cập nhật báo cáo.'}</Text></View>}
    {!!listError && <View style={styles.errorBox}><Text style={styles.errorText}>{listError}</Text><Pressable accessibilityRole="button" onPress={() => loadReports()} style={ensureTouchTarget(styles.textButton)}><Text style={styles.orange}>Thử lại</Text></Pressable></View>}
    <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>{manager ? 'Báo cáo tại chi nhánh' : 'Báo cáo của tôi'}</Text><Text style={styles.sectionCount}>{reports.length}</Text></View>
  </View>;
  const renderReport = ({ item }) => {
    const category = INCIDENT_CATEGORIES.find((entry) => entry.value === item.category);
    return <Pressable accessibilityRole="button" accessibilityLabel={`Xem báo cáo ${category?.label || item.category}`} onPress={() => openDetail(item.id)} style={ensureTouchTarget(styles.reportCard)}>
      <View style={styles.reportTop}><View style={styles.reportIcon}><Ionicons accessible={false} name={category?.icon || 'clipboard-outline'} size={21} color="#746459" /></View><View style={{ flex: 1 }}><Text style={styles.reportTitle}>{category?.label || item.category}</Text><Text style={styles.reportTime}>{dateTime(item.createdAt)}</Text></View><Ionicons accessible={false} name="chevron-forward" size={18} color="#9BA3A7" /></View>
      <Text numberOfLines={2} style={styles.reportDescription}>{item.description}</Text><View style={styles.reportBottom}><Badge value={item.status} /><Badge value={item.severity} options={INCIDENT_SEVERITIES} />{!!item.photos?.length && <View style={styles.photoCount}><Ionicons accessible={false} name="image-outline" size={14} color={uiColors.muted} /><Text style={styles.smallText}>{item.photos.length}</Text></View>}</View>{manager && <Text style={styles.reporter}>{item.reporterName || 'Nhân viên'}</Text>}
    </Pressable>;
  };
  const closeDetail = () => { if (reviewBusy) return; detailSequence.current += 1; setDetailVisible(false); setDetail(null); setPhotoUris({}); };
  const cameraContent = <SafeAreaView style={styles.cameraSafe}><StatusBar style="light" /><View style={styles.cameraHeader}><Text style={styles.cameraTitle}>Ảnh hiện trường</Text><Pressable accessibilityRole="button" accessibilityLabel="Đóng camera" disabled={captureBusy} onPress={() => setCameraVisible(false)} style={ensureTouchTarget(styles.headerButton)}><Ionicons accessible={false} name="close" size={26} color="#FFFFFF" /></Pressable></View><View style={{ flex: 1 }}><CameraView ref={cameraRef} facing={cameraFacing} style={StyleSheet.absoluteFill} onCameraReady={() => setCameraReady(true)} onMountError={() => { setCameraVisible(false); setCameraError('Camera không khởi động được. Kiểm tra quyền camera hoặc gửi báo cáo không kèm ảnh.'); }} /></View><View style={styles.cameraControls}><Pressable accessibilityRole="button" accessibilityLabel="Đổi camera" disabled={captureBusy} onPress={() => { setCameraReady(false); setCameraFacing((current) => current === 'back' ? 'front' : 'back'); }} style={ensureTouchTarget(styles.headerButton)}><Ionicons accessible={false} name="camera-reverse-outline" size={28} color="#FFFFFF" /></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Chụp ảnh" disabled={captureBusy || !cameraReady} onPress={capture} style={ensureTouchTarget([styles.shutter, (captureBusy || !cameraReady) && styles.disabled])}>{captureBusy ? <ActivityIndicator color="#FFFFFF" /> : <View style={styles.shutterInside} />}</Pressable><View style={styles.headerButton} /></View><Text style={styles.cameraHint}>{captureBusy ? 'Đang xử lý ảnh…' : cameraError || 'Giữ máy ổn định và chụp khu vực xảy ra sự cố'}</Text></SafeAreaView>;

  return <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}><StatusBar style="dark" />
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => navigation.goBack()} style={ensureTouchTarget(styles.headerButton)}><BackIcon /></Pressable><Text accessibilityRole="header" style={styles.headerTitle}>Báo cáo sự cố</Text><Pressable accessibilityRole="button" accessibilityLabel="Tạo báo cáo sự cố" disabled={!storeId} onPress={openForm} style={ensureTouchTarget(styles.headerButton)}><Ionicons accessible={false} name="add" size={26} color={storeId ? uiColors.secondary : uiColors.lineStrong} /></Pressable></View>
    {identityLoading ? <View style={styles.loading}><ActivityIndicator color={uiColors.primaryStrong} /><Text style={styles.loadingText}>Đang tải tài khoản…</Text></View> : identityError ? <Empty title="Chưa tải được tài khoản" body={identityError} onRetry={loadIdentity} /> : !storeId ? <Empty title="Chưa có chi nhánh" body="Bạn cần được phân công vào một chi nhánh để gửi báo cáo." icon="storefront-outline" />
      : <FlatList data={loading ? [] : reports} renderItem={renderReport} keyExtractor={(item) => String(item.id)} contentContainerStyle={{ flexGrow: 1, paddingBottom: bottomPadding + 12 }} ListHeaderComponent={listHeader}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadReports()} tintColor={uiColors.orange} />}
        ListEmptyComponent={loading ? <View style={styles.skeleton}>{[1, 2, 3].map((key) => <View key={key} style={styles.skeletonCard}><View style={[styles.skeletonLine, { width: '45%' }]} /><View style={styles.skeletonLine} /><View style={[styles.skeletonLine, { width: '70%' }]} /></View>)}</View> : <Empty title="Chưa có báo cáo" body="Khi có sự cố trong ca làm, hãy ghi nhận tại đây để quản lý có thể hỗ trợ." />} />}
    <BottomNavbar navigation={navigation} activeRoute="IncidentReport" />

    <Modal visible={formVisible} animationType="slide" onRequestClose={() => { if (cameraVisible) { if (!captureBusy) setCameraVisible(false); } else if (!submitBusy) setFormVisible(false); }}>{cameraVisible ? cameraContent : <SafeAreaView style={styles.safe}><View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Đóng bản nháp" disabled={submitBusy} onPress={() => setFormVisible(false)} style={ensureTouchTarget(styles.headerButton)}><BackIcon /></Pressable><Text accessibilityRole="header" style={styles.headerTitle}>Báo cáo mới</Text><View style={styles.headerButton} /></View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
        <View style={styles.formStore}><Ionicons accessible={false} name="storefront-outline" size={18} color="#746459" /><Text style={styles.formStoreText}>{store?.name || 'Chi nhánh của bạn'}</Text></View>
        <Text style={styles.label}>Loại sự cố <Text style={styles.required}>*</Text></Text><View style={styles.categoryGrid}>{INCIDENT_CATEGORIES.map((item) => <Pressable key={item.value} accessibilityLabel={item.label} accessibilityRole="radio" accessibilityState={{ selected: draft.category === item.value }} aria-selected={draft.category === item.value} disabled={submitBusy} onPress={() => changeDraft({ category: item.value })} style={ensureTouchTarget([styles.category, draft.category === item.value && styles.selectedCategory])}><Ionicons accessible={false} name={item.icon} size={24} color={draft.category === item.value ? uiColors.orange : uiColors.muted} /><Text style={[styles.categoryText, draft.category === item.value && styles.orange]}>{item.label}</Text>{draft.category === item.value && <Ionicons accessible={false} name="checkmark-circle" size={16} color={uiColors.primaryStrong} style={styles.checkmark} />}</Pressable>)}</View>
        <Text style={styles.label}>Mức độ <Text style={styles.required}>*</Text></Text><View style={styles.severityRow}>{INCIDENT_SEVERITIES.map((item) => <Pressable key={item.value} accessibilityLabel={item.label} accessibilityRole="radio" accessibilityState={{ selected: draft.severity === item.value }} aria-selected={draft.severity === item.value} disabled={submitBusy} onPress={() => changeDraft({ severity: item.value })} style={ensureTouchTarget([styles.severityChoice, draft.severity === item.value && { backgroundColor: item.background, borderColor: item.color }])}><View style={[styles.severityDot, { backgroundColor: item.color }]} /><Text style={[styles.severityText, draft.severity === item.value && { color: item.color, fontWeight: '600' }]}>{item.label}</Text></Pressable>)}</View>
        <Text style={styles.label}>Mô tả sự cố <Text style={styles.required}>*</Text></Text><TextInput accessibilityLabel="Mô tả sự cố" multiline editable={!submitBusy} maxLength={2000} value={draft.description} onChangeText={(description) => changeDraft({ description })} placeholder="Chuyện gì đã xảy ra? Ở đâu và cần hỗ trợ gì?" placeholderTextColor={uiColors.muted} style={styles.descriptionInput} textAlignVertical="top" /><View style={styles.inputHelp}><Text style={styles.helper}>Ít nhất 10 ký tự</Text><Text style={styles.helper}>{draft.description.trim().length}/2.000</Text></View>
        <Text style={styles.label}>Ca làm liên quan <Text style={styles.optional}>(không bắt buộc)</Text></Text><Text style={styles.helper}>Các ca được phân công hôm nay và 7 ngày gần đây.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shiftChoices}><Pressable accessibilityRole="radio" accessibilityState={{ selected: !draft.shiftId }} aria-selected={!draft.shiftId} disabled={submitBusy} onPress={() => changeDraft({ shiftId: null })} style={ensureTouchTarget([styles.shiftChoice, !draft.shiftId && styles.selectedCategory])}><Text style={!draft.shiftId ? styles.orange : styles.smallText}>Không gắn ca</Text></Pressable>{availableShifts.map((shift) => { const id = shift.shiftId || shift.id; return <Pressable key={shift.assignmentId || shift.id} accessibilityRole="radio" accessibilityState={{ selected: draft.shiftId === id }} aria-selected={draft.shiftId === id} disabled={submitBusy} onPress={() => changeDraft({ shiftId: id })} style={ensureTouchTarget([styles.shiftChoice, draft.shiftId === id && styles.selectedCategory])}><Text style={draft.shiftId === id ? styles.orange : styles.smallText}>{shiftLabel(shift)}</Text></Pressable>; })}</ScrollView>
        {shiftsLoading ? <ActivityIndicator size="small" color={uiColors.primaryStrong} style={{ alignSelf: 'flex-start' }} /> : !!shiftsError ? <Pressable style={ensureTouchTarget()} accessibilityRole="button" onPress={loadShifts}><Text style={styles.inlineWarning}>{shiftsError} Chạm để thử lại.</Text></Pressable> : !availableShifts.length && <Text style={styles.helper}>Không có ca gần đây để chọn.</Text>}
        <View style={styles.photoHeading}><Text style={styles.label}>Ảnh hiện trường <Text style={styles.optional}>(tối đa 3)</Text></Text><Text style={styles.helper}>{draft.photos.length}/3</Text></View><Text style={styles.helper}>Chụp ảnh thật nếu cần. Ảnh là không bắt buộc.</Text>
        <View style={styles.photoRow}>{draft.photos.map((photo, index) => <View key={photo.uri} style={styles.preview}><Image source={{ uri: photo.uri }} style={styles.previewImage} accessibilityLabel={`Ảnh sự cố ${index + 1}`} /><Pressable accessibilityRole="button" accessibilityLabel={`Xóa ảnh ${index + 1}`} disabled={submitBusy} onPress={() => changeDraft({ photos: draft.photos.filter((entry) => entry.uri !== photo.uri) })} style={ensureTouchTarget(styles.removePhoto)}><Ionicons accessible={false} name="close" size={18} color="#FFFFFF" /></Pressable></View>)}{draft.photos.length < 3 && <Pressable accessibilityRole="button" accessibilityLabel="Chụp ảnh sự cố" disabled={submitBusy || busy['open-incident-camera']} onPress={openCamera} style={ensureTouchTarget(styles.addPhoto)}>{busy['open-incident-camera'] ? <ActivityIndicator color={uiColors.primaryStrong} /> : <Ionicons accessible={false} name="camera-outline" size={27} color="#746459" />}<Text style={styles.addPhotoText}>Chụp ảnh</Text></Pressable>}</View>
        {!!cameraError && <View style={styles.notice}><Text style={styles.noticeText}>{cameraError}</Text>{Platform.OS !== 'web' && permission?.canAskAgain === false && <Pressable style={ensureTouchTarget()} accessibilityRole="button" onPress={() => Linking.openSettings().catch(() => {})}><Text style={styles.orange}>Mở cài đặt</Text></Pressable>}</View>}
        {!online && <View style={styles.notice}><Text style={styles.noticeText}>Bạn đang ngoại tuyến. Cần có mạng để gửi báo cáo và ảnh. Giữ bản nháp này rồi thử lại.</Text></View>}
        {!!formError && <View style={styles.errorBox}><Text accessibilityRole="alert" style={styles.errorText}>{formError}</Text></View>}
        <Pressable accessibilityRole="button" accessibilityLabel="Gửi báo cáo sự cố" disabled={submitBusy || !online} onPress={send} style={ensureTouchTarget([styles.primary, (submitBusy || !online) && styles.disabled])}>{submitBusy ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Ionicons accessible={false} name="paper-plane-outline" size={18} color="#FFFFFF" />}<Text style={styles.primaryText}>{submitBusy ? 'Đang gửi báo cáo…' : 'Gửi báo cáo'}</Text></Pressable><Text style={styles.privacyNote}>Báo cáo và ảnh được chia sẻ với quản lý chi nhánh để xử lý sự cố.</Text>
      </ScrollView></KeyboardAvoidingView></SafeAreaView>}</Modal>

    <Modal visible={detailVisible} animationType="slide" onRequestClose={closeDetail}><SafeAreaView style={styles.safe}><View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Đóng chi tiết báo cáo" disabled={reviewBusy} onPress={closeDetail} style={ensureTouchTarget(styles.headerButton)}><BackIcon /></Pressable><Text accessibilityRole="header" style={styles.headerTitle}>Chi tiết báo cáo</Text><View style={styles.headerButton} /></View>{detailLoading ? <View style={styles.loading}><ActivityIndicator color={uiColors.primaryStrong} /><Text style={styles.loadingText}>Đang tải báo cáo…</Text></View> : <ScrollView contentContainerStyle={styles.form}>
      {!!detailError && <View style={styles.errorBox}><Text style={styles.errorText}>{detailError}</Text></View>}{detail && <><View style={styles.detailCategory}><View style={styles.heroIcon}><Ionicons accessible={false} name={INCIDENT_CATEGORIES.find((item) => item.value === detail.category)?.icon || 'clipboard-outline'} size={31} color={uiColors.primaryStrong} /></View><Text style={styles.detailTitle}>{INCIDENT_CATEGORIES.find((item) => item.value === detail.category)?.label || detail.category}</Text><Text style={styles.helper}>{dateTime(detail.createdAt)}</Text></View><View style={styles.detailBadges}><Badge value={detail.status} /><Badge value={detail.severity} options={INCIDENT_SEVERITIES} /></View>
        <View style={styles.detailInfo}><Text style={styles.helper}>Chi nhánh</Text><Text style={styles.detailText}>{store?.name}</Text>{manager && <><Text style={styles.helper}>Người báo cáo</Text><Text style={styles.detailText}>{detail.reporterName || 'Nhân viên'}</Text></>}{detail.shiftId && <><Text style={styles.helper}>Ca làm liên quan</Text><Text style={styles.detailText}>{shifts.find((shift) => String(shift.shiftId || shift.id) === String(detail.shiftId)) ? shiftLabel(shifts.find((shift) => String(shift.shiftId || shift.id) === String(detail.shiftId))) : 'Đã gắn ca được phân công'}</Text></>}</View>
        <Text style={styles.label}>Nội dung sự cố</Text><Text selectable style={styles.detailDescription}>{detail.description}</Text>{!!detail.photos?.length && <><Text style={styles.label}>Ảnh đính kèm ({detail.photos.length})</Text>{photosLoading && <ActivityIndicator size="small" color={uiColors.primaryStrong} />}{Object.entries(photoUris).map(([id, uri]) => <Image key={id} source={{ uri }} resizeMode="contain" style={styles.detailPhoto} accessibilityLabel="Ảnh hiện trường đã gửi" />)}{!!photoError && <Text style={styles.inlineWarning}>{photoError}</Text>}</>}
        {!!detail.reviewNote && <View style={styles.reviewNote}><Text style={styles.reviewNoteTitle}>Phản hồi của quản lý</Text><Text style={styles.detailDescription}>{detail.reviewNote}</Text><Text style={styles.helper}>{dateTime(detail.updatedAt)}</Text></View>}
        {manager && <View style={styles.reviewPanel}><Text style={styles.label}>Cập nhật xử lý</Text><View style={styles.statusChoices}>{INCIDENT_STATUSES.map((item) => <Pressable key={item.value} accessibilityLabel={item.label} accessibilityRole="radio" accessibilityState={{ selected: reviewStatus === item.value }} aria-selected={reviewStatus === item.value} disabled={reviewBusy} onPress={() => setReviewStatus(item.value)} style={ensureTouchTarget([styles.statusChoice, reviewStatus === item.value && { backgroundColor: item.background, borderColor: item.color }])}><Text style={[styles.smallText, reviewStatus === item.value && { color: item.color }]}>{item.label}</Text></Pressable>)}</View><TextInput accessibilityLabel="Ghi chú xử lý sự cố" editable={!reviewBusy} multiline maxLength={2000} value={reviewNote} onChangeText={setReviewNote} placeholder="Ghi chú xử lý (không bắt buộc)" style={[styles.descriptionInput, { minHeight: 96 }]} /><Pressable accessibilityRole="button" disabled={reviewBusy || !online} onPress={saveReview} style={ensureTouchTarget([styles.primary, (reviewBusy || !online) && styles.disabled])}>{reviewBusy && <ActivityIndicator size="small" color="#FFFFFF" />}<Text style={styles.primaryText}>{reviewBusy ? 'Đang cập nhật…' : 'Lưu trạng thái'}</Text></Pressable></View>}
      </>}</ScrollView>}</SafeAreaView></Modal>

    <Modal visible={storePicker} transparent animationType="fade" onRequestClose={() => setStorePicker(false)}><View style={styles.overlay}><View style={styles.sheet}><Text style={styles.sheetTitle}>Chọn chi nhánh</Text><ScrollView>{stores.map((item) => <Pressable key={item.id} accessibilityRole="button" onPress={() => { setStorePicker(false); setStoreId(item.id); setSuccess(''); }} style={ensureTouchTarget(styles.storeChoice)}><Ionicons accessible={false} name="storefront-outline" size={21} color={uiColors.muted} /><Text style={{ flex: 1, color: "#404B57" }}>{item.name}</Text>{String(item.id) === String(storeId) && <Ionicons accessible={false} name="checkmark" size={22} color={uiColors.primaryStrong} />}</Pressable>)}</ScrollView><Pressable accessibilityRole="button" onPress={() => setStorePicker(false)} style={ensureTouchTarget(styles.textButton)}><Text style={styles.orange}>Đóng</Text></Pressable></View></View></Modal>
  </SafeAreaView>;
}

const styles = createAppStyles({
  safe: { flex: 1, backgroundColor: uiColors.surface }, header: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: uiColors.subtle }, headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, headerTitle: { fontSize: 18, fontWeight: '600', color: "#404B57" }, listHeader: { paddingTop: 20 }, hero: { marginHorizontal: 20, padding: 22, backgroundColor: uiColors.peach, borderRadius: 21, alignItems: 'center' }, heroIcon: { width: 62, height: 62, borderRadius: 21, backgroundColor: "#EFDDD1", alignItems: 'center', justifyContent: 'center', marginBottom: 13 }, heroTitle: { fontSize: 18, fontWeight: '600', color: "#404B57", textAlign: 'center' }, heroBody: { color: "#746459", fontSize: 13, lineHeight: 21, textAlign: 'center', marginTop: 8 }, heroButton: { marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 43, paddingHorizontal: 22, borderRadius: 24, backgroundColor: uiColors.orange }, heroButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  storeSelector: { flexDirection: 'row', alignItems: 'center', gap: 9, marginHorizontal: 24, marginVertical: 20 }, storeText: { flex: 1, color: uiColors.muted, fontSize: 13 }, sectionHeading: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 22, marginBottom: 14, marginTop: 4, gap: 8 }, sectionTitle: { color: uiColors.secondary, fontSize: 15, fontWeight: '600' }, sectionCount: { color: uiColors.muted, fontSize: 12 }, reportCard: { marginHorizontal: 20, marginBottom: 12, borderWidth: 1, borderColor: uiColors.line, borderRadius: 17, padding: 16 }, reportTop: { flexDirection: 'row', gap: 12, alignItems: 'center' }, reportIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: uiColors.peach, alignItems: 'center', justifyContent: 'center' }, reportTitle: { color: uiColors.secondary, fontSize: 15, fontWeight: '600' }, reportTime: { color: uiColors.muted, fontSize: 11, marginTop: 5 }, reportDescription: { color: uiColors.muted, fontSize: 13, lineHeight: 20, marginTop: 13 }, reportBottom: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7, marginTop: 13 }, badge: { alignSelf: 'flex-start', paddingVertical: 5, paddingHorizontal: 9, borderRadius: 7 }, badgeText: { fontSize: 10, fontWeight: '600' }, photoCount: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' }, smallText: { color: uiColors.muted, fontSize: 12 }, reporter: { color: uiColors.muted, fontSize: 11, marginTop: 10 },
  empty: { minHeight: 250, padding: 30, justifyContent: 'center', alignItems: 'center', flex: 1 }, emptyIcon: { height: 86, width: 86, borderRadius: 30, backgroundColor: uiColors.peach, alignItems: 'center', justifyContent: 'center' }, emptyTitle: { color: uiColors.secondary, fontSize: 17, fontWeight: '600', marginTop: 15 }, emptyBody: { color: uiColors.muted, fontSize: 13, textAlign: 'center', marginTop: 9, lineHeight: 21, maxWidth: 285 }, textButton: { alignSelf: 'center', paddingHorizontal: 14, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, orange: { color: uiColors.primaryStrong, fontSize: 13, fontWeight: '600' }, loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }, loadingText: { fontSize: 13, color: uiColors.muted }, skeleton: { paddingHorizontal: 20 }, skeletonCard: { borderWidth: 1, borderColor: uiColors.subtle, borderRadius: 17, padding: 18, marginBottom: 14, gap: 12 }, skeletonLine: { backgroundColor: uiColors.subtle, height: 13, borderRadius: 4 },
  form: { padding: 22, paddingBottom: 40 }, formStore: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 }, formStoreText: { color: "#746459", fontSize: 13, flex: 1 }, label: { fontSize: 14, fontWeight: '600', color: uiColors.secondary, marginTop: 23, marginBottom: 11 }, required: { color: uiColors.primaryStrong }, optional: { color: uiColors.muted, fontSize: 11, fontWeight: '400' }, categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, category: { flexBasis: '46%', flexGrow: 1, minHeight: 86, borderRadius: 14, borderWidth: 1, borderColor: uiColors.line, alignItems: 'center', justifyContent: 'center', gap: 8 }, selectedCategory: { borderColor: "#E9C8B8", backgroundColor: uiColors.peach }, categoryText: { fontSize: 12, color: uiColors.muted }, checkmark: { position: 'absolute', top: 7, right: 8 }, severityRow: { flexDirection: 'row', gap: 8 }, severityChoice: { borderWidth: 1, borderColor: uiColors.line, borderRadius: 11, flex: 1, minHeight: 43, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 4 }, severityDot: { width: 6, height: 6, borderRadius: 3 }, severityText: { fontSize: 11, color: uiColors.muted }, descriptionInput: { minHeight: 132, borderWidth: 1, borderColor: uiColors.line, backgroundColor: uiColors.surface, borderRadius: 13, padding: 14, color: uiColors.secondary, fontSize: 14, lineHeight: 22, textAlignVertical: 'top' }, inputHelp: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }, helper: { fontSize: 11, color: uiColors.muted, lineHeight: 17 }, shiftChoices: { flexDirection: 'row', gap: 8, paddingVertical: 12 }, shiftChoice: { borderWidth: 1, borderColor: uiColors.line, borderRadius: 10, paddingHorizontal: 13, minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  photoHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }, photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 13 }, preview: { height: 97, width: 94, borderRadius: 12, overflow: 'hidden' }, previewImage: { height: '100%', width: '100%' }, removePhoto: { position: 'absolute', right: 2, top: 2, height: 32, width: 32, borderRadius: 16, backgroundColor: "#28313B88", alignItems: 'center', justifyContent: 'center' }, addPhoto: { height: 97, width: 94, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: '#DCCBBD', backgroundColor: uiColors.surface, alignItems: 'center', justifyContent: 'center', gap: 7 }, addPhotoText: { fontSize: 11, color: "#746459" }, primary: { minHeight: 48, borderRadius: 25, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: uiColors.orange, marginTop: 25 }, primaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' }, disabled: { opacity: 0.5 }, privacyNote: { textAlign: 'center', color: uiColors.muted, fontSize: 11, lineHeight: 18, marginTop: 13, paddingHorizontal: 5 },
  notice: { padding: 12, backgroundColor: uiColors.butter, borderRadius: 12, marginVertical: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, noticeText: { fontSize: 12, color: uiColors.warningText, flex: 1, lineHeight: 19 }, errorBox: { padding: 13, backgroundColor: uiColors.dangerSoft, borderRadius: 12, marginVertical: 10 }, errorText: { color: uiColors.dangerText, fontSize: 12, lineHeight: 20 }, inlineWarning: { fontSize: 11, lineHeight: 18, color: uiColors.warningText, marginTop: 6 }, successBox: { marginHorizontal: 20, marginBottom: 14, padding: 13, flexDirection: 'row', gap: 8, backgroundColor: uiColors.mint, borderRadius: 12 }, successText: { flex: 1, color: uiColors.successText, fontSize: 12, lineHeight: 19 },
  cameraSafe: { flex: 1, backgroundColor: uiColors.ink }, cameraHeader: { height: 58, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, cameraTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' }, cameraControls: { height: 112, paddingHorizontal: 32, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, shutter: { height: 76, width: 76, borderRadius: 38, borderWidth: 3, borderColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' }, shutterInside: { height: 61, width: 61, borderRadius: 31, backgroundColor: uiColors.surface }, cameraHint: { color: uiColors.lineStrong, textAlign: 'center', fontSize: 12, paddingBottom: 20 },
  detailCategory: { alignItems: 'center', paddingVertical: 12 }, detailTitle: { fontSize: 23, color: uiColors.secondary, fontWeight: '600', marginBottom: 8 }, detailBadges: { flexDirection: 'row', justifyContent: 'center', gap: 9, marginTop: 8, marginBottom: 22 }, detailInfo: { backgroundColor: uiColors.surface, padding: 16, borderRadius: 14, gap: 3 }, detailText: { color: uiColors.muted, fontSize: 13, lineHeight: 20, marginBottom: 8 }, detailDescription: { color: uiColors.muted, fontSize: 14, lineHeight: 23 }, detailPhoto: { width: '100%', height: 260, borderRadius: 13, backgroundColor: uiColors.canvas, marginBottom: 12 }, reviewNote: { marginTop: 24, borderRadius: 14, padding: 16, backgroundColor: uiColors.sky, gap: 8 }, reviewNoteTitle: { color: '#5C758C', fontSize: 13, fontWeight: '600' }, reviewPanel: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#F0EFED' }, statusChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }, statusChoice: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 11, borderWidth: 1, borderColor: uiColors.line },
  overlay: { flex: 1, backgroundColor: "#28313B55", justifyContent: 'center', padding: 24 }, sheet: { backgroundColor: uiColors.surface, padding: 20, borderRadius: 22, maxHeight: '80%' }, sheetTitle: { color: "#404B57", fontSize: 17, fontWeight: '600', marginBottom: 15 }, storeChoice: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15 },
});

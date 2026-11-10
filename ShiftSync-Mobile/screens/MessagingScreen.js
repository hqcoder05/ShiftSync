import { colors as uiColors } from '../theme/koreanPalette';
import { createAppStyles } from '../theme/appTheme';
import CompanionPeekCard from '../components/CompanionPeekCard';
import { ensureTouchTarget } from '../utils/touchTarget';
import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  ActivityIndicator, AppState, FlatList, KeyboardAvoidingView, Modal, Platform,
  Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomNavbar, { useBottomNavbarPadding } from '../components/BottomNavbar';
import BackIcon from '../components/BackIcon';
import UserAvatar from '../components/UserAvatar';
import { getMyProfile, getMyStores } from '../services/profileService';
import { getNetworkSnapshot, subscribeNetwork } from '../services/networkState';
import {
  createClientMessageId, createMessagingThread, getMessagingContacts, getMessagingThreads,
  getStoreAnnouncements, getThreadMessages, markThreadRead, mergeThreadMessages,
  publishStoreAnnouncement, refreshMessagingUnreadCount, sendThreadMessage,
} from '../services/messagingService';
import useActionGuard from '../utils/useActionGuard';

const listData = (response) => Array.isArray(response?.data) ? response.data : [];
const roleLabel = (role) => role === 'MANAGER' ? 'Quản lý' : role === 'ADMIN' ? 'Quản trị viên' : 'Nhân viên';
const searchText = (value = '') => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
const errorText = (error, fallback) => error?.response?.data?.message || error?.message || fallback;
function timeLabel(value, full = false) {
  if (!value || !Number.isFinite(Date.parse(value))) return '';
  const date = new Date(value), now = new Date();
  const day = (item) => item.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  return date.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', ...(full || day(date) !== day(now) ? { day: '2-digit', month: '2-digit' } : {}),
    hour: '2-digit', minute: '2-digit',
  });
}
function PersonAvatar({ person, size = 46 }) {
  if (person?.avatarId) return <View style={styles.avatarFrame}><UserAvatar avatarId={person.avatarId} size={size} animated={false} /></View>;
  const initials = (person?.fullName || '').trim().split(/\s+/).slice(-2).map((part) => part[0] || '').join('').toUpperCase();
  return <View style={[styles.initials, { width: size, height: size, borderRadius: size / 2 }]}><Text style={{ color: uiColors.primaryStrong, fontSize: size * 0.32, fontWeight: '600' }}>{initials || '?'}</Text></View>;
}
function EmptyState({ icon = 'chatbubbles-outline', title, body, onRetry }) {
  return <View style={styles.empty}>
    <View style={styles.emptyArt}><Ionicons name={icon} size={32} color={uiColors.primaryStrong} accessible={false} /></View>
    <Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyBody}>{body}</Text>
    {onRetry && <Pressable accessibilityRole="button" onPress={onRetry} style={ensureTouchTarget(styles.retry)}><Text style={styles.orangeText}>Thử lại</Text></Pressable>}
  </View>;
}

export default function MessagingScreen({ navigation }) {
  const bottomPadding = useBottomNavbarPadding();
  const { online } = useSyncExternalStore(subscribeNetwork, getNetworkSnapshot, getNetworkSnapshot);
  const { runAction, busy } = useActionGuard();
  const alive = useRef(true), inboxSequence = useRef(0), selectedStore = useRef(null), activeThread = useRef(null);
  const messageList = useRef(null), autoScroll = useRef(true), paginationReady = useRef(false), readCursor = useRef(null), sendAttempt = useRef(null);
  const [profile, setProfile] = useState(null), [stores, setStores] = useState([]), [storeId, setStoreId] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true), [initialError, setInitialError] = useState('');
  const [tab, setTab] = useState('messages'), [threads, setThreads] = useState([]), [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false), [refreshing, setRefreshing] = useState(false), [errors, setErrors] = useState({});
  const [fromCache, setFromCache] = useState(false), [onboardingHidden, setOnboardingHidden] = useState(false), [storePicker, setStorePicker] = useState(false);
  const [composeVisible, setComposeVisible] = useState(false), [contacts, setContacts] = useState([]), [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState(''), [query, setQuery] = useState('');
  const [thread, setThread] = useState(null), [messages, setMessages] = useState([]), [conversationLoading, setConversationLoading] = useState(false);
  const [conversationError, setConversationError] = useState(''), [accessDenied, setAccessDenied] = useState(false);
  const [before, setBefore] = useState(null), [hasMore, setHasMore] = useState(false), [olderLoading, setOlderLoading] = useState(false), [draft, setDraft] = useState('');
  const [expanded, setExpanded] = useState(new Set()), [announcementVisible, setAnnouncementVisible] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState(''), [announcementBody, setAnnouncementBody] = useState(''), [publishError, setPublishError] = useState('');
  selectedStore.current = storeId;
  activeThread.current = thread;
  const ownerEmail = profile?.email;
  const currentStore = stores.find((store) => String(store.id || store.storeId) === String(storeId));
  const storeName = currentStore?.name || currentStore?.storeName || 'Chi nhánh của bạn';
  const canPublish = ['MANAGER', 'ADMIN'].includes(profile?.systemRole || profile?.role);

  const loadIdentity = useCallback(async () => {
    setInitialLoading(true); setInitialError('');
    try {
      const response = await getMyProfile();
      if (!response.data?.id) throw new Error('Chưa tải được tài khoản.');
      const storeResponse = await getMyStores(response.data.id);
      if (!alive.current) return;
      const ownStores = listData(storeResponse)
        .filter((store) => !store.status || store.status === 'ACTIVE')
        .map((store) => ({ ...store, id: store.storeId || store.id, name: store.storeName || store.name }))
        .filter((store) => store.id);
      setProfile(response.data); setStores(ownStores);
      setStoreId(ownStores[0]?.id || ownStores[0]?.storeId || null);
    } catch (error) { if (alive.current) setInitialError(errorText(error, 'Chưa tải được chi nhánh.')); }
    finally { if (alive.current) setInitialLoading(false); }
  }, []);
  useEffect(() => { alive.current = true; loadIdentity(); return () => { alive.current = false; }; }, [loadIdentity]);

  const loadInbox = useCallback(async (showLoading = false) => {
    if (!storeId) return;
    const sequence = ++inboxSequence.current;
    if (showLoading) setLoading(true);
    const results = await Promise.allSettled([getMessagingThreads(storeId, ownerEmail), getStoreAnnouncements(storeId, ownerEmail)]);
    if (!alive.current || selectedStore.current !== storeId || sequence !== inboxSequence.current) return;
    const [threadResult, announcementResult] = results;
    if (threadResult.status === 'fulfilled') setThreads(listData(threadResult.value));
    else if ([403, 404].includes(threadResult.reason?.response?.status)) setThreads([]);
    if (announcementResult.status === 'fulfilled') setAnnouncements(listData(announcementResult.value));
    else if ([403, 404].includes(announcementResult.reason?.response?.status)) setAnnouncements([]);
    setErrors({ messages: threadResult.status === 'rejected' ? errorText(threadResult.reason, 'Chưa tải được tin nhắn.') : '',
      announcements: announcementResult.status === 'rejected' ? errorText(announcementResult.reason, 'Chưa tải được thông báo chung.') : '' });
    setFromCache(results.some((result) => result.status === 'fulfilled' && result.value.fromCache));
    setLoading(false); setRefreshing(false);
    refreshMessagingUnreadCount().catch(() => {});
  }, [storeId, ownerEmail]);
  useEffect(() => {
    if (!storeId) return;
    setThreads([]); setAnnouncements([]); setErrors({}); setThread(null); setExpanded(new Set());
    setOnboardingHidden(false); loadInbox(true);
    const key = `@messaging-onboarding:${profile?.id}:${storeId}`;
    let active = true;
    AsyncStorage.getItem(key).then((value) => { if (active) setOnboardingHidden(value === 'hidden'); }).catch(() => {});
    const refresh = () => { if ((AppState.currentState == null || AppState.currentState === 'active') && navigation.isFocused?.() !== false) loadInbox(); };
    const focus = navigation.addListener?.('focus', refresh);
    const timer = setInterval(refresh, 15000);
    const app = AppState.addEventListener('change', (state) => { if (state === 'active') refresh(); });
    const network = subscribeNetwork(() => { if (getNetworkSnapshot().online) refresh(); });
    return () => { active = false; clearInterval(timer); focus?.(); app.remove(); network(); };
  }, [storeId, profile?.id, loadInbox, navigation]);

  const loadContacts = useCallback(async () => {
    if (!storeId) return;
    setContactsLoading(true); setContactsError('');
    try {
      const response = await getMessagingContacts(storeId, ownerEmail);
      if (alive.current && selectedStore.current === storeId) setContacts(listData(response).filter((person) => String(person.id) !== String(profile?.id)));
    } catch (error) { if (alive.current) setContactsError(errorText(error, 'Chưa tải được đồng nghiệp.')); }
    finally { if (alive.current) setContactsLoading(false); }
  }, [storeId, ownerEmail, profile?.id]);
  const openComposer = () => { setContacts([]); setQuery(''); setComposeVisible(true); loadContacts(); };
  const openThread = (value) => {
    setThread(value); setMessages([]); setDraft(''); setBefore(null); setHasMore(false);
    setConversationLoading(true); setConversationError(''); setAccessDenied(false);
    paginationReady.current = false; readCursor.current = null; sendAttempt.current = null; autoScroll.current = true;
  };
  const chooseRecipient = (person) => runAction('open-thread', async () => {
    try {
      const response = await createMessagingThread(storeId, person.id, ownerEmail);
      if (!alive.current) return;
      setComposeVisible(false); openThread(response.data); loadInbox();
    } catch (error) { if (alive.current) setContactsError(errorText(error, 'Chưa mở được cuộc trò chuyện.')); }
  });

  const loadConversation = useCallback(async (older = false, cursor = null) => {
    if (!thread?.id || !storeId) return;
    const threadId = thread.id;
    if (older) setOlderLoading(true);
    try {
      const response = await getThreadMessages(storeId, threadId, { before: older ? cursor : undefined, ownerEmail });
      if (!alive.current || selectedStore.current !== storeId || activeThread.current?.id !== threadId) return;
      const incoming = Array.isArray(response.data?.messages) ? response.data.messages : [];
      if (older) autoScroll.current = false;
      setMessages((current) => mergeThreadMessages(current, incoming));
      setConversationError(''); setAccessDenied(false);
      if (older || !paginationReady.current) {
        setBefore(response.data?.nextBefore || null); setHasMore(!!response.data?.hasMore);
        paginationReady.current = true;
      }
      const latestId = incoming[incoming.length - 1]?.id;
      if (!older && latestId && latestId !== readCursor.current && online && !response.fromCache) {
        const read = await markThreadRead(storeId, threadId, latestId, ownerEmail);
        if (alive.current && activeThread.current?.id === threadId) {
          readCursor.current = latestId;
          setThreads((current) => current.map((item) => item.id === threadId ? { ...item, unreadCount: Number(read.data?.unreadCount) || 0 } : item));
          refreshMessagingUnreadCount().catch(() => {});
        }
      }
    } catch (error) {
      if (alive.current && activeThread.current?.id === threadId) {
        setConversationError(errorText(error, 'Chưa tải được cuộc trò chuyện.'));
        if ([403, 404].includes(error.response?.status)) setAccessDenied(true);
      }
    } finally {
      if (alive.current && activeThread.current?.id === threadId) { setConversationLoading(false); setOlderLoading(false); }
    }
  }, [thread?.id, storeId, ownerEmail, online]);
  useEffect(() => {
    if (!thread?.id) return;
    loadConversation();
    const refresh = () => { if ((AppState.currentState == null || AppState.currentState === 'active') && navigation.isFocused?.() !== false) loadConversation(); };
    const timer = setInterval(refresh, 8000);
    const app = AppState.addEventListener('change', (state) => { if (state === 'active') refresh(); });
    return () => { clearInterval(timer); app.remove(); };
  }, [thread?.id, loadConversation, navigation]);
  const send = () => runAction('send-message', async () => {
    const content = draft.trim(), selected = thread;
    if (!online || !selected?.id || !content || accessDenied) return;
    if (sendAttempt.current?.threadId !== selected.id || sendAttempt.current?.content !== content) {
      sendAttempt.current = { threadId: selected.id, content, id: createClientMessageId() };
    }
    const clientMessageId = sendAttempt.current.id;
    try {
      const response = await sendThreadMessage(storeId, selected.id, { content, clientMessageId }, ownerEmail);
      if (!alive.current) return;
      if (activeThread.current?.id === selected.id) {
        autoScroll.current = true;
        setMessages((current) => mergeThreadMessages(current, [response.data]));
        setDraft(''); setConversationError(''); sendAttempt.current = null;
      }
      loadInbox();
    } catch (error) {
      if (alive.current && activeThread.current?.id === selected.id) setConversationError(errorText(error, 'Chưa gửi được. Nội dung vẫn được giữ để bạn thử lại.'));
    }
  });
  const publish = () => runAction('publish-announcement', async () => {
    if (!canPublish || !online || !announcementTitle.trim() || !announcementBody.trim()) return;
    try {
      await publishStoreAnnouncement(storeId, { title: announcementTitle.trim(), content: announcementBody.trim() }, ownerEmail);
      if (!alive.current) return;
      setAnnouncementVisible(false); setAnnouncementTitle(''); setAnnouncementBody(''); setPublishError(''); loadInbox();
    } catch (error) { if (alive.current) setPublishError(errorText(error, 'Chưa đăng được thông báo.')); }
  });
  const dismissOnboarding = () => {
    setOnboardingHidden(true);
    AsyncStorage.setItem(`@messaging-onboarding:${profile?.id}:${storeId}`, 'hidden').catch(() => {});
  };
  const pageLoading = initialLoading || loading;
  const filteredContacts = contacts.filter((person) => searchText(person.fullName).includes(searchText(query)));
  const unreadThreads = threads.filter(item => Number(item.unreadCount) > 0).length;
  const inboxHeader = <>
    <View style={styles.branchRow}>
      {stores.length > 1 ? <Pressable accessibilityRole="button" accessibilityLabel="Chọn chi nhánh nhắn tin" onPress={() => setStorePicker(true)} style={ensureTouchTarget(styles.storeSelector)}>
        <Ionicons accessible={false} name="storefront-outline" size={16} color={uiColors.secondary} /><Text numberOfLines={1} style={styles.storeText}>{storeName}</Text><Ionicons accessible={false} name="chevron-down" size={15} color={uiColors.muted} />
      </Pressable> : <View style={styles.branchLabel}><Ionicons accessible={false} name="storefront-outline" size={15} color={uiColors.muted} /><Text numberOfLines={1} style={styles.storeText}>{storeName}</Text></View>}
    </View>
    {fromCache && <Text style={styles.cacheHint}>Đang hiển thị dữ liệu đã lưu</Text>}
    {!!storeId && <CompanionPeekCard
      testID="messaging-companion-card"
      kind={tab === 'messages' ? 'raccoon' : 'rabbit'}
      compact={tab === 'announcements' || onboardingHidden}
      animated={!thread && !composeVisible && !announcementVisible && !storePicker}
      title={tab === 'messages' ? 'Giữ kết nối cùng đội ngũ' : 'Tin chung của chi nhánh'}
      body={tab === 'messages' ? 'Một lời nhắn để phối hợp ca làm dễ dàng hơn.' : 'Những cập nhật từ quản lý, dành cho cả đội ngũ.'}
      style={styles.companionCard}
    >
      {tab === 'messages' && !onboardingHidden && <View style={styles.heroActions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Bắt đầu nhắn tin" disabled={!online} onPress={openComposer} style={ensureTouchTarget([styles.startButton, !online && styles.disabled])}><Text style={styles.startText}>Nhắn tin mới</Text><Ionicons name="arrow-forward" size={16} color={uiColors.white} accessible={false} /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Ẩn giới thiệu nhắn tin" onPress={dismissOnboarding} style={ensureTouchTarget(styles.dismiss)}><Text style={styles.dismissText}>Thu gọn</Text></Pressable>
      </View>}
    </CompanionPeekCard>}
    <View style={styles.listHeading}>
      <View style={styles.threadCopy}><Text style={styles.listTitle}>{tab === 'messages' ? 'Cuộc trò chuyện' : 'Bảng tin chung'}</Text><Text style={styles.listSubtitle}>{tab === 'messages' ? unreadThreads ? `${unreadThreads} cuộc trò chuyện chưa đọc` : 'Cùng nhau trao đổi mỗi ngày' : 'Cập nhật từ chi nhánh của bạn'}</Text></View>
      <View style={styles.listCount}><Text style={styles.listCountText}>{tab === 'messages' ? threads.length : announcements.length}</Text></View>
    </View>
  </>;

  return <SafeAreaView testID="messaging-screen" style={styles.safe} edges={['top', 'left', 'right']}>
    <StatusBar style="dark" />
    <View style={styles.inboxTop}><View style={styles.inboxHeading}><Text style={styles.eyebrow}>ĐỘI NGŨ CỦA BẠN</Text><Text accessibilityRole="header" style={styles.inboxTitle}>Nhắn tin</Text></View>
      {tab === 'announcements' && !canPublish ? <View style={styles.headerButton} /> : <Pressable accessibilityRole="button" accessibilityLabel={tab === 'messages' ? 'Soạn tin nhắn mới' : 'Đăng thông báo chung'}
        disabled={!storeId || !online || (tab === 'announcements' && !canPublish)} style={ensureTouchTarget([styles.newMessageButton, (!storeId || !online) && styles.disabled])}
        onPress={() => tab === 'messages' ? openComposer() : (setPublishError(''), setAnnouncementVisible(true))}>
        {(tab === 'messages' || canPublish) && <Ionicons accessible={false} name={tab === 'messages' ? 'create-outline' : 'add-outline'} size={24} color={uiColors.primaryStrong} />}
      </Pressable>}
    </View>
    <View style={styles.segments}>{[['messages', 'Tin nhắn'], ['announcements', 'Thông báo chung']].map(([key, title]) => <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: tab === key }} aria-selected={tab === key} onPress={() => setTab(key)} style={ensureTouchTarget([styles.segment, tab === key && styles.selectedSegment])}><Text style={[styles.segmentText, tab === key && styles.selectedSegmentText]}>{title}</Text></Pressable>)}</View>
    {pageLoading ? <View style={styles.loading}><ActivityIndicator size="large" color={uiColors.primaryStrong} /><Text style={styles.loadingText}>Đang tải {tab === 'messages' ? 'tin nhắn' : 'thông báo'}…</Text></View>
      : initialError ? <EmptyState title="Chưa tải được tài khoản" body={initialError} onRetry={loadIdentity} />
        : !storeId ? <EmptyState icon="storefront-outline" title="Chưa có chi nhánh" body="Bạn cần được phân công vào một chi nhánh để trao đổi cùng đội ngũ." />
          : <FlatList testID="messaging-inbox" key={tab} data={tab === 'messages' ? threads : announcements} keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: bottomPadding + 12 }} ListHeaderComponent={inboxHeader}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadInbox(); }} tintColor={uiColors.orange} />}
            ListEmptyComponent={<EmptyState icon={tab === 'messages' ? 'chatbubbles-outline' : 'megaphone-outline'}
              title={errors[tab] ? 'Chưa tải được dữ liệu' : tab === 'messages' ? 'Chưa có cuộc trò chuyện' : 'Chưa có thông báo chung'}
              body={errors[tab] || (tab === 'messages' ? 'Chọn biểu tượng soạn tin để nhắn cho đồng nghiệp hoặc quản lý cùng chi nhánh.' : 'Thông báo từ quản lý chi nhánh sẽ xuất hiện tại đây.')}
              onRetry={errors[tab] ? () => loadInbox(true) : undefined} />}
            renderItem={({ item }) => tab === 'messages' ? <Pressable testID={`messaging-thread-${item.id}`} accessibilityRole="button" accessibilityLabel={`Nhắn tin với ${item.participant?.fullName || 'đồng nghiệp'}${item.unreadCount > 0 ? `, ${item.unreadCount} tin chưa đọc` : ''}`} onPress={() => openThread(item)} style={ensureTouchTarget(({ pressed }) => [styles.threadRow, item.unreadCount > 0 && styles.threadRowUnread, pressed && styles.pressed])}>
              <PersonAvatar person={item.participant} size={48} /><View style={styles.threadCopy}><Text numberOfLines={1} style={[styles.threadName, item.unreadCount > 0 && styles.unreadName]}>{item.participant?.fullName || 'Đồng nghiệp'}</Text><Text numberOfLines={2} style={[styles.preview, item.unreadCount > 0 && styles.unreadPreview]}>{item.lastMessage || 'Chưa có tin nhắn'}</Text></View>
              <View style={styles.threadMeta}><Text style={styles.time}>{timeLabel(item.lastMessageAt)}</Text>{item.unreadCount > 0 ? <View style={styles.unreadBadge}><Text style={styles.unreadBadgeText}>{Number(item.unreadCount) > 99 ? '99+' : item.unreadCount}</Text></View> : <View style={styles.threadArrow}><Ionicons name="chevron-forward" size={15} color={uiColors.muted} accessible={false} /></View>}</View>
            </Pressable> : <View style={styles.announcementGutter}><View testID={`messaging-announcement-${item.id}`} style={styles.announcementCard}>
              <View style={styles.announcementCategory}><Text style={styles.announcementCategoryText}>THÔNG BÁO CHUNG</Text><Ionicons name="megaphone-outline" size={15} color={uiColors.primaryStrong} accessible={false} /></View>
              <View style={styles.authorRow}><PersonAvatar person={{ fullName: item.authorName, avatarId: item.authorAvatarId }} size={39} /><View style={styles.threadCopy}><Text style={styles.authorName}>{item.authorName || 'Quản lý chi nhánh'}</Text><Text style={styles.authorTime}>{timeLabel(item.createdAt, true)}</Text></View></View>
              {!!item.title && <Text style={styles.announcementTitle}>{item.title}</Text>}
              <Text style={styles.announcementBody}>{expanded.has(item.id) || (item.content || '').length <= 230 ? item.content : `${item.content.slice(0, 230).trimEnd()}…`}</Text>
              {(item.content || '').length > 230 && <Pressable accessibilityRole="button" accessibilityLabel={expanded.has(item.id) ? 'Thu gọn thông báo' : 'Xem toàn bộ thông báo'} onPress={() => setExpanded((current) => { const next = new Set(current); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; })} style={ensureTouchTarget(styles.readMore)}><Text style={styles.readMoreText}>{expanded.has(item.id) ? 'Thu gọn' : 'Xem thêm'}</Text><Ionicons name={expanded.has(item.id) ? 'chevron-up' : 'chevron-down'} size={15} color={uiColors.primaryStrong} accessible={false} /></Pressable>}
            </View></View>} />}
    <BottomNavbar navigation={navigation} activeRoute="Messaging" />

    <Modal visible={storePicker} transparent animationType="fade" onRequestClose={() => setStorePicker(false)}><View style={styles.overlay}><View style={styles.pickerCard}><Text style={styles.modalTitle}>Chọn chi nhánh</Text><ScrollView style={styles.pickerScroll}>{stores.map((store) => <Pressable accessibilityRole="button" key={store.id || store.storeId} style={ensureTouchTarget(styles.pickerRow)} onPress={() => { setStoreId(store.id || store.storeId); setStorePicker(false); }}><Text style={styles.pickerText}>{store.name || store.storeName}</Text>{String(store.id || store.storeId) === String(storeId) && <Ionicons accessible={false} name="checkmark" size={21} color={uiColors.primaryStrong} />}</Pressable>)}</ScrollView><Pressable accessibilityRole="button" style={ensureTouchTarget(styles.pickerClose)} onPress={() => setStorePicker(false)}><Text style={styles.orangeText}>Đóng</Text></Pressable></View></View></Modal>

    <Modal visible={composeVisible} animationType="slide" onRequestClose={() => setComposeVisible(false)}><SafeAreaView testID="messaging-contacts" style={styles.safe}>
      <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Đóng soạn tin nhắn" onPress={() => setComposeVisible(false)} style={ensureTouchTarget(styles.headerButton)}><BackIcon /></Pressable><Text style={styles.headerTitle}>Tin nhắn mới</Text><View style={styles.headerButton} /></View>
      <View style={styles.contactBranch}><Ionicons name="storefront-outline" size={15} color={uiColors.muted} accessible={false} /><Text style={styles.contactStore}>{storeName}</Text></View><View style={styles.search}><Ionicons name="search" size={19} color={uiColors.muted} accessible={false} /><TextInput accessibilityLabel="Tìm đồng nghiệp hoặc quản lý" placeholder="Tìm đồng nghiệp hoặc quản lý" placeholderTextColor={uiColors.muted} value={query} onChangeText={setQuery} style={styles.searchInput} autoCapitalize="none" /></View>
      <Text style={styles.contactCaption}>CHỌN NGƯỜI BẠN MUỐN NHẮN</Text>
      {!!contactsError && <Text accessibilityRole="alert" style={styles.inlineError}>{contactsError}</Text>}
      {contactsLoading ? <ActivityIndicator style={styles.contactLoading} color={uiColors.primaryStrong} /> : <FlatList data={filteredContacts} keyExtractor={(person) => String(person.id)} contentContainerStyle={styles.contactContent} ListEmptyComponent={<EmptyState title={contactsError ? 'Chưa tải được đồng nghiệp' : query ? 'Không tìm thấy đồng nghiệp' : 'Chưa có đồng nghiệp'} body="Danh sách chỉ gồm người đang làm việc tại cùng chi nhánh." onRetry={contactsError ? loadContacts : undefined} />} renderItem={({ item }) => <Pressable testID={`messaging-contact-${item.id}`} accessibilityRole="button" accessibilityLabel={`Nhắn tin với ${item.fullName || 'đồng nghiệp'}`} disabled={!online || busy['open-thread']} onPress={() => chooseRecipient(item)} style={ensureTouchTarget(({ pressed }) => [styles.contactRow, pressed && styles.pressed])}><PersonAvatar person={item} /><View style={styles.threadCopy}><Text style={styles.threadName}>{item.fullName}</Text><Text style={styles.contactRole}>{roleLabel(item.role)}</Text></View>{busy['open-thread'] ? <ActivityIndicator color={uiColors.primaryStrong} /> : <View style={styles.contactAction}><Ionicons accessible={false} name="chatbubble-ellipses-outline" size={19} color={uiColors.primaryStrong} /></View>}</Pressable>} />}
    </SafeAreaView></Modal>

    <Modal visible={!!thread} animationType="slide" onRequestClose={() => setThread(null)}><SafeAreaView testID="messaging-conversation" style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.conversationHeader}><Pressable accessibilityRole="button" accessibilityLabel="Quay lại danh sách tin nhắn" onPress={() => { setThread(null); loadInbox(); }} style={ensureTouchTarget(styles.headerButton)}><BackIcon /></Pressable><PersonAvatar person={thread?.participant} size={42} /><View style={styles.threadCopy}><Text numberOfLines={1} style={styles.conversationName}>{thread?.participant?.fullName || 'Cuộc trò chuyện'}</Text><Text numberOfLines={1} style={styles.conversationStore}>{storeName}</Text></View></View>
        {!!conversationError && <View style={styles.errorBar}><Text accessibilityRole="alert" style={styles.errorText}>{conversationError}</Text>{!accessDenied && <Pressable style={ensureTouchTarget()} accessibilityRole="button" onPress={() => loadConversation()}><Text style={styles.orangeText}>Thử lại</Text></Pressable>}</View>}
        {conversationLoading ? <View style={styles.loading}><ActivityIndicator color={uiColors.primaryStrong} /></View> : <FlatList ref={messageList} style={styles.flex} data={messages} keyExtractor={(message) => String(message.id)} contentContainerStyle={styles.messageContent}
          onScroll={({ nativeEvent }) => { autoScroll.current = nativeEvent.contentSize.height - nativeEvent.layoutMeasurement.height - nativeEvent.contentOffset.y < 80; }} scrollEventThrottle={100}
          onContentSizeChange={() => { if (autoScroll.current) messageList.current?.scrollToEnd({ animated: false }); }}
          ListHeaderComponent={hasMore ? <Pressable accessibilityRole="button" disabled={olderLoading} style={ensureTouchTarget(styles.olderButton)} onPress={() => loadConversation(true, before)}>{olderLoading ? <ActivityIndicator color={uiColors.primaryStrong} /> : <Text style={styles.orangeText}>Xem tin nhắn trước</Text>}</Pressable> : null}
          ListEmptyComponent={!conversationError ? <EmptyState title="Bắt đầu cuộc trò chuyện" body="Gửi lời nhắn đầu tiên cho đồng nghiệp của bạn." /> : null}
          renderItem={({ item }) => { const own = String(item.senderId) === String(profile?.id); return <View testID={`messaging-message-${item.id}`} style={[styles.messageRow, own && styles.ownMessageRow]}>{!own && <PersonAvatar person={{ fullName: item.senderName, avatarId: item.senderAvatarId }} size={28} />}<View style={[styles.bubble, own && styles.ownBubble]}><Text selectable style={styles.messageText}>{item.content}</Text><Text style={styles.messageTime}>{timeLabel(item.createdAt)}</Text></View></View>; }} />}
        {!online && <Text style={styles.offlineHint}>Kết nối mạng để gửi tin nhắn. Nội dung bạn nhập vẫn được giữ.</Text>}
        <View testID="messaging-composer" style={styles.composer}><TextInput accessibilityLabel="Nội dung tin nhắn" placeholder="Nhập tin nhắn…" placeholderTextColor={uiColors.muted} style={styles.messageInput} value={draft} onChangeText={setDraft} multiline maxLength={4000} editable={!busy['send-message'] && !accessDenied} />
          <Pressable accessibilityRole="button" accessibilityLabel="Gửi tin nhắn" accessibilityState={{ disabled: !online || !draft.trim() || !!busy['send-message'] || accessDenied, busy: !!busy['send-message'] }} aria-disabled={!online || !draft.trim() || !!busy['send-message'] || accessDenied} aria-busy={!!busy['send-message']} disabled={!online || !draft.trim() || busy['send-message'] || accessDenied} onPress={send} style={ensureTouchTarget([styles.sendButton, (!online || !draft.trim() || accessDenied) && styles.disabled])}>{busy['send-message'] ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Ionicons accessible={false} name="send" size={20} color="#FFFFFF" />}</Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView></Modal>

    <Modal visible={announcementVisible} animationType="slide" onRequestClose={() => { if (!busy['publish-announcement']) setAnnouncementVisible(false); }}><SafeAreaView testID="messaging-new-announcement" style={styles.safe}><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Đóng thông báo mới" disabled={busy['publish-announcement']} onPress={() => setAnnouncementVisible(false)} style={ensureTouchTarget(styles.headerButton)}><BackIcon /></Pressable><Text style={styles.headerTitle}>Thông báo mới</Text><Pressable accessibilityRole="button" accessibilityLabel="Đăng thông báo" disabled={!online || !announcementTitle.trim() || !announcementBody.trim() || busy['publish-announcement']} onPress={publish} style={ensureTouchTarget([styles.headerButton, (!online || !announcementTitle.trim() || !announcementBody.trim()) && styles.disabled])}>{busy['publish-announcement'] ? <ActivityIndicator color={uiColors.primaryStrong} /> : <Text style={styles.orangeText}>Đăng</Text>}</Pressable></View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.announcementForm}><Text style={styles.formCaption}>Gửi đến toàn bộ nhân viên tại {storeName}</Text>{!!publishError && <Text accessibilityRole="alert" style={styles.inlineError}>{publishError}</Text>}<TextInput accessibilityLabel="Tiêu đề thông báo" placeholder="Tiêu đề" placeholderTextColor={uiColors.muted} value={announcementTitle} onChangeText={setAnnouncementTitle} maxLength={160} style={styles.titleInput} editable={!busy['publish-announcement']} /><TextInput accessibilityLabel="Nội dung thông báo chung" placeholder="Bạn muốn thông báo điều gì với đội ngũ?" placeholderTextColor={uiColors.muted} value={announcementBody} onChangeText={setAnnouncementBody} multiline maxLength={10000} style={styles.bodyInput} textAlignVertical="top" editable={!busy['publish-announcement']} /></ScrollView>
    </KeyboardAvoidingView></SafeAreaView></Modal>
  </SafeAreaView>;
}

const styles = createAppStyles({
  safe: { flex: 1, backgroundColor: uiColors.canvas }, flex: { flex: 1 },
  inboxTop: { minHeight: 83, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: uiColors.surface },
  inboxHeading: { flex: 1, minWidth: 0 }, eyebrow: { color: uiColors.muted, fontSize: 9, lineHeight: 15, letterSpacing: 1, fontWeight: '600' }, inboxTitle: { color: uiColors.ink, fontSize: 25, lineHeight: 33, letterSpacing: -0.6, fontWeight: '700', marginTop: 3 },
  newMessageButton: { width: 48, height: 48, borderRadius: 16, backgroundColor: uiColors.peach, alignItems: 'center', justifyContent: 'center' },
  header: { minHeight: 62, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: uiColors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: uiColors.line },
  headerButton: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }, headerTitle: { flex: 1, minWidth: 0, textAlign: 'center', fontSize: 18, lineHeight: 25, color: uiColors.ink, fontWeight: '600' },
  segments: { flexDirection: 'row', marginHorizontal: 16, marginTop: 13, marginBottom: 2, padding: 4, backgroundColor: uiColors.surface, borderRadius: 19, borderWidth: 1, borderColor: uiColors.line },
  segment: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderRadius: 14 }, selectedSegment: { backgroundColor: uiColors.primary }, segmentText: { fontSize: 13, lineHeight: 19, color: uiColors.secondary, fontWeight: '500', textAlign: 'center' }, selectedSegmentText: { color: uiColors.white, fontWeight: '600' },
  branchRow: { paddingHorizontal: 19, paddingTop: 6, paddingBottom: 2 }, branchLabel: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 37 }, storeSelector: { flexDirection: 'row', alignItems: 'center', gap: 7 }, storeText: { flex: 1, minWidth: 0, color: uiColors.muted, fontSize: 11, lineHeight: 17 }, cacheHint: { textAlign: 'center', color: uiColors.muted, fontSize: 11, marginBottom: 8 },
  companionCard: { marginHorizontal: 16, marginTop: 3, marginBottom: 2 }, heroActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  startButton: { flex: 1, minHeight: 48, paddingHorizontal: 13, paddingVertical: 10, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: uiColors.primary, borderRadius: 24 }, startText: { color: uiColors.white, fontSize: 12, lineHeight: 18, fontWeight: '600', flexShrink: 1 }, dismiss: { paddingHorizontal: 9, minHeight: 48, alignItems: 'center', justifyContent: 'center' }, dismissText: { color: uiColors.muted, fontSize: 11, lineHeight: 18 },
  listHeading: { marginHorizontal: 21, marginTop: 21, marginBottom: 13, flexDirection: 'row', alignItems: 'center', gap: 10 }, listTitle: { color: uiColors.ink, fontSize: 17, lineHeight: 24, fontWeight: '600', letterSpacing: -0.3 }, listSubtitle: { color: uiColors.muted, fontSize: 11, lineHeight: 17, marginTop: 4 }, listCount: { minWidth: 28, height: 28, borderRadius: 14, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: uiColors.line }, listCountText: { fontSize: 11, color: uiColors.secondary, fontWeight: '600' },
  threadRow: { marginHorizontal: 16, marginBottom: 10, paddingHorizontal: 13, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', gap: 11, minHeight: 97, backgroundColor: uiColors.surface, borderWidth: 1, borderColor: uiColors.line, borderRadius: 20 }, threadRowUnread: { backgroundColor: uiColors.peach, borderColor: uiColors.primaryTrack },
  avatarFrame: { borderWidth: 2, borderColor: uiColors.white, borderRadius: 60, overflow: 'hidden' }, initials: { backgroundColor: uiColors.peach, borderWidth: 2, borderColor: uiColors.white, justifyContent: 'center', alignItems: 'center' },
  threadCopy: { flex: 1, minWidth: 0 }, threadName: { color: uiColors.ink, fontSize: 14, lineHeight: 21, fontWeight: '600' }, unreadName: { fontWeight: '700' }, preview: { color: uiColors.muted, fontSize: 12, lineHeight: 18, marginTop: 5 }, unreadPreview: { color: uiColors.secondary }, threadMeta: { alignItems: 'flex-end', minWidth: 37, alignSelf: 'stretch', justifyContent: 'space-between', paddingVertical: 3, gap: 9 }, time: { color: uiColors.muted, fontSize: 9, lineHeight: 14 }, unreadBadge: { minWidth: 25, height: 25, borderRadius: 13, paddingHorizontal: 6, backgroundColor: uiColors.primary, alignItems: 'center', justifyContent: 'center' }, unreadBadgeText: { color: uiColors.white, fontSize: 10, fontWeight: '700' }, threadArrow: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: uiColors.canvas }, pressed: { opacity: 0.7 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }, loadingText: { color: uiColors.muted, fontSize: 13, marginTop: 12 }, empty: { marginHorizontal: 16, marginBottom: 16, borderRadius: 22, backgroundColor: uiColors.surface, alignItems: 'center', paddingHorizontal: 24, paddingVertical: 31 }, emptyArt: { width: 66, height: 66, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: uiColors.peach }, emptyTitle: { marginTop: 17, color: uiColors.ink, fontSize: 17, lineHeight: 24, fontWeight: '600', textAlign: 'center' }, emptyBody: { marginTop: 9, color: uiColors.muted, fontSize: 13, lineHeight: 21, textAlign: 'center' }, retry: { padding: 14 }, orangeText: { color: uiColors.primaryStrong, fontSize: 13, fontWeight: '600' }, disabled: { opacity: 0.4 },
  announcementGutter: { marginHorizontal: 16, marginBottom: 12 }, announcementCard: { backgroundColor: uiColors.surface, padding: 17, borderRadius: 22, borderWidth: 1, borderColor: uiColors.line }, announcementCategory: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15, gap: 8 }, announcementCategoryText: { color: uiColors.primaryStrong, fontSize: 9, lineHeight: 15, letterSpacing: 0.6, fontWeight: '700' }, authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 }, authorName: { color: uiColors.ink, fontSize: 13, lineHeight: 19, fontWeight: '600' }, authorTime: { color: uiColors.muted, fontSize: 10, lineHeight: 16, marginTop: 3 }, announcementTitle: { color: uiColors.ink, fontSize: 17, lineHeight: 24, fontWeight: '600', marginBottom: 9 }, announcementBody: { color: uiColors.secondary, fontSize: 14, lineHeight: 23 }, readMore: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, marginTop: 13, borderRadius: 21, backgroundColor: uiColors.peach }, readMoreText: { color: uiColors.primaryStrong, fontSize: 12, fontWeight: '600' },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(40, 49, 59, 0.38)', padding: 20 }, pickerCard: { width: '100%', maxWidth: 420, maxHeight: '85%', backgroundColor: uiColors.surface, padding: 20, borderRadius: 24 }, modalTitle: { fontSize: 19, lineHeight: 26, fontWeight: '600', marginBottom: 12, color: uiColors.ink }, pickerScroll: { flexGrow: 0, flexShrink: 1 }, pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: uiColors.line }, pickerText: { flex: 1, color: uiColors.secondary, fontSize: 14, lineHeight: 21 }, pickerClose: { justifyContent: 'center', alignItems: 'center', backgroundColor: uiColors.peach, borderRadius: 14, marginTop: 16 },
  contactBranch: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 21, paddingTop: 18 }, contactStore: { flex: 1, minWidth: 0, color: uiColors.muted, fontSize: 12, lineHeight: 19 }, search: { flexDirection: 'row', alignItems: 'center', gap: 9, margin: 16, marginBottom: 14, paddingHorizontal: 14, backgroundColor: uiColors.surface, borderWidth: 1, borderColor: uiColors.line, borderRadius: 16 }, searchInput: { flex: 1, minWidth: 0, minHeight: 50, color: uiColors.ink, fontSize: 13, paddingVertical: 12 }, contactCaption: { marginHorizontal: 22, marginBottom: 12, fontSize: 9, lineHeight: 16, letterSpacing: 0.6, fontWeight: '600', color: uiColors.muted }, contactContent: { paddingBottom: 24 }, contactRow: { marginHorizontal: 16, marginBottom: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11, minHeight: 89, borderRadius: 20, borderWidth: 1, borderColor: uiColors.line, backgroundColor: uiColors.surface }, contactRole: { color: uiColors.muted, fontSize: 12, lineHeight: 19, marginTop: 4 }, contactAction: { width: 37, height: 37, borderRadius: 14, backgroundColor: uiColors.peach, alignItems: 'center', justifyContent: 'center' }, contactLoading: { marginTop: 40 }, inlineError: { color: uiColors.dangerText, fontSize: 13, lineHeight: 19, padding: 15 },
  conversationHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingRight: 17, minHeight: 74, backgroundColor: uiColors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: uiColors.line }, conversationName: { color: uiColors.ink, fontSize: 15, lineHeight: 22, fontWeight: '600' }, conversationStore: { color: uiColors.muted, fontSize: 11, lineHeight: 17, marginTop: 3 }, messageContent: { padding: 15, paddingTop: 22, paddingBottom: 20, flexGrow: 1 }, messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 7, marginBottom: 15, paddingRight: 27 }, ownMessageRow: { justifyContent: 'flex-end', paddingRight: 0, paddingLeft: 30 }, bubble: { maxWidth: '87%', backgroundColor: uiColors.surface, borderWidth: 1, borderColor: uiColors.line, borderRadius: 20, borderBottomLeftRadius: 6, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 }, ownBubble: { backgroundColor: uiColors.peach, borderColor: uiColors.primaryTrack, borderBottomLeftRadius: 20, borderBottomRightRadius: 6 }, messageText: { color: uiColors.ink, fontSize: 15, lineHeight: 23, flexShrink: 1 }, messageTime: { color: uiColors.secondary, fontSize: 10, lineHeight: 15, marginTop: 6, alignSelf: 'flex-end' }, olderButton: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 22, backgroundColor: uiColors.surface, marginBottom: 18 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, backgroundColor: uiColors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: uiColors.line, paddingHorizontal: 14, paddingVertical: 12 }, messageInput: { flex: 1, minWidth: 0, minHeight: 48, maxHeight: 120, backgroundColor: uiColors.canvas, borderRadius: 24, paddingHorizontal: 16, paddingTop: 13, paddingBottom: 12, color: uiColors.ink, fontSize: 15, lineHeight: 22 }, sendButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: uiColors.primary, alignItems: 'center', justifyContent: 'center' }, errorBar: { backgroundColor: uiColors.dangerSoft, paddingHorizontal: 16, paddingTop: 12, gap: 5 }, errorText: { fontSize: 13, lineHeight: 19, color: uiColors.dangerText }, offlineHint: { paddingHorizontal: 16, paddingVertical: 9, backgroundColor: uiColors.butter, color: uiColors.warningText, fontSize: 12, lineHeight: 18 },
  announcementForm: { margin: 16, padding: 18, borderRadius: 22, backgroundColor: uiColors.surface }, formCaption: { color: uiColors.muted, fontSize: 12, lineHeight: 20 }, titleInput: { minHeight: 65, fontSize: 20, lineHeight: 28, color: uiColors.ink, fontWeight: '600', marginTop: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: uiColors.line, paddingVertical: 13 }, bodyInput: { minHeight: 240, fontSize: 15, lineHeight: 24, color: uiColors.secondary, paddingTop: 20 },
});

import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useConfirmation } from '../context/ConfirmationContext';
import { getAllStores, updateStore } from '../services/storeService';
import { getStoreConfiguration, updateStoreConfiguration, getSchedulerConfig, updateSchedulerConfig } from '../services/storeConfigService';
import { getHolidays, createHoliday, updateHoliday, deleteHoliday } from '../services/holidayService';
import { Calendar, Sliders, Sparkles, Plus, Trash2, Edit2 } from 'lucide-react';
import { getContractTypes, updateContractType, createContractType, deleteContractType } from '../services/contractTypeService';
import { getNotificationPreferences, updateNotificationPreferences, sendTestNotification, scheduleDelayedTestNotification, registerFcmToken } from '../services/notificationService';
import { getBrowserNotificationPermission, requestFcmToken } from '../config/firebase';
import { toast } from '../context/toastApi.js';
import { useTheme } from '../components/navbar/themeContext.js';
import { THEME_STYLES } from '../components/navbar/themeOptions.js';
import { Palette, Sun, Moon, Layout, Eye, Check } from 'lucide-react';

const DEFAULT_NOTIFICATION_PREFERENCES = [
  'SCHEDULE_PUBLISHED', 'SHIFT_SWAP_UPDATED', 'OPEN_SHIFT_AVAILABLE', 'SHIFT_REMINDER',
  'PAYROLL_COMPLETED', 'LEAVE_REQUEST_UPDATED', 'ATTENDANCE_ADJUSTMENT_UPDATED', 'WORKFORCE_REQUEST_UPDATED',
].map((notificationType) => ({notificationType, enabled: true}));
import './SettingsPage.css';

const DEFAULT_CONFIG = {
  storeName: 'ShiftSync Flagship Store',
  address: '123 Lê Lợi, Bến Nghé, District 1, Ho Chi Minh City',
  latitude: '10.7769',
  longitude: '106.7009',
  wardDistrict: 'Bến Nghé, Quận 1',
  openTime: '08:00',
  closeTime: '22:00',
  hasMap: true,

  // 1. Chấm công
  attendanceEnabled: true,
  geofenceRadiusMeters: 100,
  geofenceRadiusM: 100,
  lateGraceMinutes: 5,
  earlyLeaveGraceMinutes: 5,
  allowedCheckInMinutes: 30,
  allowedCheckOutMinutes: 60,
  requireGpsForCheckin: true,
  allowWifiCheckin: true,
  wifiSsid: 'ShiftSync-Store-Guest Wi-Fi',

  // 2. Quy tắc lên lịch
  scheduleRulesEnabled: true,
  minRestHours: 8,
  maxHourPerWeek: 48,
  availabilityDeadlineHours: 24,
  availabilityToleranceMinutes: null,
  maxConsecutiveDays: 6,
  maxDaysPerWeek: 5,

  // 3. Cấu hình ca & Marketplace
  configEnabled: true,
  cancelAdvanceEnabled: true,
  cancelAdvanceDays: 2,
  allowMarketplace: true,
  allowSelfSwap: true,
  approvalMode: 'manager', // 'manager' | 'fifo'

  // 4. Điều phối
  dispatchEnabled: true,
  allowInterStore: true,
  skillCheckNoConflict: true,
  requireStaffConfirm: true,

  // 5. Phân quyền
  permissionEnabled: true,
  permStaff: true,
  permManager: true,
  permAdmin: true,
};

const STORAGE_KEY_PREFIX = 'shiftsync_store_config_';

const tomorrowInVietnam = () => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const get = (type) => Number(parts.find((part) => part.type === type).value);
  return new Date(Date.UTC(get('year'), get('month') - 1, get('day') + 1)).toISOString().slice(0, 10);
};

export default function SettingsPage() {
  const confirm = useConfirmation();
  const { search } = useLocation();
  const { theme, setTheme, style, setStyle, navStyle, setNavStyle } = useTheme();
  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [initialConfig, setInitialConfig] = useState(DEFAULT_CONFIG);
  const [toastMessage, setToastMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const requestedTab = new URLSearchParams(search).get('tab');
  const urlTab = ['attendance', 'schedule', 'config', 'dispatch', 'permissions', 'notifications', 'appearance', 'holidays'].includes(requestedTab) ? requestedTab : 'general';
  const [tabSelection, setTabSelection] = useState(() => ({ search, tab: urlTab }));
  const activeTab = tabSelection.search === search ? tabSelection.tab : urlTab;
  const setActiveTab = (tab) => setTabSelection({ search, tab });
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const recordSavedNow = () => {
    const now = new Date();
    setLastSavedTime(new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(now));
  };

  // Contract types state
  const [contractTypes, setContractTypes] = useState([]);
  const [contractEffectiveDate, setContractEffectiveDate] = useState(tomorrowInVietnam);
  const [initialContractTypes, setInitialContractTypes] = useState([]);
  const [showAddContractModal, setShowAddContractModal] = useState(false);
  const [newContractForm, setNewContractForm] = useState({
    name: '',
    maxWeeklyHours: 30,
    otMultiplier: 1.25,
    defaultHourlyRate: 25,
  });
  const [contractSavingId, setContractSavingId] = useState(null);
  const [notificationPreferences, setNotificationPreferences] = useState([]);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [browserNotificationPermission, setBrowserNotificationPermission] = useState(getBrowserNotificationPermission);
  const [enablingBrowserNotifications, setEnablingBrowserNotifications] = useState(false);
  const [testNotificationState, setTestNotificationState] = useState('idle');
  const [delayedTestState, setDelayedTestState] = useState('idle');
  const [testNotificationForm, setTestNotificationForm] = useState({
    title: 'Kiểm tra thông báo ShiftSync',
    body: 'Đây là nội dung thông báo bạn vừa gửi thử.',
  });
  const [updatingNotificationType, setUpdatingNotificationType] = useState(null);

  // AI Auto-Scheduler 5-weights state (Checkpoint 2)
  const [schedulerWeights, setSchedulerWeights] = useState({
    fairnessWeight: 0.20,
    skillWeight: 0.25,
    hourWeight: 0.20,
    restTimeWeight: 0.15,
    availabilityWeight: 0.20,
  });
  const [, setLoadingWeights] = useState(false);
  const [savingWeights, setSavingWeights] = useState(false);

  // Holidays state (Checkpoint 3)
  const [holidays, setHolidays] = useState([]);
  const [loadingHolidays, setLoadingHolidays] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [holidayForm, setHolidayForm] = useState({ name: '', holidayDate: '', rateMultiplier: 3.0 });
  const [savingHoliday, setSavingHoliday] = useState(false);

  // AI Scheduler Weights Loader & Handlers
  const loadSchedulerWeights = async (storeId) => {
    if (!storeId || String(storeId).startsWith('store-')) return;
    setLoadingWeights(true);
    try {
      const res = await getSchedulerConfig(storeId);
      if (res?.data) {
        setSchedulerWeights({
          fairnessWeight: Number(res.data.fairnessWeight ?? 0.20),
          skillWeight: Number(res.data.skillWeight ?? 0.25),
          hourWeight: Number(res.data.hourWeight ?? 0.20),
          restTimeWeight: Number(res.data.restTimeWeight ?? 0.15),
          availabilityWeight: Number(res.data.availabilityWeight ?? 0.20),
        });
      }
    } catch (err) {
      console.warn('Could not load scheduler weights:', err);
    } finally {
      setLoadingWeights(false);
    }
  };

  const handleWeightChange = (key, val) => {
    setSchedulerWeights(prev => ({
      ...prev,
      [key]: Math.round(Number(val) * 100) / 100,
    }));
  };

  const totalWeights = Math.round(
    ((schedulerWeights.fairnessWeight || 0) +
     (schedulerWeights.skillWeight || 0) +
     (schedulerWeights.hourWeight || 0) +
     (schedulerWeights.restTimeWeight || 0) +
     (schedulerWeights.availabilityWeight || 0)) * 100
  );

  const applyWeightPreset = (fairness, skill, hour, rest, avail) => {
    setSchedulerWeights({
      fairnessWeight: fairness,
      skillWeight: skill,
      hourWeight: hour,
      restTimeWeight: rest,
      availabilityWeight: avail,
    });
  };

  const handleSaveSchedulerWeights = async () => {
    if (totalWeights !== 100) {
      showToast(`Tổng 5 trọng số phải bằng đúng 100% (Hiện tại: ${totalWeights}%). Vui lòng cân đối lại trước khi lưu.`, 'error');
      return;
    }
    if (!selectedStoreId || String(selectedStoreId).startsWith('store-')) {
      showToast('Vui lòng chọn chi nhánh hợp lệ để cấu hình trọng số AI.', 'error');
      return;
    }
    setSavingWeights(true);
    try {
      await updateSchedulerConfig(selectedStoreId, {
        fairnessWeight: schedulerWeights.fairnessWeight,
        skillWeight: schedulerWeights.skillWeight,
        hourWeight: schedulerWeights.hourWeight,
        restTimeWeight: schedulerWeights.restTimeWeight,
        availabilityWeight: schedulerWeights.availabilityWeight,
      });
      recordSavedNow();
      showToast('Đã cập nhật trọng số thuật toán xếp ca AI thành công!');
    } catch (err) {
      showToast('Lỗi khi lưu trọng số AI: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setSavingWeights(false);
    }
  };

  // Holidays Loader & Handlers
  const loadHolidays = async () => {
    setLoadingHolidays(true);
    try {
      const res = await getHolidays();
      setHolidays(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.warn('Failed to load holidays:', err);
    } finally {
      setLoadingHolidays(false);
    }
  };

  const openAddHoliday = () => {
    setEditingHoliday(null);
    setHolidayForm({ name: '', holidayDate: '', rateMultiplier: 3.0 });
    setShowHolidayModal(true);
  };

  const openEditHoliday = (h) => {
    setEditingHoliday(h);
    setHolidayForm({
      name: h.name || '',
      holidayDate: h.holidayDate || '',
      rateMultiplier: Number(h.rateMultiplier ?? 3.0),
    });
    setShowHolidayModal(true);
  };

  const handleSaveHolidaySubmit = async (e) => {
    e.preventDefault();
    if (!holidayForm.name?.trim() || !holidayForm.holidayDate) {
      showToast('Vui lòng điền đầy đủ tên ngày lễ và ngày áp dụng.', 'error');
      return;
    }
    const mult = Number(holidayForm.rateMultiplier);
    if (!Number.isFinite(mult) || mult < 1.0) {
      showToast('Hệ số lương ngày lễ tối thiểu là 1.0 (100%).', 'error');
      return;
    }

    setSavingHoliday(true);
    try {
      const payload = {
        name: holidayForm.name.trim(),
        holidayDate: holidayForm.holidayDate,
        rateMultiplier: mult,
      };
      if (editingHoliday?.id) {
        await updateHoliday(editingHoliday.id, payload);
        showToast('Đã cập nhật thông tin ngày lễ thành công!');
      } else {
        await createHoliday(payload);
        showToast('Đã thêm ngày lễ mới vào hệ thống!');
      }
      setShowHolidayModal(false);
      await loadHolidays();
      recordSavedNow();
    } catch (err) {
      showToast('Lỗi khi lưu ngày lễ: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setSavingHoliday(false);
    }
  };

  const handleDeleteHolidayClick = async (h) => {
    if (!(await confirm({ message: `Xóa ngày lễ "${h.name}" (${h.holidayDate})? Hệ thống sẽ ngừng tính phụ cấp lễ cho ngày này.`, confirmLabel: 'Xóa' }))) {
      return;
    }
    try {
      await deleteHoliday(h.id);
      showToast(`Đã xóa ngày lễ "${h.name}".`);
      await loadHolidays();
      recordSavedNow();
    } catch (err) {
      showToast('Lỗi khi xóa ngày lễ: ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  // Refs for smooth scrolling to sections
  const sectionGeneralRef = useRef(null);
  const sectionAttendanceRef = useRef(null);
  const sectionScheduleRef = useRef(null);
  const sectionConfigRef = useRef(null);
  const sectionDispatchRef = useRef(null);
  const sectionPermRef = useRef(null);

  // Load stores from Backend API
  useEffect(() => {
    async function loadStores() {
      try {
        const res = await getAllStores();
        const list = Array.isArray(res.data) ? res.data : (res.data?.content || []);
        if (list.length > 0) {
          setStores(list);
          const savedStoreId = localStorage.getItem('selectedStoreId');
          const targetStore = (savedStoreId && list.find(s => String(s.id) === String(savedStoreId))) || list[0];
          setSelectedStoreId(String(targetStore.id));
          localStorage.setItem('selectedStoreId', String(targetStore.id));
          loadConfigForStore(targetStore.id, targetStore);
          return;
        }
      } catch (e) {
        console.info('Backend stores API offline or empty, using default store list:', e.message);
      }

      const defaultStores = [
        { id: 'store-1', name: 'ShiftSync Flagship Store', address: '123 Lê Lợi, Bến Nghé, District 1, Ho Chi Minh City', latitude: 10.7769, longitude: 106.7009 },
        { id: 'store-2', name: 'The Chill Buffet (Chi Nhánh 2)', address: 'Hồ Bơi Tây Thạnh, Quận Tân Phú, TP. Hồ Chí Minh', latitude: 10.8124, longitude: 106.6281 },
      ];
      setStores(defaultStores);
      const savedStoreId = localStorage.getItem('selectedStoreId');
      const targetStore = (savedStoreId && defaultStores.find(s => String(s.id) === String(savedStoreId))) || defaultStores[0];
      setSelectedStoreId(String(targetStore.id));
      localStorage.setItem('selectedStoreId', String(targetStore.id));
      loadConfigForStore(targetStore.id, targetStore);
    }

    loadStores();
  // `loadConfigForStore` is a declaration scoped to this component; this bootstrap runs once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for global store change
  useEffect(() => {
    const handleStoreChangeEvt = (e) => {
      const newId = e.detail?.storeId;
      if (newId && String(newId) !== String(selectedStoreId)) {
        setSelectedStoreId(newId);
        const storeObj = stores.find((s) => String(s.id) === String(newId));
        loadConfigForStore(newId, storeObj);
      }
    };
    window.addEventListener('storeChanged', handleStoreChangeEvt);
    return () => window.removeEventListener('storeChanged', handleStoreChangeEvt);
  // `loadConfigForStore` reads the latest selected store at event time.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStoreId, stores]);

  // Load configuration for a specific store from Backend API and localStorage
  async function loadConfigForStore(storeId, storeObj) {
    let baseConfig = { ...DEFAULT_CONFIG };
    if (storeObj) {
      baseConfig.storeName = storeObj.name || DEFAULT_CONFIG.storeName;
      baseConfig.address = storeObj.address || DEFAULT_CONFIG.address;
      baseConfig.latitude = String(storeObj.latitude || DEFAULT_CONFIG.latitude);
      baseConfig.longitude = String(storeObj.longitude || DEFAULT_CONFIG.longitude);
      baseConfig.wardDistrict = storeObj.address?.includes('Quận') ? storeObj.address.split(',').slice(-2).join(',').trim() : 'Bến Nghé, Quận 1';
    }

    if (storeId && !String(storeId).startsWith('store-')) {
      try {
        const configRes = await getStoreConfiguration(storeId);
        loadSchedulerWeights(storeId);
        if (configRes.data) {
          const apiConfig = configRes.data;
          baseConfig = {
            ...baseConfig,
            ...apiConfig,
            openTime: apiConfig.openTime ? String(apiConfig.openTime).slice(0, 5) : (baseConfig.openTime || '08:00'),
            closeTime: apiConfig.closeTime ? String(apiConfig.closeTime).slice(0, 5) : (baseConfig.closeTime || '22:00'),
            geofenceRadiusMeters: apiConfig.geofenceRadiusM ?? baseConfig.geofenceRadiusMeters,
            geofenceRadiusM: apiConfig.geofenceRadiusM ?? baseConfig.geofenceRadiusM,
            minRestHours: apiConfig.minRestHours ?? baseConfig.minRestHours,
            maxHourPerWeek: apiConfig.maxHourPerWeek ?? baseConfig.maxHourPerWeek,
            availabilityDeadlineHours: apiConfig.availabilityDeadlineHours ?? baseConfig.availabilityDeadlineHours,
            availabilityToleranceMinutes: apiConfig.availabilityToleranceMinutes ?? null,
            allowedCheckInMinutes: apiConfig.allowedCheckInMinutes ?? baseConfig.allowedCheckInMinutes,
            allowedCheckOutMinutes: apiConfig.allowedCheckOutMinutes ?? baseConfig.allowedCheckOutMinutes,
            lateGraceMinutes: apiConfig.lateGraceMinutes ?? baseConfig.lateGraceMinutes,
            earlyLeaveGraceMinutes: apiConfig.earlyLeaveGraceMinutes ?? baseConfig.earlyLeaveGraceMinutes,
          };
        }
      } catch (err) {
        console.warn('Could not fetch store config from backend:', err.message);
      }
    }

    const cachedConfig = localStorage.getItem(`${STORAGE_KEY_PREFIX}${storeId}`);
    if (cachedConfig) {
      try {
        const parsed = JSON.parse(cachedConfig);
        // The coverage rule must reflect the persisted policy, never an old UI cache.
        delete parsed.availabilityToleranceMinutes;
        delete parsed.minRestHours;
        delete parsed.minHoursSameDay;
        delete parsed.minHoursDiffDay;
        baseConfig = { ...baseConfig, ...parsed };
      } catch {
        // ignore parse error
      }
    }

    if (storeId && !String(storeId).startsWith('store-')) {
      try {
        const ctRes = await getContractTypes(storeId);
        const ctList = Array.isArray(ctRes.data) ? ctRes.data : [];
        setContractTypes(ctList);
        setInitialContractTypes(JSON.parse(JSON.stringify(ctList)));
      } catch (ctErr) {
        console.warn('Could not fetch contract types:', ctErr.message);
        setContractTypes([]);
        setInitialContractTypes([]);
      }
    } else {
      setContractTypes([]);
      setInitialContractTypes([]);
    }

    setConfig(baseConfig);
    setInitialConfig(baseConfig);
  }

  const handleStoreChange = (newStoreId) => {
    setSelectedStoreId(newStoreId);
    localStorage.setItem('selectedStoreId', String(newStoreId));
    window.dispatchEvent(new CustomEvent('storeChanged', { detail: { storeId: String(newStoreId) } }));
    const storeObj = stores.find((s) => String(s.id) === String(newStoreId));
    loadConfigForStore(newStoreId, storeObj);
  };

  useEffect(() => {
    if (activeTab !== 'notifications') return;
    let current = true;
    Promise.resolve().then(() => {
      if (current) setNotificationLoading(true);
      return getNotificationPreferences();
    }).then(({ data }) => {
      if (current) {
        setNotificationPreferences(Array.isArray(data) && data.length ? data : DEFAULT_NOTIFICATION_PREFERENCES);
      }
    }).catch((error) => {
      if (current) showToast(`Không thể tải cài đặt thông báo: ${error.response?.data?.message || error.message}`);
    }).finally(() => { if (current) setNotificationLoading(false); });
    return () => { current = false; };
  }, [activeTab]);

  const handleNotificationPreference = async (preference) => {
    const optimistic = { ...preference, enabled: !preference.enabled };
    setUpdatingNotificationType(preference.notificationType);
    setNotificationPreferences((previous) => previous.map((item) => item.notificationType === preference.notificationType ? optimistic : item));
    try {
      const { data } = await updateNotificationPreferences({ notificationType: preference.notificationType, enabled: optimistic.enabled });
      setNotificationPreferences((previous) => previous.map((item) => item.notificationType === preference.notificationType ? data : item));
    } catch (error) {
      setNotificationPreferences((previous) => previous.map((item) => item.notificationType === preference.notificationType ? preference : item));
      showToast(`Không thể cập nhật thông báo: ${error.response?.data?.message || error.message}`);
    } finally {
      setUpdatingNotificationType(null);
    }
  };

  const handleTestNotification = async () => {
    setTestNotificationState('sending');
    try {
      const { data } = await sendTestNotification(testNotificationForm);
      window.dispatchEvent(new CustomEvent('notification_received', { detail: data.notification }));
      setTestNotificationState('sent');
      showToast('Đã gửi thông báo thử. Mở biểu tượng chuông để xem.');
    }
    catch (error) {
      setTestNotificationState('failed');
      showToast(`Không thể gửi thông báo thử: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleDelayedTestNotification = async () => {
    setDelayedTestState('scheduling');
    try {
      await scheduleDelayedTestNotification(testNotificationForm);
      setDelayedTestState('scheduled');
      showToast('Đã hẹn gửi sau 10 giây. Hãy đóng tab ShiftSync ngay để kiểm tra.');
    } catch (error) {
      setDelayedTestState('failed');
      showToast(`Không thể hẹn gửi thông báo: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleEnableBrowserNotifications = async () => {
    setEnablingBrowserNotifications(true);
    try {
      const token = await requestFcmToken();
      const permission = getBrowserNotificationPermission();
      setBrowserNotificationPermission(permission);
      if (!token) {
        showToast(permission === 'denied'
          ? 'Trình duyệt đang chặn thông báo Windows. Hãy cho phép lại trong cài đặt trang web.'
          : 'Chưa thể bật thông báo Windows. Hãy cho phép quyền thông báo rồi thử lại.');
        return;
      }
      await registerFcmToken(token);
      sessionStorage.setItem('fcmToken', token);
      showToast('Đã bật thông báo Windows cho trình duyệt này.');
    } catch (error) {
      showToast(`Không thể bật thông báo Windows: ${error.response?.data?.message || error.message}`);
    } finally {
      setEnablingBrowserNotifications(false);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Calculate dirty count
  const dirtyKeys = Object.keys(config).filter((k) => config[k] !== initialConfig[k]);
  const dirtyContracts = contractTypes.filter((ct) => {
    const orig = initialContractTypes.find((i) => String(i.id) === String(ct.id));
    return orig && Number(orig.maxWeeklyHours) !== Number(ct.maxWeeklyHours);
  });
  const dirtyCount = dirtyKeys.length + dirtyContracts.length;
  const isDirty = dirtyCount > 0;

  const handleUpdateContractHours = (id, newHours) => {
    const val = Math.max(1, Number(newHours) || 1);
    setContractTypes((prev) =>
      prev.map((c) => (String(c.id) === String(id) ? { ...c, maxWeeklyHours: val } : c))
    );
  };

  const handleSaveContractTypeInline = async (ct) => {
    if (!selectedStoreId || String(selectedStoreId).startsWith('store-')) return;
    setContractSavingId(ct.id);
    try {
      const response = await updateContractType(selectedStoreId, ct.id, {
        name: ct.name,
        maxWeeklyHours: Number(ct.maxWeeklyHours),
        otMultiplier: Number(ct.otMultiplier || 1.25),
        defaultHourlyRate: Number(ct.defaultHourlyRate || 25),
        effectiveDate: contractEffectiveDate,
      });
      setContractTypes((prev) => prev.map((item) => String(item.id) === String(ct.id) ? response.data : item));
      setInitialContractTypes((prev) =>
        prev.map((item) =>
          String(item.id) === String(ct.id) ? response.data : item
        )
      );
      recordSavedNow();
      showToast(`Đã lên lịch trần giờ cho ${ct.name} từ ngày ${response.data.scheduledEffectiveDate}.`);
    } catch (err) {
      showToast(`Lỗi khi lưu loại hợp đồng: ${err.response?.data?.message || err.message}`);
    } finally {
      setContractSavingId(null);
    }
  };

  const handleCreateContractType = async (e) => {
    e.preventDefault();
    if (!newContractForm.name.trim()) {
      toast.warning('Vui lòng nhập tên loại hợp đồng!');
      return;
    }
    try {
      const res = await createContractType(selectedStoreId, {
        name: newContractForm.name.trim(),
        maxWeeklyHours: Number(newContractForm.maxWeeklyHours),
        otMultiplier: Number(newContractForm.otMultiplier),
        defaultHourlyRate: Number(newContractForm.defaultHourlyRate),
      });
      const created = res.data;
      setContractTypes((prev) => [...prev, created]);
      setInitialContractTypes((prev) => [...prev, { ...created }]);
      recordSavedNow();
      setShowAddContractModal(false);
      setNewContractForm({ name: '', maxWeeklyHours: 30, otMultiplier: 1.25, defaultHourlyRate: 25 });
      toast.success(`Đã thêm loại hợp đồng "${created.name}" thành công!`);
    } catch (err) {
      toast.error(`Lỗi khi thêm: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleDeleteContractType = async (ct) => {
    if (!selectedStoreId || !(await confirm({ message: `Xóa loại hợp đồng “${ct.name}”? Thao tác này không thể hoàn tác.`, confirmLabel: 'Xóa' }))) return;
    setContractSavingId(ct.id);
    try {
      await deleteContractType(selectedStoreId, ct.id);
      setContractTypes((previous) => previous.filter((item) => String(item.id) !== String(ct.id)));
      setInitialContractTypes((previous) => previous.filter((item) => String(item.id) !== String(ct.id)));
      recordSavedNow();
      showToast(`Đã xóa loại hợp đồng ${ct.name}.`);
    } catch (err) {
      showToast(`Không thể xóa loại hợp đồng: ${err.response?.data?.message || err.message}`);
    } finally {
      setContractSavingId(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let storeOpen = config.openTime;
      let storeClose = config.closeTime;
      const currentStore = stores.find(s => String(s.id) === String(selectedStoreId));
      if (selectedStoreId && !selectedStoreId.startsWith('store-')) {
        const parseCoord = (val, fallback) => {
          const num = parseFloat(val);
          return isNaN(num) ? fallback : num;
        };

        const formatTime = (t, fallback) => {
          if (!t) return fallback;
          const s = String(t).trim();
          if (s.length === 5) return s + ':00';
          if (s.length === 8) return s;
          return fallback;
        };

        storeOpen = formatTime(config.openTime || currentStore?.openTime, '08:00:00');
        storeClose = formatTime(config.closeTime || currentStore?.closeTime, '22:00:00');

        try {
          await updateStore(selectedStoreId, {
            name: config.storeName || currentStore?.name || 'Chi nhánh',
            address: config.address || currentStore?.address || '',
            latitude: parseCoord(config.latitude, currentStore?.latitude || 10.7769),
            longitude: parseCoord(config.longitude, currentStore?.longitude || 106.7009),
            openTime: storeOpen,
            closeTime: storeClose,
          });

          await updateStoreConfiguration(selectedStoreId, {
            openTime: storeOpen,
            closeTime: storeClose,
            maxHourPerWeek: Number(config.maxHourPerWeek || 48),
            minRestHours: Number(config.minRestHours ?? 8),
            geofenceRadiusM: Number(config.geofenceRadiusM || config.geofenceRadiusMeters || 100),
            availabilityDeadlineHours: Number(config.availabilityDeadlineHours || 24),
            availabilityToleranceMinutes: config.availabilityToleranceMinutes,
            allowedCheckInMinutes: Number(config.allowedCheckInMinutes || 30),
            allowedCheckOutMinutes: Number(config.allowedCheckOutMinutes || 60),
            lateGraceMinutes: Number(config.lateGraceMinutes || 5),
            earlyLeaveGraceMinutes: Number(config.earlyLeaveGraceMinutes || 5),
          });
        } catch (apiErr) {
          throw new Error(apiErr.response?.data?.message || apiErr.message, { cause: apiErr });
        }
      }

      setStores(prev => prev.map(s => {
        if (String(s.id) === String(selectedStoreId)) {
          return {
            ...s,
            name: config.storeName,
            address: config.address,
            latitude: parseFloat(config.latitude) || s.latitude,
            longitude: parseFloat(config.longitude) || s.longitude,
            openTime: storeOpen,
            closeTime: storeClose,
          };
        }
        return s;
      }));

      // Save any modified contract types
      if (dirtyContracts.length > 0 && selectedStoreId && !String(selectedStoreId).startsWith('store-')) {
        for (const ct of dirtyContracts) {
          try {
            const response = await updateContractType(selectedStoreId, ct.id, {
              name: ct.name,
              maxWeeklyHours: Number(ct.maxWeeklyHours),
              otMultiplier: Number(ct.otMultiplier || 1.25),
              defaultHourlyRate: Number(ct.defaultHourlyRate || 25),
              effectiveDate: contractEffectiveDate,
            });
            setContractTypes((prev) => prev.map((item) => String(item.id) === String(ct.id) ? response.data : item));
            setInitialContractTypes((prev) => prev.map((item) => String(item.id) === String(ct.id) ? response.data : item));
          } catch (ctErr) {
            throw new Error(`Lỗi lưu hợp đồng ${ct.name}: ${ctErr.response?.data?.message || ctErr.message}`, { cause: ctErr });
          }
        }
      }

      localStorage.setItem(`${STORAGE_KEY_PREFIX}${selectedStoreId}`, JSON.stringify(config));
      setInitialConfig({ ...config });
      recordSavedNow();
      showToast('Đã lưu cấu hình cửa hàng thành công! ');
    } catch (err) {
      showToast('Lỗi khi lưu cấu hình: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (await confirm({ title: 'Khôi phục cấu hình', message: 'Bạn có chắc muốn khôi phục cấu hình mặc định cho cửa hàng này?', confirmLabel: 'Khôi phục', tone: 'primary' })) {
      const currentStore = stores.find(s => String(s.id) === String(selectedStoreId));
      const resetConf = {
        ...DEFAULT_CONFIG,
        storeName: currentStore?.name || DEFAULT_CONFIG.storeName,
        address: currentStore?.address || DEFAULT_CONFIG.address,
        latitude: String(currentStore?.latitude || DEFAULT_CONFIG.latitude),
        longitude: String(currentStore?.longitude || DEFAULT_CONFIG.longitude),
      };
      setConfig(resetConf);
      setContractTypes(JSON.parse(JSON.stringify(initialContractTypes)));
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${selectedStoreId}`);
      showToast('Đã khôi phục cài đặt mặc định.');
    }
  };

  const handleTabClick = (tabKey) => {
    setActiveTab(tabKey);
    if (tabKey === 'holidays') {
      loadHolidays();
    }
  };

  // Dynamic map query URL based on the real address typed by the user
  const mapSearchQuery = config.address?.trim() || config.storeName?.trim() || 'Hồ Bơi Tây Thạnh, Quận Tân Phú, TP. Hồ Chí Minh';
  const dynamicMapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapSearchQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className="sc-page-root">
      {toastMessage && <div className="sc-toast-bubble">{toastMessage}</div>}

      <div className="sc-max-layout">
        {/* ── 1. Top Breadcrumb & Header Bar ── */}
        <div className="sc-top-card">
          <div className="sc-top-meta-row">
            <nav className="sc-breadcrumbs">
              <span className="sc-bc-item">Hệ thống</span>
              <span className="sc-bc-sep">/</span>
              <span className="sc-bc-item">Cài đặt chuỗi</span>
              <span className="sc-bc-sep">/</span>
              <span className="sc-bc-item active">Cửa hàng</span>
            </nav>

            <div className="sc-store-quick-select">
              <span className="sc-sq-label">Chi nhánh:</span>
              <select
                value={selectedStoreId}
                onChange={(e) => handleStoreChange(e.target.value)}
                className="sc-sq-dropdown"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="sc-header-row">
            <div className="sc-header-left">
              <div className="sc-header-titles">
                <div className="sc-title-cluster">
                  <h1 className="sc-page-title">Cấu hình Cửa hàng</h1>
                </div>
                <p className="sc-page-desc">
                  Quản lý định vị, ca kíp, quy tắc làm việc và phân quyền nhân viên cho điểm bán
                </p>
              </div>
            </div>

            <div className="sc-header-right">
              <div className="sc-sync-status-box">
                <span className="sc-sync-check">✓</span>
                <div className="sc-sync-texts">
                  <span className="sc-sync-main">Hệ thống đồng bộ</span>
                  <span className="sc-sync-sub">Cấu hình cửa hàng đang được kiểm soát trực tiếp</span>
                </div>
              </div>

              <button
                type="button"
                className="sc-close-btn"
                onClick={() => window.history.back()}
                title="Đóng trang cấu hình"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* ── 2. Navigation Tab Strip ── */}
        <div className="sc-tabs-strip">
          <button
            type="button"
            className={`sc-tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => handleTabClick('notifications')}
          >
            <span>Thông báo</span>
          </button>

          <button
            type="button"
            className={`sc-tab-btn ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => handleTabClick('general')}
          >
            <span>Thông tin chung</span>
          </button>

          <button
            type="button"
            className={`sc-tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
            onClick={() => handleTabClick('attendance')}
          >
            <span>Chấm công</span>
          </button>

          <button
            type="button"
            className={`sc-tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
            onClick={() => handleTabClick('schedule')}
          >
            <span>Quy tắc lên lịch</span>
          </button>

          <button
            type="button"
            className={`sc-tab-btn ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => handleTabClick('config')}
          >
            <span>Cấu hình ca</span>
          </button>

          <button
            type="button"
            className={`sc-tab-btn ${activeTab === 'dispatch' ? 'active' : ''}`}
            onClick={() => handleTabClick('dispatch')}
          >
            <span>Điều phối</span>
          </button>

          <button
            type="button"
            className={`sc-tab-btn ${activeTab === 'permissions' ? 'active' : ''}`}
            onClick={() => handleTabClick('permissions')}
          >
            <span>Phân quyền</span>
          </button>

          <button
            type="button"
            className={`sc-tab-btn ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => handleTabClick('appearance')}
          >
            <Palette size={14} style={{ marginRight: 4 }} />
            <span>Giao diện & Chủ đề</span>
          </button>

          <button
            type="button"
            className={`sc-tab-btn ${activeTab === 'holidays' ? 'active' : ''}`}
            onClick={() => handleTabClick('holidays')}
          >
            <Calendar size={14} style={{ marginRight: 4 }} />
            <span>Ngày Lễ & Hệ số Lương</span>
          </button>
        </div>

        {/* ── 3. CARD 1: THÔNG TIN CƠ BẢN & VỊ TRÍ ── */}
        {activeTab === 'general' && (
          <section ref={sectionGeneralRef} className="sc-section-card sc-tab-pane">
          <div className="sc-card-header">
            <div className="sc-ch-left">
              <div>
                <h2 className="sc-ch-title">Thông tin cơ bản & Vị trí</h2>
                <p className="sc-ch-desc">
                  Tên nhận diện chi nhánh và địa chỉ thực tế hiển thị trên bản đồ vị trí
                </p>
              </div>
            </div>

            <span className="sc-badge-active">Đang hoạt động</span>
          </div>

          <div className="sc-card-body">
            {/* Field: Store Name */}
            <div className="sc-form-group">
              <label className="sc-field-label">Tên cửa hàng</label>
              <input
                type="text"
                className="sc-input-text"
                value={config.storeName}
                onChange={(e) => setConfig({ ...config, storeName: e.target.value })}
                placeholder="Nhập tên chi nhánh / cửa hàng..."
              />
            </div>

            {/* Field: Store Address */}
            <div className="sc-form-group">
              <label className="sc-field-label">Vị trí</label>
              <input
                type="text"
                className="sc-input-text"
                value={config.address}
                onChange={(e) => setConfig({ ...config, address: e.target.value })}
                placeholder="Nhập địa chỉ thực tế (VD: 123 Lê Lợi, Bến Nghé, Quận 1, TP. Hồ Chí Minh)..."
              />
            </div>

            {/* Dynamic Google Maps - as it was originally */}
            {config.address && (
              <div className="sc-map-frame-wrap">
                <iframe
                  title="Bản đồ vị trí cửa hàng"
                  src={dynamicMapEmbedUrl}
                  width="100%"
                  height="280"
                  style={{ border: 0, display: 'block' }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            )}
          </div>
        </section>
        )}

        {/* ── 4. CARD 2: CHẤM CÔNG ── */}
        {activeTab === 'attendance' && (
        <section ref={sectionAttendanceRef} className="sc-section-card sc-tab-pane">
          <div className="sc-card-header">
            <div className="sc-ch-left">
              <div>
                <div className="sc-title-badge-row">
                  <h2 className="sc-ch-title">Chấm công</h2>
                  <span className="sc-tag-pill green">Bắt buộc GPS</span>
                </div>
                <p className="sc-ch-desc">
                  Yêu cầu nhân viên chấm công tại địa điểm làm ca. Cài đặt vị trí bên dưới nếu bạn muốn địa điểm công việc này là vị trí ca làm việc bắt buộc.
                </p>
              </div>
            </div>

            <button
              type="button"
              className={`sc-toggle-switch ${config.attendanceEnabled ? 'active' : ''}`}
              onClick={() => setConfig({ ...config, attendanceEnabled: !config.attendanceEnabled })}
              title="Bật/Tắt chế độ chấm công"
            >
              <div className="sc-toggle-circle" />
            </button>
          </div>

          <div className={`sc-card-body ${!config.attendanceEnabled ? 'is-disabled' : ''}`}>
            <div className="sc-two-col-grid">
              {/* Left Column: Geofence Radius Slider */}
              <div className="sc-col-box">
                <div className="sc-cb-title-row">
                  <span className="sc-cb-title">Khoảng cách xác thực (Geofence Radius)</span>
                  <span className="sc-cb-val-pill">{config.geofenceRadiusMeters} mét</span>
                </div>
                <p className="sc-cb-desc">
                  Bán kính cho phép nhân viên Check-in/Check-out qua điện thoại di động.
                </p>

                <div className="sc-slider-wrap">
                  <input
                    type="range"
                    min="20"
                    max="500"
                    step="10"
                    value={config.geofenceRadiusMeters}
                    onChange={(e) => setConfig({ ...config, geofenceRadiusMeters: Number(e.target.value) })}
                    className="sc-range-slider"
                  />
                  <div className="sc-slider-scale-labels">
                    <span>20m</span>
                    <span>500m</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Verification Methods */}
              <div className="sc-col-box">
                <div className="sc-cb-title-row">
                  <span className="sc-cb-title">Phương thức hợp lệ tại cửa hàng</span>
                </div>
                <p className="sc-cb-desc">
                  Kết hợp kiểm tra vị trí trên GPS và nhận diện mạng Wi-Fi nội bộ.
                </p>

                <div className="sc-methods-pills-row">
                  <button
                    type="button"
                    className={`sc-method-pill ${config.requireGpsForCheckin ? 'selected' : ''}`}
                    onClick={() => setConfig({ ...config, requireGpsForCheckin: !config.requireGpsForCheckin })}
                  >
                    <span className="sc-mp-check">{config.requireGpsForCheckin ? '✓' : '○'}</span>
                    <span>GPS Định vị chuẩn</span>
                  </button>

                  <button
                    type="button"
                    className={`sc-method-pill ${config.allowWifiCheckin ? 'selected' : ''}`}
                    onClick={() => setConfig({ ...config, allowWifiCheckin: !config.allowWifiCheckin })}
                  >
                    <span className="sc-mp-check">{config.allowWifiCheckin ? '✓' : '○'}</span>
                    <span>{config.wifiSsid}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Row 2: Dung sai & Thời gian hợp lệ */}
            <div className="sc-rules-2x2-grid" style={{ marginTop: '16px' }}>
              <div className="sc-rule-card">
                <div className="sc-rc-content">
                  <div className="sc-rc-title-row">
                    <span className="sc-rc-title">Dung sai đi trễ / về sớm</span>
                  </div>
                  <span className="sc-rc-desc">Khoảng thời gian trễ tối đa không bị phạt</span>
                </div>
                <div className="sc-stepper-box">
                  <button
                    type="button"
                    className="sc-step-btn"
                    onClick={() => setConfig({ ...config, lateGraceMinutes: Math.max(0, (config.lateGraceMinutes || 5) - 1) })}
                  >
                    −
                  </button>
                  <span className="sc-step-val">{config.lateGraceMinutes ?? 5}</span>
                  <span className="sc-step-unit">phút</span>
                  <button
                    type="button"
                    className="sc-step-btn"
                    onClick={() => setConfig({ ...config, lateGraceMinutes: (config.lateGraceMinutes || 5) + 1 })}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="sc-rule-card">
                <div className="sc-rc-content">
                  <div className="sc-rc-title-row">
                    <span className="sc-rc-title">Cho phép điểm danh sớm trước ca</span>
                  </div>
                  <span className="sc-rc-desc">Khoảng thời gian mở check-in trước giờ bắt đầu ca</span>
                </div>
                <div className="sc-stepper-box">
                  <button
                    type="button"
                    className="sc-step-btn"
                    onClick={() => setConfig({ ...config, allowedCheckInMinutes: Math.max(5, (config.allowedCheckInMinutes || 30) - 5) })}
                  >
                    −
                  </button>
                  <span className="sc-step-val">{config.allowedCheckInMinutes ?? 30}</span>
                  <span className="sc-step-unit">phút</span>
                  <button
                    type="button"
                    className="sc-step-btn"
                    onClick={() => setConfig({ ...config, allowedCheckInMinutes: (config.allowedCheckInMinutes || 30) + 5 })}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
        )}

        {/* ── 5. CARD 3: QUY TẮC LÊN LỊCH ── */}
        {activeTab === 'schedule' && (
          <section ref={sectionScheduleRef} className="sc-section-card sc-tab-pane">
          <div className="sc-card-header">
            <div className="sc-ch-left">
              <div>
                <div className="sc-title-badge-row">
                  <h2 className="sc-ch-title">Quy tắc lên lịch</h2>
                  <span className="sc-tag-pill blue">Quy tắc chung</span>
                </div>
                <p className="sc-ch-desc">
                  Thiết lập các giới hạn giờ làm và nghỉ ngơi để đảm bảo sức khỏe và ngăn chặn xung đột lịch làm việc tự động
                </p>
              </div>
            </div>

            <span className="sc-tag-pill blue">Luôn kiểm tra khi phân công</span>
          </div>

          <div className="sc-card-body">
            <div className="sc-rules-2x2-grid">
              {/* Rule Item 2 */}
              <div className="sc-rule-card">
                <div className="sc-rc-content">
                  <div className="sc-rc-title-row">
                    <span className="sc-rc-title">Giờ nghỉ tối thiểu giữa hai ca</span>
                  </div>
                  <span className="sc-rc-desc">Áp dụng cả cùng ngày, qua đêm và giữa các chi nhánh. Với nhân viên làm nhiều chi nhánh, dùng mức nghỉ cao nhất của các chi nhánh đang làm việc.</span>
                </div>

                <div className="sc-stepper-box">
                  <button
                    type="button"
                    className="sc-step-btn"
                    aria-label="Giảm giờ nghỉ tối thiểu"
                    onClick={() => setConfig({ ...config, minRestHours: Math.max(0, config.minRestHours - 1) })}
                  >
                    −
                  </button>
                  <span className="sc-step-val">{config.minRestHours}</span>
                  <span className="sc-step-unit">giờ</span>
                  <button
                    type="button"
                    className="sc-step-btn"
                    aria-label="Tăng giờ nghỉ tối thiểu"
                    onClick={() => setConfig({ ...config, minRestHours: Math.min(168, config.minRestHours + 1) })}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="sc-rule-card">
                <div className="sc-rc-content">
                  <span className="sc-rc-title">Dung sai lịch rảnh khi xếp ca</span>
                  <p className="sc-rc-desc">Áp dụng cho xếp tự động, phân công tay và duyệt đổi ca. 0 phút yêu cầu ca nằm hoàn toàn trong lịch rảnh; giá trị khác cho phép lệch ở hai đầu. Nhân viên tự nhận ca mở được phép ngoài lịch rảnh.</p>
                  <p className="sc-rc-desc">Khung giờ kết thúc sớm hơn giờ bắt đầu được tính sang ngày hôm sau.</p>
                </div>
                <label className="sc-availability-policy-input">
                  <span className="sc-rc-desc">Phút dung sai (0–60)</span>
                  <input type="number" min="0" max="60" step="1" aria-label="Dung sai lịch rảnh (phút)"
                    value={config.availabilityToleranceMinutes ?? ''}
                    disabled={config.availabilityToleranceMinutes == null}
                    placeholder="Chưa tải được"
                    onChange={event => setConfig({ ...config, availabilityToleranceMinutes: Math.min(60, Math.max(0, Number(event.target.value))) })} />
                </label>
              </div>

              {/* Rule Item 3 */}
              <div className="sc-rule-card">
                <div className="sc-rc-content">
                  <div className="sc-rc-title-row">
                    <span className="sc-rc-title">Số ngày làm việc liên tiếp tối đa</span>
                  </div>
                  <span className="sc-rc-desc">Giới hạn số ngày làm liên không nghỉ quãng</span>
                </div>

                <div className="sc-stepper-box">
                  <button
                    type="button"
                    className="sc-step-btn"
                    onClick={() => setConfig({ ...config, maxConsecutiveDays: Math.max(1, config.maxConsecutiveDays - 1) })}
                  >
                    −
                  </button>
                  <span className="sc-step-val">{config.maxConsecutiveDays}</span>
                  <span className="sc-step-unit">ngày</span>
                  <button
                    type="button"
                    className="sc-step-btn"
                    onClick={() => setConfig({ ...config, maxConsecutiveDays: config.maxConsecutiveDays + 1 })}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Rule Item 4 */}
              <div className="sc-rule-card">
                <div className="sc-rc-content">
                  <div className="sc-rc-title-row">
                    <span className="sc-rc-title">Số ngày làm việc tối đa trong một tuần</span>
                  </div>
                  <span className="sc-rc-desc">Quy mô công chuẩn tuần cho nhân viên full-time</span>
                </div>

                <div className="sc-stepper-box">
                  <button
                    type="button"
                    className="sc-step-btn"
                    onClick={() => setConfig({ ...config, maxDaysPerWeek: Math.max(1, config.maxDaysPerWeek - 1) })}
                  >
                    −
                  </button>
                  <span className="sc-step-val">{config.maxDaysPerWeek}</span>
                  <span className="sc-step-unit">ngày</span>
                  <button
                    type="button"
                    className="sc-step-btn"
                    onClick={() => setConfig({ ...config, maxDaysPerWeek: config.maxDaysPerWeek + 1 })}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Rule Item 5: Max weekly hours system-wide */}
              <div className="sc-rule-card">
                <div className="sc-rc-content">
                  <div className="sc-rc-title-row">
                    <span className="sc-rc-title">Trần giờ làm tối đa mỗi tuần (Toàn hệ thống)</span>
                  </div>
                  <span className="sc-rc-desc">Giới hạn giờ làm việc tối đa trong tuần của một nhân viên (Chuẩn 48h)</span>
                </div>

                <div className="sc-stepper-box">
                  <button
                    type="button"
                    className="sc-step-btn"
                    onClick={() => setConfig({ ...config, maxHourPerWeek: Math.max(20, (config.maxHourPerWeek || 48) - 1) })}
                  >
                    −
                  </button>
                  <span className="sc-step-val">{config.maxHourPerWeek || 48}</span>
                  <span className="sc-step-unit">giờ</span>
                  <button
                    type="button"
                    className="sc-step-btn"
                    onClick={() => setConfig({ ...config, maxHourPerWeek: (config.maxHourPerWeek || 48) + 1 })}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* ── Sub-section: Contract Types Max Weekly Hours Limit ── */}
            <div className="sc-contract-types-section">
              <div className="sc-cts-header">
                <div>
                  <h3 className="sc-cts-title">Trần giờ làm việc theo loại hợp đồng (Contract Types)</h3>
                  <p className="sc-cts-desc">
                    Cấu hình trần giờ làm việc tối đa trong tuần cho từng loại hợp đồng.
                    Với nhân viên làm nhiều chi nhánh, tổng giờ ở mọi chi nhánh phải nằm trong hạn mức thấp nhất của các hợp đồng đang hoạt động; các hạn mức không được cộng dồn.
                  </p>
                </div>
                <button
                  type="button"
                  className="sc-btn-add-contract"
                  onClick={() => setShowAddContractModal(true)}
                >
                  + Thêm loại hợp đồng
                </button>
              </div>

              <label>
                Ngày hiệu lực thay đổi hợp đồng
                <input type="date" value={contractEffectiveDate} onChange={(e) => setContractEffectiveDate(e.target.value)} required />
              </label>

              {contractTypes.length === 0 ? (
                <div className="sc-empty-hint" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                  Chưa có loại hợp đồng nào được tải cho cửa hàng này.
                </div>
              ) : (
                <div className="sc-contract-types-grid">
                  {contractTypes.map((ct) => {
                    const orig = initialContractTypes.find((i) => String(i.id) === String(ct.id));
                    const isCtDirty = orig && Number(orig.maxWeeklyHours) !== Number(ct.maxWeeklyHours);
                    const nameLower = (ct.name || '').toLowerCase();
                    const badgeClass = nameLower.includes('full')
                      ? 'fulltime'
                      : nameLower.includes('part')
                      ? 'parttime'
                      : nameLower.includes('season') || nameLower.includes('thời vụ')
                      ? 'seasonal'
                      : 'other';

                    return (
                      <div key={ct.id} className={`sc-contract-card ${isCtDirty ? 'is-dirty' : ''}`}>
                        <div className="sc-cc-top">
                          <div className="sc-cc-badge-wrap">
                            <span className={`sc-cc-name-badge ${badgeClass}`}>{ct.name}</span>
                            <span className="sc-cc-rate-text">
                              Lương chuẩn: {Number(ct.defaultHourlyRate || 0).toLocaleString()} $/h • OT: {ct.otMultiplier || 1.25}x
                            </span>
                            {ct.scheduledEffectiveDate && <span className="sc-cc-rate-text">
                              Từ {ct.scheduledEffectiveDate}: {ct.scheduledMaxWeeklyHours} giờ/tuần
                            </span>}
                          </div>
                          {isCtDirty && (
                            <button
                              type="button"
                              className="sc-btn-save-ct-inline"
                              onClick={() => handleSaveContractTypeInline(ct)}
                              disabled={contractSavingId === ct.id}
                              title="Lưu riêng loại hợp đồng này"
                            >
                              {contractSavingId === ct.id ? '...' : '✓ Lưu'}
                            </button>
                          )}
                          <button
                            type="button"
                            className="sc-btn-save-ct-inline"
                            onClick={() => handleDeleteContractType(ct)}
                            disabled={contractSavingId === ct.id}
                            title={`Xóa ${ct.name}`}
                            style={{ color: '#b42318' }}
                          >
                            Xóa
                          </button>
                        </div>

                        <div className="sc-cc-body">
                          <div className="sc-cc-label-block">
                            <span className="sc-cc-label">Trần giờ tối đa/tuần</span>
                            <span className="sc-cc-hint">Giới hạn xếp ca tự động</span>
                          </div>

                          <div className="sc-ct-stepper">
                            <button
                              type="button"
                              className="sc-step-btn"
                              onClick={() => handleUpdateContractHours(ct.id, (ct.maxWeeklyHours || 40) - 1)}
                            >
                              −
                            </button>
                            <input
                              type="number"
                              className="sc-ct-hours-input"
                              value={ct.maxWeeklyHours || 0}
                              onChange={(e) => handleUpdateContractHours(ct.id, e.target.value)}
                              min="1"
                              max="80"
                            />
                            <span className="sc-step-unit" style={{ marginLeft: 4 }}>h/tuần</span>
                            <button
                              type="button"
                              className="sc-step-btn"
                              onClick={() => handleUpdateContractHours(ct.id, (ct.maxWeeklyHours || 40) + 1)}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ═══ PANEL: TRỌNG SỐ THUẬT TOÁN XẾP CA TỰ ĐỘNG AI ═══ */}
            <div style={{ marginTop: '28px', borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sliders size={18} color="#0d9488" />
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                      Trọng số thuật toán xếp ca AI (Auto-Scheduler Weights)
                    </h3>
                    <span style={{ fontSize: '11px', background: '#ccfbf1', color: '#0f766e', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                      Backend Optimizer API
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                    Điều chỉnh tỷ trọng 5 tiêu chí để thuật toán phân bổ ca tự động tối ưu nhất. Tổng 5 trọng số phải đạt đúng 100%.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    background: totalWeights === 100 ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${totalWeights === 100 ? '#bbf7d0' : '#fecaca'}`,
                    color: totalWeights === 100 ? '#15803d' : '#b91c1c'
                  }}>
                    Tổng trọng số: {totalWeights}% {totalWeights === 100 ? '✓ Hợp lệ' : `(Lệch ${totalWeights - 100 > 0 ? '+' : ''}${totalWeights - 100}%)`}
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveSchedulerWeights}
                    disabled={savingWeights || totalWeights !== 100}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      background: totalWeights === 100 ? '#0d9488' : '#94a3b8',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: totalWeights === 100 ? 'pointer' : 'not-allowed',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}
                  >
                    <Sparkles size={14} />
                    {savingWeights ? 'Đang lưu...' : 'Lưu trọng số AI'}
                  </button>
                </div>
              </div>

              {/* Preset buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Mẫu cấu hình nhanh:</span>
                <button
                  type="button"
                  onClick={() => applyWeightPreset(0.20, 0.25, 0.20, 0.15, 0.20)}
                  style={{ fontSize: '12px', padding: '4px 10px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', color: '#334155' }}
                >
                  Tiêu chuẩn (20/25/20/15/20)
                </button>
                <button
                  type="button"
                  onClick={() => applyWeightPreset(0.35, 0.20, 0.15, 0.15, 0.15)}
                  style={{ fontSize: '12px', padding: '4px 10px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', color: '#334155' }}
                >
                  Ưu tiên Công bằng (35/20/15/15/15)
                </button>
                <button
                  type="button"
                  onClick={() => applyWeightPreset(0.15, 0.40, 0.15, 0.15, 0.15)}
                  style={{ fontSize: '12px', padding: '4px 10px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', color: '#334155' }}
                >
                  Ưu tiên Chuyên môn (15/40/15/15/15)
                </button>
                <button
                  type="button"
                  onClick={() => applyWeightPreset(0.15, 0.15, 0.15, 0.15, 0.40)}
                  style={{ fontSize: '12px', padding: '4px 10px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', color: '#334155' }}
                >
                  Ưu tiên Lịch rảnh (15/15/15/15/40)
                </button>
              </div>

              {/* 5 Weight Sliders */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                {/* 1. Fairness */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>1. Công bằng phân chia ca (Fairness)</span>
                    <strong style={{ fontSize: '14px', color: '#0d9488' }}>{Math.round((schedulerWeights.fairnessWeight || 0) * 100)}%</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={schedulerWeights.fairnessWeight || 0}
                    onChange={(e) => handleWeightChange('fairnessWeight', e.target.value)}
                    style={{ width: '100%', accentColor: '#0d9488' }}
                  />
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                    Chia đều số lượng ca và ngày nghỉ cuối tuần giữa các nhân viên trong chi nhánh.
                  </div>
                </div>

                {/* 2. Skill */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>2. Độ phù hợp chuyên môn (Skill)</span>
                    <strong style={{ fontSize: '14px', color: '#0d9488' }}>{Math.round((schedulerWeights.skillWeight || 0) * 100)}%</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={schedulerWeights.skillWeight || 0}
                    onChange={(e) => handleWeightChange('skillWeight', e.target.value)}
                    style={{ width: '100%', accentColor: '#0d9488' }}
                  />
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                    Ưu tiên nhân viên có đúng kỹ năng và tay nghề chuyên môn cho từng vị trí làm việc.
                  </div>
                </div>

                {/* 3. Hour */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>3. Tối ưu định mức giờ làm (Hours)</span>
                    <strong style={{ fontSize: '14px', color: '#0d9488' }}>{Math.round((schedulerWeights.hourWeight || 0) * 100)}%</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={schedulerWeights.hourWeight || 0}
                    onChange={(e) => handleWeightChange('hourWeight', e.target.value)}
                    style={{ width: '100%', accentColor: '#0d9488' }}
                  />
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                    Phân bổ giờ làm bám sát định mức tuần theo loại hợp đồng (Full-time / Part-time).
                  </div>
                </div>

                {/* 4. Rest Time */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>4. Đảm bảo giờ nghỉ ngơi (Rest Time)</span>
                    <strong style={{ fontSize: '14px', color: '#0d9488' }}>{Math.round((schedulerWeights.restTimeWeight || 0) * 100)}%</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={schedulerWeights.restTimeWeight || 0}
                    onChange={(e) => handleWeightChange('restTimeWeight', e.target.value)}
                    style={{ width: '100%', accentColor: '#0d9488' }}
                  />
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                    Tối đa hóa khoảng cách an toàn giữa 2 ca làm liên tiếp nhằm phòng chống quá tải.
                  </div>
                </div>

                {/* 5. Availability */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>5. Bám sát lịch rảnh (Availability)</span>
                    <strong style={{ fontSize: '14px', color: '#0d9488' }}>{Math.round((schedulerWeights.availabilityWeight || 0) * 100)}%</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={schedulerWeights.availabilityWeight || 0}
                    onChange={(e) => handleWeightChange('availabilityWeight', e.target.value)}
                    style={{ width: '100%', accentColor: '#0d9488' }}
                  />
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                    Tôn trọng tối đa khung giờ rảnh và ngày báo bận do nhân viên chủ động đăng ký.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        )}

        {/* ── 6. CARD 4: CẤU HÌNH CA & QUY TRÌNH PHÊ DUYỆT ── */}
        {activeTab === 'config' && (
        <section ref={sectionConfigRef} className="sc-section-card sc-tab-pane">
          <div className="sc-card-header">
            <div className="sc-ch-left">
              <div>
                <div className="sc-title-badge-row">
                  <h2 className="sc-ch-title">Cấu hình</h2>
                  <span className="sc-tag-pill pink">Quy trình & Đổi ca</span>
                </div>
                <p className="sc-ch-desc">
                  Quy định thời hạn đăng ký, cơ chế mở chợ ca tự do và luồng phê duyệt từ Quản lý chi nhánh.
                </p>
              </div>
            </div>

            <button
              type="button"
              className={`sc-toggle-switch ${config.configEnabled ? 'active' : ''}`}
              onClick={() => setConfig({ ...config, configEnabled: !config.configEnabled })}
              title="Bật/Tắt cấu hình ca"
            >
              <div className="sc-toggle-circle" />
            </button>
          </div>

          <div className={`sc-card-body ${!config.configEnabled ? 'is-disabled' : ''}`}>
            {/* SUB-SECTION 1: HẠN ĐĂNG KÝ CA */}
            <div className="sc-sub-category">
              <h3 className="sc-subcat-title">HẠN ĐĂNG KÝ CA</h3>
              <div className="sc-subcat-row-card">
                <div className="sc-subcat-left-text">
                  <span className="sc-subcat-dot">●</span>
                  <span className="sc-subcat-main-label">
                    Cho phép Nhân viên đăng ký/hủy ca trống trước
                  </span>
                </div>

                <div className="sc-stepper-box">
                  <button
                    type="button"
                    className="sc-step-btn"
                    onClick={() => setConfig({ ...config, cancelAdvanceDays: Math.max(1, config.cancelAdvanceDays - 1) })}
                  >
                    −
                  </button>
                  <span className="sc-step-val">{config.cancelAdvanceDays}</span>
                  <span className="sc-step-unit">ngày</span>
                  <button
                    type="button"
                    className="sc-step-btn"
                    onClick={() => setConfig({ ...config, cancelAdvanceDays: config.cancelAdvanceDays + 1 })}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* SUB-SECTION 2: CHỢ CA & TỰ DO ĐỔI LỊCH */}
            <div className="sc-sub-category">
              <h3 className="sc-subcat-title">CHỢ CA & TỰ DO ĐỔI LỊCH</h3>
              <div className="sc-two-col-grid">
                {/* Checkbox Card 1 */}
                <div
                  className={`sc-check-card ${config.allowMarketplace ? 'selected' : ''}`}
                  onClick={() => setConfig({ ...config, allowMarketplace: !config.allowMarketplace })}
                >
                  <div className="sc-cc-top">
                    <span className={`sc-cc-box ${config.allowMarketplace ? 'checked' : ''}`}>
                      {config.allowMarketplace ? '✓' : ''}
                    </span>
                    <span className="sc-cc-title">Cho phép đăng ca trống lên Marketplace</span>
                  </div>
                  <p className="sc-cc-desc">
                    Nhân viên bận đột xuất có thể chủ động chuyển ca lên chợ tìm người thế ca
                  </p>
                </div>

                {/* Checkbox Card 2 */}
                <div
                  className={`sc-check-card ${config.allowSelfSwap ? 'selected' : ''}`}
                  onClick={() => setConfig({ ...config, allowSelfSwap: !config.allowSelfSwap })}
                >
                  <div className="sc-cc-top">
                    <span className={`sc-cc-box ${config.allowSelfSwap ? 'checked' : ''}`}>
                      {config.allowSelfSwap ? '✓' : ''}
                    </span>
                    <span className="sc-cc-title">Cho phép nhân viên tự gửi yêu cầu đổi ca</span>
                  </div>
                  <p className="sc-cc-desc">
                    Nhân viên gửi lời mời hoán đổi ca 1-1 trực tiếp tới đồng nghiệp cùng vị trí
                  </p>
                </div>
              </div>
            </div>

            {/* SUB-SECTION 3: QUY TRÌNH PHÊ DUYỆT CA */}
            <div className="sc-sub-category">
              <h3 className="sc-subcat-title">QUY TRÌNH PHÊ DUYỆT CA</h3>
              <div className="sc-radio-cards-group">
                {/* Option 1: Manager Approval (Default Standard) */}
                <div
                  className={`sc-radio-card ${config.approvalMode === 'manager' ? 'selected' : ''}`}
                  onClick={() => setConfig({ ...config, approvalMode: 'manager', requireManagerApproval: true, firstValidFirstServed: false })}
                >
                  <div className="sc-rc-head">
                    <div className="sc-rc-head-left">
                      <span className={`sc-radio-dot-circle ${config.approvalMode === 'manager' ? 'checked' : ''}`}>
                        {config.approvalMode === 'manager' && <span className="sc-radio-inner-dot" />}
                      </span>
                      <span className="sc-rc-main-title">
                        Yêu cầu Manager phê duyệt (Approve/Reject) mọi đơn đổi ca & nhận ca trống
                      </span>
                    </div>
                    <span className="sc-tag-pill green">TIÊU CHUẨN</span>
                  </div>
                  <p className="sc-rc-subtext">
                    Quản lý trực tiếp kiểm tra sự cân bằng nhân sự trước khi hệ thống ghi nhận ca chính thức.
                  </p>
                </div>

                {/* Option 2: First Valid First Served (Auto) */}
                <div
                  className={`sc-radio-card ${config.approvalMode === 'fifo' ? 'selected' : ''}`}
                  onClick={() => setConfig({ ...config, approvalMode: 'fifo', requireManagerApproval: false, firstValidFirstServed: true })}
                >
                  <div className="sc-rc-head">
                    <div className="sc-rc-head-left">
                      <span className={`sc-radio-dot-circle ${config.approvalMode === 'fifo' ? 'checked' : ''}`}>
                        {config.approvalMode === 'fifo' && <span className="sc-radio-inner-dot" />}
                      </span>
                      <span className="sc-rc-main-title">
                        Áp dụng nguyên tắc First Valid First Served cho ca trống
                      </span>
                    </div>
                    <span className="sc-tag-pill neutral">TỰ ĐỘNG</span>
                  </div>
                  <p className="sc-rc-subtext">
                    Nhân viên đầu tiên bấm nhận ca thỏa mãn kỹ năng & số giờ tối đa sẽ được duyệt tự động ngay lập tức.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
        )}

        {/* ── 7. CARD 5: ĐIỀU PHỐI (DISPATCH & CROSS-STORE) ── */}
        {activeTab === 'dispatch' && (
        <section ref={sectionDispatchRef} className="sc-section-card sc-tab-pane">
          <div className="sc-card-header">
            <div className="sc-ch-left">
              <div>
                <div className="sc-title-badge-row">
                  <h2 className="sc-ch-title">Điều phối</h2>
                  <span className="sc-tag-pill amber">Hỗ trợ liên chi nhánh</span>
                </div>
                <p className="sc-ch-desc">
                  Quy chế chia sẻ và mượn nhân sự giữa các cửa hàng trong chuỗi ShiftSync khi thiếu hụt đột xuất.
                </p>
              </div>
            </div>

            <button
              type="button"
              className={`sc-toggle-switch ${config.dispatchEnabled ? 'active' : ''}`}
              onClick={() => setConfig({ ...config, dispatchEnabled: !config.dispatchEnabled })}
              title="Bật/Tắt điều phối liên chi nhánh"
            >
              <div className="sc-toggle-circle" />
            </button>
          </div>

          <div className={`sc-card-body ${!config.dispatchEnabled ? 'is-disabled' : ''}`}>
            {/* SUB-SECTION 1: CHIA SẺ LAO ĐỘNG */}
            <div className="sc-sub-category">
              <h3 className="sc-subcat-title">CHIA SẺ LAO ĐỘNG</h3>
              <div
                className={`sc-check-card full-width ${config.allowInterStore ? 'selected' : ''}`}
                onClick={() => setConfig({ ...config, allowInterStore: !config.allowInterStore })}
              >
                <div className="sc-cc-top">
                  <span className={`sc-cc-box ${config.allowInterStore ? 'checked' : ''}`}>
                    {config.allowInterStore ? '✓' : ''}
                  </span>
                  <span className="sc-cc-title">
                    Cho phép gửi và nhận yêu cầu hỗ trợ nhân sự với Store khác
                  </span>
                </div>
                <p className="sc-cc-desc">
                  Mở quyền liên thông danh sách nhân viên khả dụng giữa {config.storeName} và các điểm bán lân cận.
                </p>
              </div>
            </div>

            {/* SUB-SECTION 2: RÀNG BUỘC ĐIỀU PHỐI */}
            <div className="sc-sub-category">
              <h3 className="sc-subcat-title">RÀNG BUỘC ĐIỀU PHỐI</h3>
              <div className="sc-vertical-check-stack">
                <div
                  className={`sc-check-card full-width ${config.skillCheckNoConflict ? 'selected' : ''}`}
                  onClick={() => setConfig({ ...config, skillCheckNoConflict: !config.skillCheckNoConflict })}
                >
                  <div className="sc-cc-top">
                    <span className={`sc-cc-box ${config.skillCheckNoConflict ? 'checked' : ''}`}>
                      {config.skillCheckNoConflict ? '✓' : ''}
                    </span>
                    <span className="sc-cc-title">
                      Chỉ gợi ý nhân viên thỏa kỹ năng, không trùng ca
                    </span>
                  </div>
                  <p className="sc-cc-desc">
                    Thuật toán tự động quét chứng chỉ phù hợp bàn giao và loại trừ các ứng viên đã được xếp ca cùng khung giờ.
                  </p>
                </div>

                <div
                  className={`sc-check-card full-width ${config.requireStaffConfirm ? 'selected' : ''}`}
                  onClick={() => setConfig({ ...config, requireStaffConfirm: !config.requireStaffConfirm })}
                >
                  <div className="sc-cc-top">
                    <span className={`sc-cc-box ${config.requireStaffConfirm ? 'checked' : ''}`}>
                      {config.requireStaffConfirm ? '✓' : ''}
                    </span>
                    <span className="sc-cc-title">
                      Bắt buộc nhân viên phải bấm xác nhận trước khi tạo đổi
                    </span>
                  </div>
                  <p className="sc-cc-desc">
                    Tránh việc chuyển địa điểm làm việc mà không có sự đồng thuận trước từ phía người lao động.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
        )}

        {/* ── 8. CARD 6: PHÂN QUYỀN (RBAC MATRIX) ── */}
        {activeTab === 'permissions' && (
        <section ref={sectionPermRef} className="sc-section-card sc-tab-pane">
          <div className="sc-card-header">
            <div className="sc-ch-left">
              <div>
                <div className="sc-title-badge-row">
                  <h2 className="sc-ch-title">Phân quyền</h2>
                  <span className="sc-tag-pill teal">Mô hình RBAC</span>
                </div>
                <p className="sc-ch-desc">
                  Phạm vi hiển thị và quyền thao tác dữ liệu được cài hình mặc định cho các vai trò tại cửa hàng.
                </p>
              </div>
            </div>

            <button
              type="button"
              className={`sc-toggle-switch ${config.permissionEnabled ? 'active' : ''}`}
              onClick={() => setConfig({ ...config, permissionEnabled: !config.permissionEnabled })}
              title="Bật/Tắt phân quyền"
            >
              <div className="sc-toggle-circle" />
            </button>
          </div>

          <div className={`sc-card-body ${!config.permissionEnabled ? 'is-disabled' : ''}`}>
            <div className="sc-rbac-table-wrap">
              <table className="sc-rbac-table">
                <thead>
                  <tr>
                    <th className="sc-th-scope">PHẠM VI HIỂN THỊ & QUYỀN HẠN</th>
                    <th className="sc-th-role role-staff">
                      <span className="sc-role-dot dot-staff">●</span>
                      <span>NHÂN VIÊN (STAFF)</span>
                    </th>
                    <th className="sc-th-role role-manager">
                      <span className="sc-role-dot dot-manager">●</span>
                      <span>QUẢN LÝ (MANAGER)</span>
                    </th>
                    <th className="sc-th-role role-admin">
                      <span className="sc-role-dot dot-admin">●</span>
                      <span>QUẢN TRỊ VIÊN (ADMIN)</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Row 1 */}
                  <tr>
                    <td className="sc-td-scope">
                      <span className="sc-scope-title">Xem Lịch làm việc & Dữ liệu cá nhân</span>
                      <span className="sc-scope-sub">Đi kèm ca xác nhận chính mình, chấm công và gửi đơn phép</span>
                    </td>
                    <td className="sc-td-check">
                      <span className="sc-perm-check">✓</span>
                    </td>
                    <td className="sc-td-check">
                      <span className="sc-perm-check">✓</span>
                    </td>
                    <td className="sc-td-check">
                      <span className="sc-perm-check">✓</span>
                    </td>
                  </tr>

                  {/* Row 2 */}
                  <tr>
                    <td className="sc-td-scope">
                      <span className="sc-scope-title">Quản lý & Duyệt dữ liệu thuộc Store phụ trách</span>
                      <span className="sc-scope-sub">Xếp ca, duyệt đổi ca, duyệt chấm công và phân bổ vị trí ca làm</span>
                    </td>
                    <td className="sc-td-check">
                      <span className="sc-perm-dash">—</span>
                    </td>
                    <td className="sc-td-check">
                      <span className="sc-perm-check">✓</span>
                    </td>
                    <td className="sc-td-check">
                      <span className="sc-perm-check">✓</span>
                    </td>
                  </tr>

                  {/* Row 3 */}
                  <tr>
                    <td className="sc-td-scope">
                      <span className="sc-scope-title">Toàn quyền truy cập & Chỉnh sửa hệ thống</span>
                      <span className="sc-scope-sub">Thay đổi tọa độ, cấu hình giờ làm, phân quyền chi nhánh và xuất báo cáo tiền lương</span>
                    </td>
                    <td className="sc-td-check">
                      <span className="sc-perm-dash">—</span>
                    </td>
                    <td className="sc-td-check">
                      <span className="sc-perm-dash">—</span>
                    </td>
                    <td className="sc-td-check">
                      <span className="sc-perm-check">✓</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
        )}

        {activeTab === 'notifications' && (
          <section className="sc-section-card sc-tab-pane">
            <div className="sc-card-header"><div className="sc-ch-left"><div><h2 className="sc-ch-title">Cài đặt thông báo</h2><p className="sc-ch-desc">Chọn loại thông báo bạn muốn nhận. Thiết lập được lưu trên tài khoản hiện tại.</p></div></div></div>
            <div className="sc-notification-composer">
              <label htmlFor="notification-test-title">Tiêu đề thông báo thử</label>
              <input id="notification-test-title" value={testNotificationForm.title} maxLength={120} onChange={(event) => setTestNotificationForm((form) => ({ ...form, title: event.target.value }))} placeholder="Ví dụ: Ca làm ngày mai đã được cập nhật" />
              <label htmlFor="notification-test-body">Nội dung</label>
              <textarea id="notification-test-body" value={testNotificationForm.body} maxLength={500} rows={3} onChange={(event) => setTestNotificationForm((form) => ({ ...form, body: event.target.value }))} placeholder="Nhập nội dung thông báo muốn gửi" />
            </div>
            <div className="sc-notification-actions">
              <button type="button" className={`sc-notification-action ${browserNotificationPermission === 'granted' ? 'is-enabled' : ''} ${browserNotificationPermission === 'denied' ? 'is-blocked' : ''}`} onClick={handleEnableBrowserNotifications} disabled={enablingBrowserNotifications || browserNotificationPermission === 'granted'}>{browserNotificationPermission === 'granted' ? '✓ Đã bật thông báo Windows' : enablingBrowserNotifications ? 'Đang xin quyền…' : browserNotificationPermission === 'denied' ? 'Thông báo đang bị chặn' : 'Bật thông báo Windows'}</button>
              <button type="button" className={`sc-notification-action is-test ${testNotificationState === 'sent' ? 'is-sent' : ''} ${testNotificationState === 'failed' ? 'is-blocked' : ''}`} onClick={handleTestNotification} disabled={testNotificationState === 'sending'}>{testNotificationState === 'sending' ? 'Đang gửi…' : testNotificationState === 'sent' ? '✓ Đã gửi thông báo thử' : testNotificationState === 'failed' ? 'Gửi lại thông báo thử' : 'Gửi thông báo thử'}</button>
              <button type="button" className={`sc-notification-action is-delayed-test ${delayedTestState === 'scheduled' ? 'is-sent' : ''} ${delayedTestState === 'failed' ? 'is-blocked' : ''}`} onClick={handleDelayedTestNotification} disabled={delayedTestState === 'scheduling'}>{delayedTestState === 'scheduling' ? 'Đang hẹn gửi…' : delayedTestState === 'scheduled' ? '✓ Đã hẹn gửi sau 10 giây' : delayedTestState === 'failed' ? 'Hẹn gửi lại sau 10 giây' : 'Thử khi đóng tab (10 giây)'}</button>
            </div>
            <p className={`sc-notification-status ${browserNotificationPermission === 'granted' ? 'is-success' : browserNotificationPermission === 'denied' ? 'is-error' : ''}`} role="status">{browserNotificationPermission === 'granted' ? 'Thông báo Windows đã được liên kết với trình duyệt này.' : browserNotificationPermission === 'denied' ? 'Trình duyệt đã chặn thông báo. Hãy cấp lại quyền trong cài đặt của trang web.' : 'Chưa bật thông báo Windows. Sau khi bật, thông báo vẫn hiện khi bạn đóng tab ShiftSync.'}</p>
            {notificationLoading ? <p>Đang tải cài đặt…</p> : notificationPreferences.length === 0 ? <p className="sc-empty-hint">Chưa có loại thông báo khả dụng.</p> : <div className="sc-contract-types-grid">{notificationPreferences.map((preference) => <div className="sc-contract-card" key={preference.notificationType}><div className="sc-cc-top"><div><strong>{String(preference.notificationType).replaceAll('_', ' ')}</strong><p className="sc-cc-rate-text">Thông báo trong ứng dụng</p></div><button type="button" className="sc-btn-save-ct-inline" onClick={() => handleNotificationPreference(preference)} disabled={updatingNotificationType === preference.notificationType}>{updatingNotificationType === preference.notificationType ? 'Đang lưu…' : preference.enabled ? 'Đang bật' : 'Đang tắt'}</button></div></div>)}</div>}
          </section>
        )}

        {/* ── 9. CARD 7: GIAO DIỆN & PHONG CÁCH HỆ THỐNG ── */}
        {activeTab === 'appearance' && (
          <section className="sc-section-card sc-tab-pane">
            <div className="sc-card-header">
              <div className="sc-ch-left">
                <div>
                  <h2 className="sc-ch-title">Tùy biến Giao diện & Chủ đề</h2>
                  <p className="sc-ch-desc">
                    Lựa chọn bảng màu, chế độ sáng tối và phong cách thanh điều hướng phù hợp với thương hiệu cửa hàng
                  </p>
                </div>
              </div>
              <span className="sc-badge-active">Áp dụng tức thì</span>
            </div>

            <div className="sc-card-body sc-appearance-section">
              {/* Block 1: Theme Style Palette */}
              <div className="sc-appearance-block">
                <div className="sc-appearance-block-header">
                  <div className="sc-appearance-block-title">
                    <Palette size={16} />
                    <span>Phong cách Bảng màu (Theme Style)</span>
                  </div>
                  <p className="sc-appearance-block-desc">
                    Chọn bộ phối màu chủ đạo cho toàn bộ ứng dụng (Dashboard, Lập lịch ca, Chấm công, Bản đồ mặt bằng)
                  </p>
                </div>

                <div className="sc-theme-options-grid">
                  {THEME_STYLES.map((s) => {
                    const isSelected = (style || "warm") === s.id;
                    return (
                      <div
                        key={s.id}
                        className={`sc-theme-choice-card ${isSelected ? "active" : ""}`}
                        onClick={() => {
                          setStyle(s.id);
                          showToast(`Đã áp dụng phong cách ${s.name}! `);
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            setStyle(s.id);
                            showToast(`Đã áp dụng phong cách ${s.name}! `);
                          }
                        }}
                      >
                        <div className="sc-theme-choice-top">
                          <span className="sc-theme-choice-badge">{s.badge}</span>
                          <span className="sc-theme-choice-check">✓</span>
                        </div>

                        <div className="sc-theme-swatches">
                          <span
                            className="sc-swatch-dot"
                            style={{ backgroundColor: s.primaryColor }}
                            title={`Màu chính: ${s.primaryColor}`}
                          />
                          <span
                            className="sc-swatch-dot"
                            style={{ backgroundColor: s.navColor }}
                            title={`Màu thanh điều hướng: ${s.navColor}`}
                          />
                          <span
                            className="sc-swatch-dot"
                            style={{ backgroundColor: s.bgColor }}
                            title={`Màu nền trang: ${s.bgColor}`}
                          />
                          <span
                            className="sc-swatch-dot"
                            style={{ backgroundColor: s.accentColor }}
                            title={`Màu điểm nhấn: ${s.accentColor}`}
                          />
                        </div>

                        <div>
                          <h4 className="sc-theme-choice-title">{s.name}</h4>
                          <span className="sc-theme-choice-tagline">{s.tagline}</span>
                        </div>

                        <p className="sc-theme-choice-desc">{s.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Block 2: Light / Dark Mode */}
              <div className="sc-appearance-block">
                <div className="sc-appearance-block-header">
                  <div className="sc-appearance-block-title">
                    <Sun size={16} />
                    <span>Chế độ Sáng / Tối (Color Mode)</span>
                  </div>
                  <p className="sc-appearance-block-desc">
                    Tùy chỉnh nền sáng rõ nét cho ban ngày hoặc nền tối dịu mắt cho ca đêm
                  </p>
                </div>

                <div className="sc-mode-options-grid">
                  <div
                    className={`sc-mode-choice-card ${theme === "light" ? "active" : ""}`}
                    onClick={() => {
                      setTheme("light");
                      showToast("Đã chuyển sang giao diện Sáng! ");
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="sc-mode-choice-icon">
                      <Sun size={20} />
                    </div>
                    <div className="sc-mode-choice-info">
                      <strong>Giao diện Sáng (Light Mode)</strong>
                      <small>Nền ngà sáng rõ, độ tương phản cao, tối ưu cho môi trường ánh sáng ban ngày</small>
                    </div>
                  </div>

                  <div
                    className={`sc-mode-choice-card ${theme === "dark" ? "active" : ""}`}
                    onClick={() => {
                      setTheme("dark");
                      showToast("Đã chuyển sang giao diện Tối! ");
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="sc-mode-choice-icon">
                      <Moon size={20} />
                    </div>
                    <div className="sc-mode-choice-info">
                      <strong>Giao diện Tối (Dark Mode)</strong>
                      <small>Nền than sẫm êm dịu, giảm mỏi mắt khi quản lý ca tối hoặc làm việc thiếu sáng</small>
                    </div>
                  </div>
                </div>
              </div>

              {/* Block 3: Navbar Style */}
              <div className="sc-appearance-block">
                <div className="sc-appearance-block-header">
                  <div className="sc-appearance-block-title">
                    <Layout size={16} />
                    <span>Phong cách Thanh Điều Hướng (Navbar Style)</span>
                  </div>
                  <p className="sc-appearance-block-desc">
                    Lựa chọn thanh điều hướng nổi bật hay hòa nhập cùng màu nền ứng dụng
                  </p>
                </div>

                <div className="sc-mode-options-grid">
                  <div
                    className={`sc-mode-choice-card ${navStyle === "contrast" ? "active" : ""}`}
                    onClick={() => {
                      setNavStyle("contrast");
                      showToast("Đã đặt thanh điều hướng Tương phản đậm!");
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="sc-mode-choice-icon">
                      <Layout size={20} />
                    </div>
                    <div className="sc-mode-choice-info">
                      <strong>Tương phản đậm (Contrast Bar)</strong>
                      <small>Thanh điều hướng mang sắc sẫm đặc trưng, tạo điểm neo thị giác mạnh mẽ</small>
                    </div>
                  </div>

                  <div
                    className={`sc-mode-choice-card ${navStyle === "surface" ? "active" : ""}`}
                    onClick={() => {
                      setNavStyle("surface");
                      showToast("Đã đặt thanh điều hướng Liền mạch!");
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="sc-mode-choice-icon">
                      <Eye size={20} />
                    </div>
                    <div className="sc-mode-choice-info">
                      <strong>Liền mạch đồng màu (Seamless Surface)</strong>
                      <small>Thanh điều hướng hòa nhập nhẹ nhàng cùng màu nền của trang</small>
                    </div>
                  </div>
                </div>
              </div>

              {/* Block 4: Live UI Preview Mockup */}
              <div className="sc-appearance-block">
                <div className="sc-appearance-block-header">
                  <div className="sc-appearance-block-title">
                    <Eye size={16} />
                    <span>Xem trước giao diện thực tế (Live Preview)</span>
                  </div>
                  <p className="sc-appearance-block-desc">
                    Mô phỏng màu sắc và thành phần giao diện áp dụng theo tùy chọn hiện tại của bạn
                  </p>
                </div>

                <div className="sc-preview-box">
                  {/* Mock Navbar */}
                  <div className="sc-preview-navbar">
                    <div className="sc-preview-nav-left">
                      <span className="sc-preview-brand">ShiftSync</span>
                      <span className="sc-preview-nav-tab active">Dashboard</span>
                      <span className="sc-preview-nav-tab">Lập lịch</span>
                      <span className="sc-preview-nav-tab">Chấm công</span>
                    </div>
                    <div className="sc-preview-nav-right">
                      <span className="sc-preview-nav-badge">3 ca trống</span>
                      <span style={{ fontSize: 11, opacity: 0.8 }}>Quản lý chi nhánh</span>
                    </div>
                  </div>

                  {/* Mock Page Content */}
                  <div className="sc-preview-body">
                    <div className="sc-preview-metrics">
                      <div className="sc-preview-metric-card">
                        <span>Ca hôm nay</span>
                        <strong>12 ca</strong>
                      </div>
                      <div className="sc-preview-metric-card">
                        <span>Độ phủ ca</span>
                        <strong>96%</strong>
                      </div>
                      <div className="sc-preview-metric-card">
                        <span>Cần duyệt</span>
                        <strong>2 yêu cầu</strong>
                      </div>
                    </div>

                    <div className="sc-preview-content-card">
                      <div className="sc-preview-card-left">
                        <Check size={16} color="var(--ss-ac, #d97706)" />
                        <b>Phân công ca tự động & tối ưu giờ công</b>
                      </div>
                      <button type="button" className="sc-preview-btn">
                        Xếp ca ngay
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── 10. CARD 8: QUẢN LÝ NGÀY NGHỈ LỄ & HỆ SỐ LƯƠNG (HOLIDAYS) ── */}
        {activeTab === 'holidays' && (
          <section className="sc-section-card sc-tab-pane">
            <div className="sc-card-header">
              <div className="sc-ch-left">
                <div>
                  <div className="sc-title-badge-row">
                    <h2 className="sc-ch-title">Quản lý Ngày Nghỉ Lễ & Hệ số Lương</h2>
                    <span className="sc-tag-pill green">Toàn hệ thống</span>
                  </div>
                  <p className="sc-ch-desc">
                    Thiết lập danh mục ngày lễ theo Bộ Luật Lao động để tự động tính phụ cấp lương lễ (tối thiểu x300% = 3.0) khi nhân viên làm việc vào ngày này.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="sc-btn-save-emerald"
                onClick={openAddHoliday}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={16} />
                Thêm ngày lễ mới
              </button>
            </div>

            <div className="sc-card-body">
              {loadingHolidays ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                  Đang tải danh sách ngày lễ...
                </div>
              ) : holidays.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                  <Calendar size={32} color="#94a3b8" style={{ marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>Chưa có ngày nghỉ lễ nào được khai báo.</p>
                  <button
                    type="button"
                    onClick={openAddHoliday}
                    style={{ marginTop: '12px', padding: '6px 14px', fontSize: '13px', background: '#0d9488', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    + Khai báo ngày lễ đầu tiên
                  </button>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>Tên ngày lễ</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>Ngày áp dụng</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>Hệ số lương lễ</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {holidays.map((h) => (
                        <tr key={h.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                            {h.name}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#334155' }}>
                            <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '3px 8px', borderRadius: '4px', fontWeight: 500, fontSize: '12.5px' }}>
                              {h.holidayDate}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ background: '#f0fdf4', color: '#15803d', padding: '3px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '12.5px' }}>
                              x{Number(h.rateMultiplier ?? 3.0).toFixed(1)} ({Math.round(Number(h.rateMultiplier ?? 3.0) * 100)}%)
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => openEditHoliday(h)}
                              style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', padding: '4px 8px', marginRight: '6px' }}
                              title="Chỉnh sửa"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteHolidayClick(h)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px 8px' }}
                              title="Xóa ngày lễ"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Modal Thêm/Sửa Ngày Lễ ── */}
        {showHolidayModal && (
          <div className="sc-modal-overlay" onClick={() => !savingHoliday && setShowHolidayModal(false)}>
            <div className="sc-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', padding: '24px', background: '#fff', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                  {editingHoliday ? 'Chỉnh sửa ngày lễ' : 'Thêm ngày lễ mới'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowHolidayModal(false)}
                  disabled={savingHoliday}
                  style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#94a3b8' }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveHolidaySubmit}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                    Tên ngày nghỉ lễ *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Ngày Giải phóng miền Nam"
                    value={holidayForm.name}
                    onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                    Ngày áp dụng *
                  </label>
                  <input
                    type="date"
                    required
                    value={holidayForm.holidayDate}
                    onChange={(e) => setHolidayForm({ ...holidayForm, holidayDate: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                    Hệ số lương lễ (tối thiểu 1.0 = 100%) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="10.0"
                    required
                    value={holidayForm.rateMultiplier}
                    onChange={(e) => setHolidayForm({ ...holidayForm, rateMultiplier: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                  <small style={{ color: '#64748b', fontSize: '12px' }}>
                    Theo Luật Lao động, làm việc ngày lễ thường có hệ số 3.0 (300% lương ngày thường).
                  </small>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowHolidayModal(false)}
                    disabled={savingHoliday}
                    style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={savingHoliday}
                    style={{ padding: '8px 18px', background: '#0d9488', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {savingHoliday ? 'Đang lưu...' : editingHoliday ? 'Cập nhật' : 'Thêm ngày lễ'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── STICKY / FLOATING UN-SAVED CHANGES BAR ── */}
        <div className={`sc-sticky-actions-bar ${isDirty ? 'has-unsaved' : ''}`}>
          <div className="sc-sa-left">
            <span className={`sc-sa-dot ${isDirty ? 'dirty' : 'saved'}`}>●</span>
            <span className="sc-sa-text">
              {isDirty ? (
                <>Đã thay đổi <strong>{dirtyCount} thiết lập chưa lưu</strong>{lastSavedTime && <> • Lưu gần nhất lúc {lastSavedTime}</>}</>
              ) : (
                lastSavedTime
                  ? <>Tất cả thiết lập đã được lưu • Lưu gần nhất lúc {lastSavedTime}</>
                  : <>Không có thay đổi chưa lưu trong phiên này.</>
              )}
            </span>
          </div>

          <div className="sc-sa-right">
            <button
              type="button"
              className="sc-btn-reset-light"
              onClick={handleReset}
              disabled={saving}
            >
              Đặt lại mặc định
            </button>
            <button
              type="button"
              className="sc-btn-save-emerald"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Modal: Thêm loại hợp đồng mới ── */}
      {showAddContractModal && (
        <div className="sc-modal-overlay" onClick={() => setShowAddContractModal(false)}>
          <div className="sc-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="sc-modal-header">
              <h3>Thêm loại hợp đồng mới</h3>
              <button
                type="button"
                className="sc-modal-close"
                onClick={() => setShowAddContractModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateContractType}>
              <div className="sc-modal-body">
                <div className="sc-form-group">
                  <label className="sc-field-label">Tên loại hợp đồng *</label>
                  <input
                    type="text"
                    className="sc-input-text"
                    value={newContractForm.name}
                    onChange={(e) => setNewContractForm({ ...newContractForm, name: e.target.value })}
                    placeholder="Ví dụ: Sinh viên, Thực tập sinh, Bán thời gian 2..."
                    required
                  />
                </div>
                <div className="sc-form-group">
                  <label className="sc-field-label">Trần giờ tối đa mỗi tuần (h/tuần) *</label>
                  <input
                    type="number"
                    className="sc-input-text"
                    value={newContractForm.maxWeeklyHours}
                    onChange={(e) => setNewContractForm({ ...newContractForm, maxWeeklyHours: e.target.value })}
                    min="1"
                    max="80"
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="sc-form-group">
                    <label className="sc-field-label">Hệ số ngoài giờ (OT)</label>
                    <input
                      type="number"
                      step="0.05"
                      className="sc-input-text"
                      value={newContractForm.otMultiplier}
                      onChange={(e) => setNewContractForm({ ...newContractForm, otMultiplier: e.target.value })}
                      min="1.0"
                      required
                    />
                  </div>
                  <div className="sc-form-group">
                    <label className="sc-field-label">Lương chuẩn ($/h)</label>
                    <input
                      type="number"
                      step="0.5"
                      className="sc-input-text"
                      value={newContractForm.defaultHourlyRate}
                      onChange={(e) => setNewContractForm({ ...newContractForm, defaultHourlyRate: e.target.value })}
                      min="0.01"
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="sc-modal-footer">
                <button
                  type="button"
                  className="sc-btn-cancel"
                  onClick={() => setShowAddContractModal(false)}
                >
                  Hủy bỏ
                </button>
                <button type="submit" className="sc-btn-primary">
                  Tạo hợp đồng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

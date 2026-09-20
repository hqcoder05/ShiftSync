import { useState, useEffect, useRef } from 'react';
import { getAllStores, updateStore } from '../services/storeService';
import { getStoreConfiguration, updateStoreConfiguration } from '../services/storeConfigService';
import { getContractTypes, updateContractType, createContractType } from '../services/contractTypeService';
import { toast } from '../context/ToastContext';
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
  minHoursSameDay: 4,
  minHoursDiffDay: 12,
  minRestHours: 12,
  maxHourPerWeek: 48,
  availabilityDeadlineHours: 24,
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

export default function SettingsPage() {
  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [initialConfig, setInitialConfig] = useState(DEFAULT_CONFIG);
  const [toastMessage, setToastMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [lastSavedTime, setLastSavedTime] = useState('14:35 hôm nay');

  // Contract types state
  const [contractTypes, setContractTypes] = useState([]);
  const [initialContractTypes, setInitialContractTypes] = useState([]);
  const [showAddContractModal, setShowAddContractModal] = useState(false);
  const [newContractForm, setNewContractForm] = useState({
    name: '',
    maxWeeklyHours: 30,
    otMultiplier: 1.25,
    defaultHourlyRate: 25,
  });
  const [contractSavingId, setContractSavingId] = useState(null);

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
      setLoading(true);
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
      setLoading(false);
    }

    loadStores();
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
  }, [selectedStoreId, stores]);

  // Load configuration for a specific store from Backend API and localStorage
  const loadConfigForStore = async (storeId, storeObj) => {
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
        if (configRes.data) {
          const apiConfig = configRes.data;
          baseConfig = {
            ...baseConfig,
            ...apiConfig,
            openTime: apiConfig.openTime ? String(apiConfig.openTime).slice(0, 5) : (baseConfig.openTime || '08:00'),
            closeTime: apiConfig.closeTime ? String(apiConfig.closeTime).slice(0, 5) : (baseConfig.closeTime || '22:00'),
            geofenceRadiusMeters: apiConfig.geofenceRadiusM ?? baseConfig.geofenceRadiusMeters,
            geofenceRadiusM: apiConfig.geofenceRadiusM ?? baseConfig.geofenceRadiusM,
            minHoursDiffDay: apiConfig.minRestHours ?? baseConfig.minHoursDiffDay,
            minRestHours: apiConfig.minRestHours ?? baseConfig.minRestHours,
            maxHourPerWeek: apiConfig.maxHourPerWeek ?? baseConfig.maxHourPerWeek,
            availabilityDeadlineHours: apiConfig.availabilityDeadlineHours ?? baseConfig.availabilityDeadlineHours,
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
    setLoading(false);
  };

  const handleStoreChange = (newStoreId) => {
    setSelectedStoreId(newStoreId);
    localStorage.setItem('selectedStoreId', String(newStoreId));
    window.dispatchEvent(new CustomEvent('storeChanged', { detail: { storeId: String(newStoreId) } }));
    const storeObj = stores.find((s) => String(s.id) === String(newStoreId));
    loadConfigForStore(newStoreId, storeObj);
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
      await updateContractType(selectedStoreId, ct.id, {
        name: ct.name,
        maxWeeklyHours: Number(ct.maxWeeklyHours),
        otMultiplier: Number(ct.otMultiplier || 1.25),
        defaultHourlyRate: Number(ct.defaultHourlyRate || 25),
      });
      setInitialContractTypes((prev) =>
        prev.map((item) =>
          String(item.id) === String(ct.id) ? { ...item, maxWeeklyHours: Number(ct.maxWeeklyHours) } : item
        )
      );
      showToast(`Đã lưu trần giờ cho loại hợp đồng ${ct.name}! ✓`);
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
      setShowAddContractModal(false);
      setNewContractForm({ name: '', maxWeeklyHours: 30, otMultiplier: 1.25, defaultHourlyRate: 25 });
      toast.success(`Đã thêm loại hợp đồng "${created.name}" thành công!`);
    } catch (err) {
      toast.error(`Lỗi khi thêm: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${selectedStoreId}`, JSON.stringify(config));

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

        const storeOpen = formatTime(config.openTime || currentStore?.openTime, '08:00:00');
        const storeClose = formatTime(config.closeTime || currentStore?.closeTime, '22:00:00');

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
            minRestHours: Number(config.minRestHours || config.minHoursDiffDay || 8),
            geofenceRadiusM: Number(config.geofenceRadiusM || config.geofenceRadiusMeters || 100),
            availabilityDeadlineHours: Number(config.availabilityDeadlineHours || 24),
            allowedCheckInMinutes: Number(config.allowedCheckInMinutes || 30),
            allowedCheckOutMinutes: Number(config.allowedCheckOutMinutes || 60),
            lateGraceMinutes: Number(config.lateGraceMinutes || 5),
            earlyLeaveGraceMinutes: Number(config.earlyLeaveGraceMinutes || 5),
          });
        } catch (apiErr) {
          console.info('Backend updateStore / configuration notice:', apiErr.response?.data?.message || apiErr.message);
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
            await updateContractType(selectedStoreId, ct.id, {
              name: ct.name,
              maxWeeklyHours: Number(ct.maxWeeklyHours),
              otMultiplier: Number(ct.otMultiplier || 1.25),
              defaultHourlyRate: Number(ct.defaultHourlyRate || 25),
            });
          } catch (ctErr) {
            console.warn(`Lỗi lưu hợp đồng ${ct.name}:`, ctErr.message);
          }
        }
        setInitialContractTypes(JSON.parse(JSON.stringify(contractTypes)));
      }

      setInitialConfig({ ...config });
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} hôm nay`;
      setLastSavedTime(timeStr);
      showToast('Đã lưu cấu hình cửa hàng thành công! 🎉');
    } catch (err) {
      showToast('Lỗi khi lưu cấu hình: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Bạn có chắc muốn khôi phục cấu hình mặc định cho cửa hàng này?')) {
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
                  <span className="sc-tag-pill blue">Tuân thủ Luật LĐ</span>
                </div>
                <p className="sc-ch-desc">
                  Thiết lập các giới hạn giờ làm và nghỉ ngơi để đảm bảo sức khỏe và ngăn chặn xung đột lịch làm việc tự động
                </p>
              </div>
            </div>

            <button
              type="button"
              className={`sc-toggle-switch ${config.scheduleRulesEnabled ? 'active' : ''}`}
              onClick={() => setConfig({ ...config, scheduleRulesEnabled: !config.scheduleRulesEnabled })}
              title="Bật/Tắt quy tắc lên lịch"
            >
              <div className="sc-toggle-circle" />
            </button>
          </div>

          <div className={`sc-card-body ${!config.scheduleRulesEnabled ? 'is-disabled' : ''}`}>
            <div className="sc-rules-2x2-grid">
              {/* Rule Item 1 */}
              <div className="sc-rule-card">
                <div className="sc-rc-content">
                  <div className="sc-rc-title-row">
                    <span className="sc-rc-title">Số giờ tối thiểu giữa 2 ca trong cùng ngày</span>
                  </div>
                  <span className="sc-rc-desc">Khoảng đệm nghỉ giữa 2 ca liên tiếp</span>
                </div>

                <div className="sc-stepper-box">
                  <button
                    type="button"
                    className="sc-step-btn"
                    onClick={() => setConfig({ ...config, minHoursSameDay: Math.max(1, config.minHoursSameDay - 1) })}
                  >
                    −
                  </button>
                  <span className="sc-step-val">{config.minHoursSameDay}</span>
                  <span className="sc-step-unit">giờ</span>
                  <button
                    type="button"
                    className="sc-step-btn"
                    onClick={() => setConfig({ ...config, minHoursSameDay: config.minHoursSameDay + 1 })}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Rule Item 2 */}
              <div className="sc-rule-card">
                <div className="sc-rc-content">
                  <div className="sc-rc-title-row">
                    <span className="sc-rc-title">Số giờ tối thiểu giữa 2 ca khác ngày</span>
                  </div>
                  <span className="sc-rc-desc">Khoảng nghỉ làm chuyển qua đêm (turnaround)</span>
                </div>

                <div className="sc-stepper-box">
                  <button
                    type="button"
                    className="sc-step-btn"
                    onClick={() => setConfig({ ...config, minHoursDiffDay: Math.max(4, config.minHoursDiffDay - 1) })}
                  >
                    −
                  </button>
                  <span className="sc-step-val">{config.minHoursDiffDay}</span>
                  <span className="sc-step-unit">giờ</span>
                  <button
                    type="button"
                    className="sc-step-btn"
                    onClick={() => setConfig({ ...config, minHoursDiffDay: config.minHoursDiffDay + 1 })}
                  >
                    +
                  </button>
                </div>
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
                    Cấu hình trần giờ làm việc tối đa trong tuần (<code>max_weekly_hours</code>) cho từng đối tượng nhân sự.
                    Hệ thống xếp lịch tự động sẽ căn cứ vào trần này để phân ca không vượt quá thỏa thuận hợp đồng.
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

        {/* ── STICKY / FLOATING UN-SAVED CHANGES BAR ── */}
        <div className={`sc-sticky-actions-bar ${isDirty ? 'has-unsaved' : ''}`}>
          <div className="sc-sa-left">
            <span className={`sc-sa-dot ${isDirty ? 'dirty' : 'saved'}`}>●</span>
            <span className="sc-sa-text">
              {isDirty ? (
                <>Đã thay đổi <strong>{dirtyCount} thiết lập chưa lưu</strong> • Lưu gần nhất lúc {lastSavedTime}</>
              ) : (
                <>Tất cả thiết lập đã được lưu • Lưu gần nhất lúc {lastSavedTime}</>
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

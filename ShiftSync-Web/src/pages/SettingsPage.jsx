import { useState, useEffect } from 'react';
import { getAllStores, updateStore } from '../services/storeService';
import './SettingsPage.css';

const DEFAULT_CONFIG = {
  storeName: '',
  address: '',
  latitude: '',
  longitude: '',
  hasMap: true,

  // 1. Chấm công
  attendanceEnabled: true,

  // 2. Quy tắc lên lịch
  scheduleRulesEnabled: true,
  ruleSameDayEnabled: true,
  minHoursSameDay: 4,
  ruleDiffDayEnabled: true,
  minHoursDiffDay: 12,
  ruleConsecutiveEnabled: true,
  maxConsecutiveDays: 6,
  ruleWeeklyEnabled: true,
  maxDaysPerWeek: 5,

  // 3. Cấu hình
  configEnabled: true,
  cancelAdvanceEnabled: true,
  cancelAdvanceDays: 2,
  allowMarketplace: true,
  allowSelfSwap: true,
  requireManagerApproval: true,
  firstValidFirstServed: false,

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
  const [toastMessage, setToastMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

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
        { id: 'store-1', name: 'The Chill Buffet (Chi Nhánh 2)', address: 'Hồ Bơi Tây Thạnh, Quận Tân Phú, TP. Hồ Chí Minh' },
        { id: 'store-2', name: 'ShiftSync Flagship - Quận 1', address: '123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh' },
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

  // Load configuration for a specific store from localStorage and store properties
  const loadConfigForStore = (storeId, storeObj) => {
    let baseConfig = { ...DEFAULT_CONFIG };
    if (storeObj) {
      baseConfig.storeName = storeObj.name || '';
      baseConfig.address = storeObj.address || '';
      baseConfig.latitude = storeObj.latitude || '';
      baseConfig.longitude = storeObj.longitude || '';
    }

    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}${storeId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setConfig({
          ...baseConfig,
          ...parsed,
          storeName: storeObj?.name || parsed.storeName || baseConfig.storeName,
          address: storeObj?.address || parsed.address || baseConfig.address,
        });
        setLoading(false);
        return;
      }
    } catch (err) {
      console.warn('Error reading store config from localStorage:', err);
    }

    setConfig(baseConfig);
    setLoading(false);
  };

  const handleStoreChange = (newStoreId) => {
    setSelectedStoreId(newStoreId);
    localStorage.setItem('selectedStoreId', String(newStoreId));
    const storeObj = stores.find(s => String(s.id) === String(newStoreId));
    loadConfigForStore(newStoreId, storeObj);
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Save all config flags to localStorage for persistence
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${selectedStoreId}`, JSON.stringify(config));

      // 2. Sync store name & address to backend API if this is a real store UUID
      const currentStore = stores.find(s => String(s.id) === String(selectedStoreId));
      if (selectedStoreId && !selectedStoreId.startsWith('store-')) {
        const parseCoord = (val, fallback) => {
          const num = parseFloat(val);
          return isNaN(num) ? fallback : num;
        };

        try {
          await updateStore(selectedStoreId, {
            name: config.storeName || currentStore?.name || 'Chi nhánh',
            address: config.address || currentStore?.address || '',
            latitude: parseCoord(config.latitude, currentStore?.latitude || 10.8),
            longitude: parseCoord(config.longitude, currentStore?.longitude || 106.6),
            openTime: currentStore?.openTime || '08:00:00',
            closeTime: currentStore?.closeTime || '22:00:00',
          });
        } catch (apiErr) {
          console.info('Backend updateStore synced locally:', apiErr.message);
        }
      }

      // Update local store list state so other dropdowns see new name/address
      setStores(prev => prev.map(s => {
        if (String(s.id) === String(selectedStoreId)) {
          return {
            ...s,
            name: config.storeName,
            address: config.address,
          };
        }
        return s;
      }));

      showToast('Đã lưu cấu hình cửa hàng thành công!');
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
        storeName: currentStore?.name || '',
        address: currentStore?.address || '',
      };
      setConfig(resetConf);
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${selectedStoreId}`);
      showToast('Đã khôi phục cài đặt mặc định');
    }
  };

  // Generate dynamic map query URL based on the real address typed by the user
  const mapSearchQuery = config.address.trim() || config.storeName.trim() || 'Hồ Bơi Tây Thạnh, Quận Tân Phú, TP. Hồ Chí Minh';
  const dynamicMapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapSearchQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className="cfg-page">
      {toastMessage && <div className="cfg-toast">{toastMessage}</div>}

      <div className="cfg-card">
        {/* Header Title & Store Selector */}
        <div className="cfg-header-section">
          <h1 className="cfg-main-title">Cửa hàng</h1>
          <div className="cfg-store-select-pill">
            <span>Chi nhánh:</span>
            <select
              value={selectedStoreId}
              onChange={(e) => handleStoreChange(e.target.value)}
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Store Info Inputs */}
        <div className="cfg-store-info-section">
          <div className="cfg-input-group">
            <label className="cfg-input-label">Tên cửa hàng</label>
            <input
              type="text"
              className="cfg-text-input"
              value={config.storeName}
              onChange={(e) => setConfig({ ...config, storeName: e.target.value })}
              placeholder="Nhập tên chi nhánh / cửa hàng..."
            />
          </div>

          <div className="cfg-input-group">
            <label className="cfg-input-label">Vị trí</label>
            <input
              type="text"
              className="cfg-text-input full-width"
              value={config.address}
              onChange={(e) => setConfig({ ...config, address: e.target.value })}
              placeholder="Nhập địa chỉ thực tế (VD: 123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh)..."
            />
          </div>

          {/* Dynamic Map - Automatically updates live as user changes address */}
          {config.address && (
            <div className="cfg-map-container">
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

        {/* =================================================================
            1. Chấm công (Attendance Settings)
            ================================================================= */}
        <div className="cfg-block-item">
          <div className="cfg-switch-col">
            <button
              type="button"
              className={`cfg-toggle-switch ${config.attendanceEnabled ? 'active' : ''}`}
              onClick={() => setConfig({ ...config, attendanceEnabled: !config.attendanceEnabled })}
              title="Bật/Tắt Chấm công"
            >
              <div className="cfg-toggle-circle" />
            </button>
          </div>
          <div className={`cfg-block-content ${!config.attendanceEnabled ? 'disabled' : ''}`}>
            <h2 className="cfg-block-title">Chấm công</h2>
            <p className="cfg-block-desc">
              Yêu cầu nhân viên chấm công tại địa điểm làm ca. Chỉ định vị trí bên dưới nếu bạn muốn địa điểm công việc này là vị trí ca làm việc bắt buộc.
            </p>
          </div>
        </div>

        {/* =================================================================
            2. Quy tắc lên lịch (Scheduling Rules)
            ================================================================= */}
        <div className="cfg-block-item">
          <div className="cfg-switch-col">
            <button
              type="button"
              className={`cfg-toggle-switch ${config.scheduleRulesEnabled ? 'active' : ''}`}
              onClick={() => setConfig({ ...config, scheduleRulesEnabled: !config.scheduleRulesEnabled })}
              title="Bật/Tắt Quy tắc lên lịch"
            >
              <div className="cfg-toggle-circle" />
            </button>
          </div>
          <div className={`cfg-block-content ${!config.scheduleRulesEnabled ? 'disabled' : ''}`}>
            <h2 className="cfg-block-title">Quy tắc lên lịch</h2>
            <div className="cfg-options-list">
              {/* Option 1 */}
              <div
                className="cfg-option-row"
                onClick={() => setConfig({ ...config, ruleSameDayEnabled: !config.ruleSameDayEnabled })}
              >
                <div className={`cfg-circle-check ${config.ruleSameDayEnabled ? 'checked' : ''}`}>
                  {config.ruleSameDayEnabled && <div className="cfg-circle-check-inner" />}
                </div>
                <span>Số giờ tối thiểu giữa 2 ca trong cùng ngày:</span>
                <input
                  type="number"
                  className="cfg-num-input"
                  value={config.minHoursSameDay}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setConfig({ ...config, minHoursSameDay: Number(e.target.value) })}
                />
                <span>giờ</span>
              </div>

              {/* Option 2 */}
              <div
                className="cfg-option-row"
                onClick={() => setConfig({ ...config, ruleDiffDayEnabled: !config.ruleDiffDayEnabled })}
              >
                <div className={`cfg-circle-check ${config.ruleDiffDayEnabled ? 'checked' : ''}`}>
                  {config.ruleDiffDayEnabled && <div className="cfg-circle-check-inner" />}
                </div>
                <span>Số giờ tối thiểu giữa 2 ca khác ngày:</span>
                <input
                  type="number"
                  className="cfg-num-input"
                  value={config.minHoursDiffDay}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setConfig({ ...config, minHoursDiffDay: Number(e.target.value) })}
                />
                <span>giờ</span>
              </div>

              {/* Option 3 */}
              <div
                className="cfg-option-row"
                onClick={() => setConfig({ ...config, ruleConsecutiveEnabled: !config.ruleConsecutiveEnabled })}
              >
                <div className={`cfg-circle-check ${config.ruleConsecutiveEnabled ? 'checked' : ''}`}>
                  {config.ruleConsecutiveEnabled && <div className="cfg-circle-check-inner" />}
                </div>
                <span>Số ngày làm việc liên tiếp tối đa:</span>
                <input
                  type="number"
                  className="cfg-num-input"
                  value={config.maxConsecutiveDays}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setConfig({ ...config, maxConsecutiveDays: Number(e.target.value) })}
                />
                <span>giờ</span>
              </div>

              {/* Option 4 */}
              <div
                className="cfg-option-row"
                onClick={() => setConfig({ ...config, ruleWeeklyEnabled: !config.ruleWeeklyEnabled })}
              >
                <div className={`cfg-circle-check ${config.ruleWeeklyEnabled ? 'checked' : ''}`}>
                  {config.ruleWeeklyEnabled && <div className="cfg-circle-check-inner" />}
                </div>
                <span>Số ngày làm việc tối đa trong một tuần:</span>
                <input
                  type="number"
                  className="cfg-num-input"
                  value={config.maxDaysPerWeek}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setConfig({ ...config, maxDaysPerWeek: Number(e.target.value) })}
                />
                <span>ngày</span>
              </div>
            </div>
          </div>
        </div>

        {/* =================================================================
            3. Cấu hình (Shift Rules, Marketplace & Approval)
            ================================================================= */}
        <div className="cfg-block-item">
          <div className="cfg-switch-col">
            <button
              type="button"
              className={`cfg-toggle-switch ${config.configEnabled ? 'active' : ''}`}
              onClick={() => setConfig({ ...config, configEnabled: !config.configEnabled })}
              title="Bật/Tắt Cấu hình"
            >
              <div className="cfg-toggle-circle" />
            </button>
          </div>
          <div className={`cfg-block-content ${!config.configEnabled ? 'disabled' : ''}`}>
            <h2 className="cfg-block-title">Cấu hình</h2>

            {/* Hạn đăng ký ca */}
            <h3 className="cfg-sub-title">Hạn đăng ký ca</h3>
            <div className="cfg-options-list">
              <div
                className="cfg-option-row"
                onClick={() => setConfig({ ...config, cancelAdvanceEnabled: !config.cancelAdvanceEnabled })}
              >
                <div className={`cfg-circle-check ${config.cancelAdvanceEnabled ? 'checked' : ''}`}>
                  {config.cancelAdvanceEnabled && <div className="cfg-circle-check-inner" />}
                </div>
                <span>Cho phép Nhân viên đăng ký/hủy ca trống trước:</span>
                <input
                  type="number"
                  className="cfg-num-input"
                  value={config.cancelAdvanceDays}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setConfig({ ...config, cancelAdvanceDays: Number(e.target.value) })}
                />
                <span>ngày</span>
              </div>
            </div>

            {/* Trợ ca */}
            <h3 className="cfg-sub-title">Trợ ca</h3>
            <div className="cfg-options-list">
              <div
                className="cfg-option-row"
                onClick={() => setConfig({ ...config, allowMarketplace: !config.allowMarketplace })}
              >
                <div className={`cfg-circle-check ${config.allowMarketplace ? 'checked' : ''}`}>
                  {config.allowMarketplace && <div className="cfg-circle-check-inner" />}
                </div>
                <span>Cho phép đăng ca trống lên Marketplace</span>
              </div>

              <div
                className="cfg-option-row"
                onClick={() => setConfig({ ...config, allowSelfSwap: !config.allowSelfSwap })}
              >
                <div className={`cfg-circle-check ${config.allowSelfSwap ? 'checked' : ''}`}>
                  {config.allowSelfSwap && <div className="cfg-circle-check-inner" />}
                </div>
                <span>Cho phép nhân viên tự gửi yêu cầu đổi ca</span>
              </div>
            </div>

            {/* Quy trình phê duyệt */}
            <h3 className="cfg-sub-title">Quy trình phê duyệt</h3>
            <div className="cfg-options-list">
              <div
                className="cfg-option-row"
                onClick={() => setConfig({
                  ...config,
                  requireManagerApproval: !config.requireManagerApproval
                })}
              >
                <div className={`cfg-circle-check ${config.requireManagerApproval ? 'checked' : ''}`}>
                  {config.requireManagerApproval && <div className="cfg-circle-check-inner" />}
                </div>
                <span>Yêu cầu Manager phê duyệt (Approve/Reject) mọi đơn đổi ca & nhận ca trống</span>
              </div>

              <div
                className="cfg-option-row"
                onClick={() => setConfig({
                  ...config,
                  firstValidFirstServed: !config.firstValidFirstServed
                })}
              >
                <div className={`cfg-circle-check ${config.firstValidFirstServed ? 'checked' : ''}`}>
                  {config.firstValidFirstServed && <div className="cfg-circle-check-inner" />}
                </div>
                <span>Áp dụng nguyên tắc First Valid First Served cho ca trống</span>
              </div>
            </div>
          </div>
        </div>

        {/* =================================================================
            4. Điều phối (Dispatch & Cross-store Sharing)
            ================================================================= */}
        <div className="cfg-block-item">
          <div className="cfg-switch-col">
            <button
              type="button"
              className={`cfg-toggle-switch ${config.dispatchEnabled ? 'active' : ''}`}
              onClick={() => setConfig({ ...config, dispatchEnabled: !config.dispatchEnabled })}
              title="Bật/Tắt Điều phối"
            >
              <div className="cfg-toggle-circle" />
            </button>
          </div>
          <div className={`cfg-block-content ${!config.dispatchEnabled ? 'disabled' : ''}`}>
            <h2 className="cfg-block-title">Điều phối</h2>

            {/* Chia sẻ lao động */}
            <h3 className="cfg-sub-title">Chia sẻ lao động</h3>
            <div className="cfg-options-list">
              <div
                className="cfg-option-row"
                onClick={() => setConfig({ ...config, allowInterStore: !config.allowInterStore })}
              >
                <div className={`cfg-circle-check ${config.allowInterStore ? 'checked' : ''}`}>
                  {config.allowInterStore && <div className="cfg-circle-check-inner" />}
                </div>
                <span>Cho phép gửi và nhận yêu cầu hỗ trợ nhân sự với Store khác</span>
              </div>
            </div>

            {/* Ràng buộc điều phối */}
            <h3 className="cfg-sub-title">Ràng buộc điều phối</h3>
            <div className="cfg-options-list">
              <div
                className="cfg-option-row"
                onClick={() => setConfig({ ...config, skillCheckNoConflict: !config.skillCheckNoConflict })}
              >
                <div className={`cfg-circle-check ${config.skillCheckNoConflict ? 'checked' : ''}`}>
                  {config.skillCheckNoConflict && <div className="cfg-circle-check-inner" />}
                </div>
                <span>Chỉ gợi ý nhân viên thỏa kỹ năng, không trùng ca</span>
              </div>

              <div
                className="cfg-option-row"
                onClick={() => setConfig({ ...config, requireStaffConfirm: !config.requireStaffConfirm })}
              >
                <div className={`cfg-circle-check ${config.requireStaffConfirm ? 'checked' : ''}`}>
                  {config.requireStaffConfirm && <div className="cfg-circle-check-inner" />}
                </div>
                <span>Bắt buộc nhân viên phải bấm xác nhận trước khi tạo đổi</span>
              </div>
            </div>
          </div>
        </div>

        {/* =================================================================
            5. Phân quyền (Permissions & Scope)
            ================================================================= */}
        <div className="cfg-block-item">
          <div className="cfg-switch-col">
            <button
              type="button"
              className={`cfg-toggle-switch ${config.permissionEnabled ? 'active' : ''}`}
              onClick={() => setConfig({ ...config, permissionEnabled: !config.permissionEnabled })}
              title="Bật/Tắt Phân quyền"
            >
              <div className="cfg-toggle-circle" />
            </button>
          </div>
          <div className={`cfg-block-content ${!config.permissionEnabled ? 'disabled' : ''}`}>
            <h2 className="cfg-block-title">Phân quyền</h2>

            {/* Phạm vi hiển thị */}
            <h3 className="cfg-sub-title">Phạm vi hiển thị</h3>
            <div className="cfg-options-list">
              <div
                className="cfg-option-row"
                onClick={() => setConfig({ ...config, permStaff: !config.permStaff })}
              >
                <div className={`cfg-circle-check ${config.permStaff ? 'checked' : ''}`}>
                  {config.permStaff && <div className="cfg-circle-check-inner" />}
                </div>
                <span>Nhân viên (Staff) chỉ được phép xem Lịch Làm việc & Dữ Liệu cá nhân</span>
              </div>

              <div
                className="cfg-option-row"
                onClick={() => setConfig({ ...config, permManager: !config.permManager })}
              >
                <div className={`cfg-circle-check ${config.permManager ? 'checked' : ''}`}>
                  {config.permManager && <div className="cfg-circle-check-inner" />}
                </div>
                <span>Quản lý (Manager) chỉ được quyền quản lý & duyệt dữ liệu thuộc Store phụ trách</span>
              </div>

              <div
                className="cfg-option-row"
                onClick={() => setConfig({ ...config, permAdmin: !config.permAdmin })}
              >
                <div className={`cfg-circle-check ${config.permAdmin ? 'checked' : ''}`}>
                  {config.permAdmin && <div className="cfg-circle-check-inner" />}
                </div>
                <span>Quản trị viên (Admin) có toàn quyền truy cập & chỉnh sửa hệ thống</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="cfg-footer-actions">
          <button type="button" className="cfg-reset-btn" onClick={handleReset}>
            Đặt lại mặc định
          </button>
          <button
            type="button"
            className="cfg-save-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
          </button>
        </div>
      </div>
    </div>
  );
}

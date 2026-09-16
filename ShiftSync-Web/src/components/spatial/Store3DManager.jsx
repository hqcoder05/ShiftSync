import { useState, useEffect, useCallback } from 'react';
import {
  getStoreLayout,
  saveStoreLayout,
  getStoreZones,
  addStoreZone,
  deleteStoreZone,
  getStoreWorkstations,
  addStoreWorkstation,
  deleteStoreWorkstation,
  getStoreTemplates,
  applyStoreTemplate,
} from '../../services/layoutService';
import Store3DCanvas from './Store3DCanvas';
import { SPATIAL_TYPES, STORE_CATEGORIES, getZoneIcon, getZoneThemeColor } from './spatial.constants';
import { Box, Plus, Save, Compass, Trash2, Layers, Wrench, Sparkles, RefreshCw } from 'lucide-react';

/**
 * Store3DManager
 * Dedicated spatial manager for a store:
 * - Live 3D Canvas preview
 * - 1-Click Store Template Catalog (Coffee, Shoe Store, Beauty Salon, QSR...)
 * - Dimensions editor (Length, Width, Height)
 * - Dynamic Zone creator & registry (Coordinates X, Y, Z, Capacity, Type, Color)
 * - Workstations manager (Workstations within Zones)
 */
export default function Store3DManager({ storeId, storeName, showToast }) {
  const [layout, setLayout] = useState({ length: 24, width: 16, height: 5 });
  const [zones, setZones] = useState([]);
  const [workstations, setWorkstations] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('zones'); // 'zones' | 'workstations'

  // Form states - Dimensions
  const [layoutForm, setLayoutForm] = useState({ length: '24', width: '16', height: '5' });
  const [savingLayout, setSavingLayout] = useState(false);

  // Form states - Zones
  const [showAddZone, setShowAddZone] = useState(false);
  const [zoneForm, setZoneForm] = useState({
    name: '',
    code: '',
    zoneType: 'CHECKOUT',
    color: '#0284C7',
    x: '4',
    y: '3',
    z: '0',
    width: '4',
    length: '3',
    capacity: '4',
  });
  const [addingZone, setAddingZone] = useState(false);
  const [zoneError, setZoneError] = useState('');

  // Form states - Workstations
  const [showAddWs, setShowAddWs] = useState(false);
  const [wsForm, setWsForm] = useState({
    name: '',
    code: '',
    workstationType: 'POS',
    zoneId: '',
    capacity: '1',
  });
  const [addingWs, setAddingWs] = useState(false);
  const [wsError, setWsError] = useState('');

  const loadSpatialData = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const [layoutRes, zonesRes, wsRes, templatesRes] = await Promise.allSettled([
        getStoreLayout(storeId),
        getStoreZones(storeId),
        getStoreWorkstations(storeId),
        getStoreTemplates(),
      ]);

      if (layoutRes.status === 'fulfilled' && layoutRes.value?.data) {
        const d = layoutRes.value.data;
        setLayout(d);
        setLayoutForm({
          length: String(d.length || 24),
          width: String(d.width || 16),
          height: String(d.height || 5),
        });
      }
      if (zonesRes.status === 'fulfilled' && Array.isArray(zonesRes.value?.data)) {
        setZones(zonesRes.value.data);
      }
      if (wsRes.status === 'fulfilled' && Array.isArray(wsRes.value?.data)) {
        setWorkstations(wsRes.value.data);
      }
      if (templatesRes.status === 'fulfilled' && Array.isArray(templatesRes.value?.data)) {
        setTemplates(templatesRes.value.data);
        if (templatesRes.value.data.length > 0 && !selectedTemplateId) {
          setSelectedTemplateId(templatesRes.value.data[0].id);
        }
      }
    } catch (e) {
      console.info('Spatial load error:', e.message);
    } finally {
      setLoading(false);
    }
  }, [storeId, selectedTemplateId]);

  useEffect(() => {
    loadSpatialData();
  }, [loadSpatialData]);

  // Save Store Dimensions
  const handleSaveLayout = async (e) => {
    e.preventDefault();
    setSavingLayout(true);
    try {
      await saveStoreLayout(storeId, {
        length: parseFloat(layoutForm.length) || 24,
        width: parseFloat(layoutForm.width) || 16,
        height: parseFloat(layoutForm.height) || 5,
      });
      showToast?.('✓ Đã cập nhật kích thước không gian 3D');
      loadSpatialData();
    } catch {
      showToast?.('✗ Lỗi cập nhật kích thước');
    } finally {
      setSavingLayout(false);
    }
  };

  // 1-Click Apply Store Template
  const handleApplyTemplate = async () => {
    if (!selectedTemplateId) return;
    const selectedTpl = templates.find((t) => t.id === selectedTemplateId);
    const confirmMsg = `Xác nhận áp dụng mẫu "${selectedTpl?.name || 'Mẫu cửa hàng'}"?\n\nHệ thống sẽ tự động cấu hình kích thước và khởi tạo danh sách phân khu & trạm làm việc chuẩn.`;
    if (!window.confirm(confirmMsg)) return;

    setApplyingTemplate(true);
    try {
      await applyStoreTemplate(storeId, selectedTemplateId);
      showToast?.(`✓ Đã áp dụng thành công mẫu "${selectedTpl?.name || ''}"!`);
      await loadSpatialData();
    } catch (err) {
      const msg = err.response?.data?.message || 'Lỗi áp dụng mẫu cửa hàng';
      showToast?.(`✗ ${msg}`);
    } finally {
      setApplyingTemplate(false);
    }
  };

  // Add New Zone
  const handleAddZone = async (e) => {
    e.preventDefault();
    setZoneError('');
    if (!zoneForm.name.trim()) {
      setZoneError('Vui lòng nhập tên khu vực');
      return;
    }
    setAddingZone(true);
    try {
      await addStoreZone(storeId, {
        name: zoneForm.name.trim(),
        code: zoneForm.code.trim() || undefined,
        zoneType: zoneForm.zoneType,
        color: zoneForm.color,
        x: parseFloat(zoneForm.x) || 0,
        y: parseFloat(zoneForm.y) || 0,
        z: parseFloat(zoneForm.z) || 0,
        width: parseFloat(zoneForm.width) || 4,
        length: parseFloat(zoneForm.length) || 3,
        capacity: parseInt(zoneForm.capacity, 10) || 4,
      });
      showToast?.(`✓ Đã tạo khu vực 3D "${zoneForm.name.trim()}"`);
      setZoneForm({
        name: '',
        code: '',
        zoneType: 'CHECKOUT',
        color: '#0284C7',
        x: '4',
        y: '3',
        z: '0',
        width: '4',
        length: '3',
        capacity: '4',
      });
      setShowAddZone(false);
      loadSpatialData();
    } catch (err) {
      setZoneError(err.response?.data?.message || 'Lỗi tạo khu vực');
    } finally {
      setAddingZone(false);
    }
  };

  // Delete Zone
  const handleDeleteZone = async (zone) => {
    if (!window.confirm(`Xác nhận xoá khu vực "${zone.name}"?\nHành động này không thể hoàn tác.`)) return;
    try {
      await deleteStoreZone(storeId, zone.id);
      showToast?.(`✓ Đã xoá khu vực "${zone.name}"`);
      loadSpatialData();
    } catch (err) {
      const msg = err.response?.data?.message || 'Lỗi xoá khu vực';
      showToast?.(`✗ ${msg}`);
    }
  };

  // Add Workstation
  const handleAddWorkstation = async (e) => {
    e.preventDefault();
    setWsError('');
    if (!wsForm.name.trim()) {
      setWsError('Vui lòng nhập tên trạm làm việc');
      return;
    }
    setAddingWs(true);
    try {
      await addStoreWorkstation(storeId, {
        name: wsForm.name.trim(),
        code: wsForm.code.trim() || undefined,
        workstationType: wsForm.workstationType,
        zoneId: wsForm.zoneId || undefined,
        capacity: parseInt(wsForm.capacity, 10) || 1,
      });
      showToast?.(`✓ Đã thêm trạm làm việc "${wsForm.name.trim()}"`);
      setWsForm({
        name: '',
        code: '',
        workstationType: 'POS',
        zoneId: '',
        capacity: '1',
      });
      setShowAddWs(false);
      loadSpatialData();
    } catch (err) {
      setWsError(err.response?.data?.message || 'Lỗi thêm trạm làm việc');
    } finally {
      setAddingWs(false);
    }
  };

  // Delete Workstation
  const handleDeleteWs = async (ws) => {
    if (!window.confirm(`Xác nhận xoá trạm làm việc "${ws.name}"?`)) return;
    try {
      await deleteStoreWorkstation(storeId, ws.id);
      showToast?.(`✓ Đã xoá trạm làm việc "${ws.name}"`);
      loadSpatialData();
    } catch (err) {
      const msg = err.response?.data?.message || 'Lỗi xoá trạm làm việc';
      showToast?.(`✗ ${msg}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 14 }}>
      {/* 1-Click Store Template Quick Setup Banner */}
      <div style={{
        backgroundColor: '#F8FAFC',
        border: '1px solid #E2E8F0',
        borderRadius: 12,
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            backgroundColor: '#EEFAEB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10B981',
          }}>
            <Sparkles size={18} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
              Mẫu Thiết Kế Cửa Hàng Chuẩn (Store Domain Templates)
            </h4>
            <p style={{ margin: 0, fontSize: 11, color: '#64748B' }}>
              Khởi tạo ngay mô hình không gian 3D cho Coffee Shop, Cửa hàng Giày / Retail, Salon tóc & Spa...
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            disabled={templates.length === 0 || applyingTemplate}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              fontSize: 12,
              fontWeight: 600,
              color: '#1E293B',
            }}
          >
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {STORE_CATEGORIES[tpl.category]?.icon || '🏬'} {tpl.name} ({tpl.category})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleApplyTemplate}
            disabled={!selectedTemplateId || applyingTemplate}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: '#10B981',
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: 600,
              cursor: applyingTemplate ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            {applyingTemplate ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
            <span>{applyingTemplate ? 'Đang áp dụng...' : 'Áp dụng mẫu'}</span>
          </button>
        </div>
      </div>

      {/* 3D Canvas Preview Window */}
      <div style={{ height: 460, borderRadius: 14, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
        <Store3DCanvas
          layout={layout}
          zones={zones}
          staff={[]}
          storeName={storeName}
        />
      </div>

      {/* Editor Grid: Dimensions & Spatial Registry */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 320px) 1fr', gap: 18 }}>
        {/* Dimensions Configuration Form */}
        <div style={{
          backgroundColor: '#FFFFFF',
          padding: 16,
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Compass size={16} color="#10B981" />
            <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
              Kích thước Không gian {loading ? '(Đang tải...)' : ''}
            </h4>
          </div>

          <form onSubmit={handleSaveLayout} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 4 }}>
                Chiều dài X (mét)
              </label>
              <input
                type="number"
                step="0.5"
                value={layoutForm.length}
                onChange={(e) => setLayoutForm({ ...layoutForm, length: e.target.value })}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 12 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 4 }}>
                Chiều rộng Z / Độ sâu (mét)
              </label>
              <input
                type="number"
                step="0.5"
                value={layoutForm.width}
                onChange={(e) => setLayoutForm({ ...layoutForm, width: e.target.value })}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 12 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 4 }}>
                Chiều cao Y (mét)
              </label>
              <input
                type="number"
                step="0.5"
                value={layoutForm.height}
                onChange={(e) => setLayoutForm({ ...layoutForm, height: e.target.value })}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 12 }}
              />
            </div>

            <button
              type="submit"
              disabled={savingLayout}
              style={{
                marginTop: 6,
                padding: '8px 14px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: '#10B981',
                color: '#FFFFFF',
                fontSize: 12,
                fontWeight: 600,
                cursor: savingLayout ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Save size={13} />
              <span>{savingLayout ? 'Đang lưu...' : 'Lưu kích thước 3D'}</span>
            </button>
          </form>
        </div>

        {/* Spatial Registry: Zones & Workstations Tabs */}
        <div style={{
          backgroundColor: '#FFFFFF',
          padding: 16,
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
        }}>
          {/* Tabs header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, borderBottom: '1px solid #F1F5F9', paddingBottom: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setActiveTab('zones')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: activeTab === 'zones' ? '#EEFAEB' : 'transparent',
                  color: activeTab === 'zones' ? '#10B981' : '#64748B',
                  fontWeight: activeTab === 'zones' ? 700 : 500,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                <Layers size={14} />
                <span>Phân khu 3D ({zones.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('workstations')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: activeTab === 'workstations' ? '#E0F2FE' : 'transparent',
                  color: activeTab === 'workstations' ? '#0284C7' : '#64748B',
                  fontWeight: activeTab === 'workstations' ? 700 : 500,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                <Wrench size={14} />
                <span>Trạm làm việc ({workstations.length})</span>
              </button>
            </div>

            {activeTab === 'zones' ? (
              <button
                type="button"
                onClick={() => setShowAddZone(!showAddZone)}
                style={{
                  padding: '5px 10px',
                  borderRadius: 6,
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#F8FAFC',
                  color: '#10B981',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Plus size={13} />
                <span>Thêm khu vực</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddWs(!showAddWs)}
                style={{
                  padding: '5px 10px',
                  borderRadius: 6,
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#F8FAFC',
                  color: '#0284C7',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Plus size={13} />
                <span>Thêm trạm làm việc</span>
              </button>
            )}
          </div>

          {/* TAB 1: ZONES */}
          {activeTab === 'zones' && (
            <div>
              {/* Add Zone Form */}
              {showAddZone && (
                <form
                  onSubmit={handleAddZone}
                  style={{
                    backgroundColor: '#F8FAFC',
                    padding: 12,
                    borderRadius: 8,
                    border: '1px dashed #CBD5E1',
                    marginBottom: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 1fr', gap: 8 }}>
                    <div>
                      <label style={{ fontSize: 10, color: '#64748B', display: 'block', marginBottom: 2 }}>Tên khu vực</label>
                      <input
                        type="text"
                        placeholder="VD: Quầy Thu ngân / Kệ Giày"
                        value={zoneForm.name}
                        onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 11 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: '#64748B', display: 'block', marginBottom: 2 }}>Mã định danh</label>
                      <input
                        type="text"
                        placeholder="VD: Z-POS"
                        value={zoneForm.code}
                        onChange={(e) => setZoneForm({ ...zoneForm, code: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 11 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: '#64748B', display: 'block', marginBottom: 2 }}>Loại phân khu</label>
                      <select
                        value={zoneForm.zoneType}
                        onChange={(e) => setZoneForm({ ...zoneForm, zoneType: e.target.value, color: SPATIAL_TYPES[e.target.value]?.color || '#10B981' })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 11 }}
                      >
                        {Object.entries(SPATIAL_TYPES).map(([k, v]) => (
                          <option key={k} value={k}>{v.icon} {v.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: '#64748B', display: 'block', marginBottom: 2 }}>Màu hiển thị</label>
                      <input
                        type="color"
                        value={zoneForm.color}
                        onChange={(e) => setZoneForm({ ...zoneForm, color: e.target.value })}
                        style={{ width: '100%', height: 30, padding: 2, borderRadius: 6, border: '1px solid #CBD5E1', cursor: 'pointer' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                    <div>
                      <label style={{ fontSize: 10, color: '#64748B', display: 'block', marginBottom: 2 }}>Toạ độ X (m)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={zoneForm.x}
                        onChange={(e) => setZoneForm({ ...zoneForm, x: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 11 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: '#64748B', display: 'block', marginBottom: 2 }}>Toạ độ Y (m)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={zoneForm.y}
                        onChange={(e) => setZoneForm({ ...zoneForm, y: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 11 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: '#64748B', display: 'block', marginBottom: 2 }}>Cao Z (m)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={zoneForm.z}
                        onChange={(e) => setZoneForm({ ...zoneForm, z: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 11 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: '#64748B', display: 'block', marginBottom: 2 }}>Rộng x Dài (m)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={zoneForm.width}
                        onChange={(e) => setZoneForm({ ...zoneForm, width: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 11 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: '#64748B', display: 'block', marginBottom: 2 }}>Sức chứa</label>
                      <input
                        type="number"
                        min="1"
                        value={zoneForm.capacity}
                        onChange={(e) => setZoneForm({ ...zoneForm, capacity: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 11 }}
                      />
                    </div>
                  </div>

                  {zoneError && <span style={{ color: '#DC2626', fontSize: 11 }}>{zoneError}</span>}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={() => setShowAddZone(false)}
                      style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#E2E8F0', fontSize: 11, cursor: 'pointer' }}
                    >
                      Huỷ
                    </button>
                    <button
                      type="submit"
                      disabled={addingZone}
                      style={{
                        padding: '4px 12px',
                        borderRadius: 6,
                        border: 'none',
                        background: '#10B981',
                        color: '#FFF',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {addingZone ? 'Đang thêm...' : 'Lưu khu vực'}
                    </button>
                  </div>
                </form>
              )}

              {/* Zones Table */}
              {zones.length === 0 ? (
                <div style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic', padding: 16, textAlign: 'center' }}>
                  Chưa cấu hình khu vực 3D nào cho chi nhánh này. Bạn có thể bấm &quot;Áp dụng mẫu&quot; ở trên hoặc tự thêm khu vực mới.
                </div>
              ) : (
                <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', textAlign: 'left' }}>
                        <th style={{ padding: '6px 8px' }}>Tên phân khu</th>
                        <th style={{ padding: '6px 8px' }}>Loại & Mã</th>
                        <th style={{ padding: '6px 8px' }}>Toạ độ (X, Y, Z)</th>
                        <th style={{ padding: '6px 8px' }}>Sức chứa</th>
                        <th style={{ padding: '6px 8px' }}>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {zones.map((z, idx) => (
                        <tr key={z.id || idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '8px', fontWeight: 600, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{
                              display: 'inline-block',
                              width: 10,
                              height: 10,
                              borderRadius: 3,
                              backgroundColor: z.color || getZoneThemeColor(z),
                            }} />
                            <span>{getZoneIcon(z)} {z.name}</span>
                          </td>
                          <td style={{ padding: '8px', color: '#475569' }}>
                            <span style={{
                              fontSize: 10,
                              padding: '2px 6px',
                              borderRadius: 4,
                              backgroundColor: '#F1F5F9',
                              color: '#334155',
                              fontWeight: 600,
                            }}>
                              {z.zoneType || 'CUSTOM'}
                            </span>
                            {z.code ? ` (${z.code})` : ''}
                          </td>
                          <td style={{ padding: '8px', color: '#475569' }}>
                            {z.x}m, {z.y}m, {z.z}m {z.z > 0 ? '(Gác lửng)' : ''}
                          </td>
                          <td style={{ padding: '8px', color: '#0F172A', fontWeight: 600 }}>{z.capacity || 4} người</td>
                          <td style={{ padding: '8px' }}>
                            <button
                              type="button"
                              onClick={() => handleDeleteZone(z)}
                              title={`Xoá khu vực ${z.name}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '3px 8px',
                                borderRadius: 5,
                                border: '1px solid #FECACA',
                                backgroundColor: '#FFF5F5',
                                color: '#DC2626',
                                fontSize: 10,
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              <Trash2 size={11} />
                              Xoá
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: WORKSTATIONS */}
          {activeTab === 'workstations' && (
            <div>
              {/* Add Workstation Form */}
              {showAddWs && (
                <form
                  onSubmit={handleAddWorkstation}
                  style={{
                    backgroundColor: '#F8FAFC',
                    padding: 12,
                    borderRadius: 8,
                    border: '1px dashed #CBD5E1',
                    marginBottom: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 1.5fr 1fr', gap: 8 }}>
                    <div>
                      <label style={{ fontSize: 10, color: '#64748B', display: 'block', marginBottom: 2 }}>Tên trạm</label>
                      <input
                        type="text"
                        placeholder="VD: Máy POS 01 / Bàn Pha Chế 01"
                        value={wsForm.name}
                        onChange={(e) => setWsForm({ ...wsForm, name: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 11 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: '#64748B', display: 'block', marginBottom: 2 }}>Mã trạm</label>
                      <input
                        type="text"
                        placeholder="VD: WS-01"
                        value={wsForm.code}
                        onChange={(e) => setWsForm({ ...wsForm, code: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 11 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: '#64748B', display: 'block', marginBottom: 2 }}>Loại trạm</label>
                      <input
                        type="text"
                        placeholder="VD: POS / COUNTER / DISPLAY / CHAIR"
                        value={wsForm.workstationType}
                        onChange={(e) => setWsForm({ ...wsForm, workstationType: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 11 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: '#64748B', display: 'block', marginBottom: 2 }}>Thuộc phân khu</label>
                      <select
                        value={wsForm.zoneId}
                        onChange={(e) => setWsForm({ ...wsForm, zoneId: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 11 }}
                      >
                        <option value="">-- Không gán cố định --</option>
                        {zones.map((z) => (
                          <option key={z.id} value={z.id}>{z.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: '#64748B', display: 'block', marginBottom: 2 }}>Sức chứa</label>
                      <input
                        type="number"
                        min="1"
                        value={wsForm.capacity}
                        onChange={(e) => setWsForm({ ...wsForm, capacity: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 11 }}
                      />
                    </div>
                  </div>

                  {wsError && <span style={{ color: '#DC2626', fontSize: 11 }}>{wsError}</span>}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={() => setShowAddWs(false)}
                      style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#E2E8F0', fontSize: 11, cursor: 'pointer' }}
                    >
                      Huỷ
                    </button>
                    <button
                      type="submit"
                      disabled={addingWs}
                      style={{
                        padding: '4px 12px',
                        borderRadius: 6,
                        border: 'none',
                        background: '#0284C7',
                        color: '#FFF',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {addingWs ? 'Đang thêm...' : 'Lưu trạm'}
                    </button>
                  </div>
                </form>
              )}

              {/* Workstations Table */}
              {workstations.length === 0 ? (
                <div style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic', padding: 16, textAlign: 'center' }}>
                  Chưa có trạm làm việc nào. Bấm &quot;Thêm trạm làm việc&quot; hoặc áp dụng mẫu cửa hàng để tự động khởi tạo.
                </div>
              ) : (
                <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', textAlign: 'left' }}>
                        <th style={{ padding: '6px 8px' }}>Tên trạm</th>
                        <th style={{ padding: '6px 8px' }}>Loại & Mã</th>
                        <th style={{ padding: '6px 8px' }}>Phân khu trực thuộc</th>
                        <th style={{ padding: '6px 8px' }}>Sức chứa</th>
                        <th style={{ padding: '6px 8px' }}>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workstations.map((ws, idx) => {
                        const parentZone = zones.find((z) => z.id === ws.zoneId);
                        return (
                          <tr key={ws.id || idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '8px', fontWeight: 600, color: '#1E293B' }}>{ws.name}</td>
                            <td style={{ padding: '8px', color: '#475569' }}>
                              <span style={{
                                fontSize: 10,
                                padding: '2px 6px',
                                borderRadius: 4,
                                backgroundColor: '#E0F2FE',
                                color: '#0284C7',
                                fontWeight: 600,
                              }}>
                                {ws.workstationType || 'GENERIC'}
                              </span>
                              {ws.code ? ` (${ws.code})` : ''}
                            </td>
                            <td style={{ padding: '8px', color: '#475569' }}>
                              {parentZone ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  {getZoneIcon(parentZone)} {parentZone.name}
                                </span>
                              ) : (
                                <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>Không cố định</span>
                              )}
                            </td>
                            <td style={{ padding: '8px', color: '#0F172A', fontWeight: 600 }}>{ws.capacity || 1} người</td>
                            <td style={{ padding: '8px' }}>
                              <button
                                type="button"
                                onClick={() => handleDeleteWs(ws)}
                                title={`Xoá trạm ${ws.name}`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '3px 8px',
                                  borderRadius: 5,
                                  border: '1px solid #FECACA',
                                  backgroundColor: '#FFF5F5',
                                  color: '#DC2626',
                                  fontSize: 10,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                <Trash2 size={11} />
                                Xoá
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

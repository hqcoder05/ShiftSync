import { useEffect, useRef, useState } from 'react';
import {
  getShiftTemplates,
  createShiftTemplate,
  updateShiftTemplate,
  deleteShiftTemplate,
} from '../services/templateService';
import { useToast } from '../context/toastContextValue.js';
import { useConfirmation } from '../context/ConfirmationContext';
import './shift-templates.css';

export default function ShiftTemplatesPage() {
  const [storeId, setStoreId] = useState(() => localStorage.getItem('selectedStoreId') || '');
  useEffect(() => {
    const update = () => setStoreId(localStorage.getItem('selectedStoreId') || '');
    window.addEventListener('storeChanged', update);
    return () => window.removeEventListener('storeChanged', update);
  }, []);
  return <TemplateList key={storeId} storeId={storeId} />;
}

function TemplateList({ storeId }) {
  const toast = useToast(), controller = useRef(null);
  const confirm = useConfirmation();
  const [items, setItems] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [busy, setBusy] = useState(false), [retry, setRetry] = useState(0);
  const [form, setForm] = useState(null);
  const [formError, setFormError] = useState('');
  const activeItems = items.filter((item) => item.isActive !== false);
  const insideOperatingHours = activeItems.filter((item) => item.isWithinOperatingHours === true).length;
  const outsideOperatingHours = activeItems.filter((item) => item.isWithinOperatingHours === false).length;

  useEffect(() => {
    const abort = new AbortController();
    controller.current = abort;
    if (!storeId) return () => abort.abort();

    getShiftTemplates(storeId, { signal: abort.signal })
      .then(({ data }) => {
        if (!abort.signal.aborted) {
          setItems(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!abort.signal.aborted) {
          setError(e.response?.data?.message || 'Không tải được mẫu ca.');
          setLoading(false);
        }
      });
    return () => abort.abort();
  }, [storeId, retry]);

  const refresh = () => {
    setError('');
    setLoading(true);
    setRetry((n) => n + 1);
  };

  const save = async (event) => {
    event.preventDefault();
    if (busy) return;
    setFormError('');
    if (!form.name.trim()) {
      setFormError('Nhập tên để nhận diện mẫu ca này.');
      return;
    }
    setBusy(true);
    try {
      const body = { name: form.name.trim(), startTime: form.startTime, endTime: form.endTime };
      const config = { signal: controller.current.signal };
      if (form.id) {
        await updateShiftTemplate(storeId, form.id, body, config);
      } else {
        await createShiftTemplate(storeId, body, config);
      }
      if (controller.current.signal.aborted) return;
      setForm(null);
      toast.success('Đã lưu mẫu ca.');
      refresh();
    } catch (e) {
      if (!controller.current.signal.aborted) {
        const message = e.response?.data?.message || e.message || 'Không lưu được mẫu ca.';
        setFormError(message);
        toast.error(message);
      }
    } finally {
      if (!controller.current.signal.aborted) setBusy(false);
    }
  };

  const remove = async (item) => {
    if (busy || !(await confirm({ message: `Xóa mẫu ca “${item.name}”? Các ca đã tạo không bị xóa.`, confirmLabel: 'Xóa' }))) return;
    setBusy(true);
    try {
      await deleteShiftTemplate(storeId, item.id, { signal: controller.current.signal });
      if (!controller.current.signal.aborted) {
        toast.success('Đã xóa mẫu ca.');
        refresh();
      }
    } catch (e) {
      if (!controller.current.signal.aborted) {
        toast.error(e.response?.data?.message || 'Không xóa được mẫu ca.');
      }
    } finally {
      if (!controller.current.signal.aborted) setBusy(false);
    }
  };

  return (
    <div className="st-page">
      <header className="st-hero">
        <div className="st-hero-copy">
          <p className="st-eyebrow">THƯ VIỆN VẬN HÀNH</p>
          <h1>Mẫu ca làm việc</h1>
          <p>Chuẩn hóa khung giờ thường dùng để tạo lịch nhanh, nhất quán và dễ kiểm soát.</p>
        </div>
        <button
          type="button"
          className="st-primary-button"
          disabled={!storeId || busy}
          onClick={() => { setFormError(''); setForm({ name: '', startTime: '08:00', endTime: '16:00' }); }}
        >
          Tạo mẫu ca
        </button>
      </header>

      <section className="st-overview" aria-label="Tóm tắt mẫu ca">
        <div className="st-overview-lead"><span className="st-overview-label">Mẫu đang dùng</span><strong>{activeItems.length}</strong><span>mẫu ca sẵn sàng áp dụng</span></div>
        <dl className="st-overview-list"><div><dt>Trong giờ hoạt động</dt><dd>{insideOperatingHours}</dd></div><div><dt>Cần rà soát</dt><dd>{outsideOperatingHours}</dd></div></dl>
      </section>

      {form && (
        <form className="st-form" onSubmit={save} noValidate>
          <div className="st-form-heading"><div><p className="st-eyebrow">{form.id ? 'CẬP NHẬT MẪU' : 'MẪU MỚI'}</p><h2>{form.id ? 'Điều chỉnh khung giờ' : 'Tạo khung giờ thường dùng'}</h2><p>Thông tin này chỉ là mẫu; các ca đã tạo sẽ không tự thay đổi.</p></div><div className="st-duration-preview"><span>Thời lượng</span><strong>{formatDuration(form.startTime, form.endTime)}</strong></div></div>
          <div className="st-fields">
            <label className="st-name-field">
              <span>Tên mẫu <b aria-hidden="true">*</b></span>
              <input
                required
                maxLength={120}
                value={form.name}
                disabled={busy}
                placeholder="Ví dụ: Ca sáng"
                onChange={(e) => { setFormError(''); setForm({ ...form, name: e.target.value }); }}
              />
              <small>Hiển thị khi lập lịch và phân công ca.</small>
            </label>
            <label>
              <span>Bắt đầu</span>
              <input
                type="time"
                required
                value={form.startTime}
                disabled={busy}
                onChange={(e) => { setFormError(''); setForm({ ...form, startTime: e.target.value }); }}
              />
            </label>
            <label>
              <span>Kết thúc</span>
              <input
                type="time"
                required
                value={form.endTime}
                disabled={busy}
                onChange={(e) => { setFormError(''); setForm({ ...form, endTime: e.target.value }); }}
              />
            </label>
          </div>
          {formError && <p className="st-form-error" role="alert">{formError}</p>}
          <div className="st-actions">
            <button type="button" className="st-secondary-button" disabled={busy} onClick={() => { setFormError(''); setForm(null); }}>
              Hủy
            </button>
            <button type="submit" className="st-primary-button" disabled={busy}>
              {busy ? 'Đang lưu…' : 'Lưu mẫu ca'}
            </button>
          </div>
        </form>
      )}

      {!storeId ? (
        <section className="st-state st-state--empty"><p className="st-state-kicker">CHƯA CÓ NGỮ CẢNH</p><h2>Chọn một chi nhánh để mở thư viện mẫu ca</h2><p>Mẫu ca được quản lý riêng cho từng chi nhánh để luôn phù hợp giờ hoạt động thực tế.</p></section>
      ) : loading ? (
        <section className="st-loading" role="status" aria-label="Đang tải mẫu ca">{[0, 1, 2].map((index) => <div className="st-skeleton-row" key={index}><i /><span /><span /><b /></div>)}</section>
      ) : error ? (
        <section className="st-state st-state--error" role="alert"><p className="st-state-kicker">KHÔNG THỂ TẢI DỮ LIỆU</p><h2>Mẫu ca chưa sẵn sàng</h2><p>{error}</p><button type="button" className="st-secondary-button" onClick={refresh}>Tải lại</button></section>
      ) : (
        <div className="st-table">
          <table>
            <thead>
              <tr>
                <th>Tên mẫu</th>
                <th>Khung giờ</th>
                <th>Giờ hoạt động</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {activeItems.map((item) => (
                <tr key={item.id}>
                  <td><strong className="st-template-name">{item.name}</strong><span className="st-template-duration">{formatDuration(item.startTime, item.endTime)}</span></td>
                  <td><span className="st-time-range">{item.startTime?.slice(0, 5)} <i aria-hidden="true" /> {item.endTime?.slice(0, 5)}</span></td>
                  <td>
                    <span className={`st-status st-status--${item.isWithinOperatingHours === false ? 'review' : item.isWithinOperatingHours === true ? 'ready' : 'unknown'}`}>{item.isWithinOperatingHours === false ? 'Cần rà soát giờ hoạt động' : item.isWithinOperatingHours === true ? 'Trong giờ hoạt động' : 'Chưa đối chiếu giờ hoạt động'}</span>
                  </td>
                  <td>
                    <div className="st-actions">
                      <button
                        type="button"
                        className="st-secondary-button"
                        disabled={busy}
                        onClick={() => {
                          setFormError(''); setForm({
                            ...item,
                            startTime: item.startTime.slice(0, 5),
                            endTime: item.endTime.slice(0, 5),
                          });
                        }
                        }
                      >
                        Sửa
                      </button>
                      <button type="button" className="st-danger-button" disabled={busy} onClick={() => remove(item)}>
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!activeItems.length && (
            <div className="st-empty-table"><p className="st-state-kicker">THƯ VIỆN ĐANG TRỐNG</p><h2>Bắt đầu bằng khung giờ phổ biến nhất</h2><p>Tạo ca sáng, ca chiều hoặc ca đóng cửa để rút ngắn thao tác lập lịch hằng tuần.</p><button type="button" className="st-primary-button" disabled={busy} onClick={() => { setFormError(''); setForm({ name: '', startTime: '08:00', endTime: '16:00' }); }}>Tạo mẫu ca đầu tiên</button></div>
          )}
        </div>
      )}
    </div>
  );
}

function formatDuration(startTime, endTime) {
  const toMinutes = (value) => {
    const [hour = 0, minute = 0] = String(value || '').slice(0, 5).split(':').map(Number);
    return hour * 60 + minute;
  };
  let minutes = toMinutes(endTime) - toMinutes(startTime);
  if (minutes <= 0) minutes += 24 * 60;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} giờ ${remainder} phút` : `${hours} giờ`;
}

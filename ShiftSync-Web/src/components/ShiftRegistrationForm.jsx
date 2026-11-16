import { useEffect } from 'react';
import { vietnamDate } from '../utils/marketplaceTime.js';

export default function ShiftRegistrationForm({
  modalRef, mode, form, setForm, employees, skills, colors, store, templates,
  templateState, config, error, saving, onClose, onSubmit, onDelete,
  onEmployeeChange, onSkillChange, onSettings, onShowQr,
  assignmentLocked = false, roleLocked = false,
}) {
  useEffect(() => {
    if (error) modalRef.current?.querySelector('.sr-body')?.scrollTo({ top: 0 });
  }, [error, modalRef]);

  const duration = ((Number(form.endTime?.slice(0, 2)) * 60 + Number(form.endTime?.slice(3, 5)))
    - (Number(form.startTime?.slice(0, 2)) * 60 + Number(form.startTime?.slice(3, 5)))) / 60;
  const durationText = Number.isFinite(duration) && duration > 0
    ? `${duration.toLocaleString('vi-VN')} giờ`
    : 'Kiểm tra khung giờ';
  const palette = [...new Set([...colors, form.color].filter(Boolean))];
  const isEditing = mode === 'edit';
  const selectedEmployee = employees.find(item => String(item.staffId || item.id) === String(form.staffId));
  const employeeSkillIds = new Set((selectedEmployee?.skills || []).map(item =>
    String(typeof item === 'object' ? (item.id ?? item.skillId) : item)
  ));
  const eligibleSkills = skills.filter(skill => employeeSkillIds.has(String(skill.id)));
  const skillHint = !form.staffId
    ? 'Chọn nhân viên trước để xem vị trí phù hợp.'
    : eligibleSkills.length
      ? `${eligibleSkills.length} vị trí theo kỹ năng đã gán cho nhân viên.`
      : 'Nhân viên chưa được gán kỹ năng tại chi nhánh này.';

  return (
    <form ref={modalRef} className="sch-modal sr-form" role="dialog" aria-modal="true" aria-labelledby="sr-title" onClick={e => e.stopPropagation()} onSubmit={onSubmit}>
      <header className="sr-header">
        <div className="sr-header-copy">
          <p className="sr-eyebrow">{isEditing ? 'CẬP NHẬT CA LÀM VIỆC' : 'LỊCH NHÁP MỚI'}</p>
          <h2 id="sr-title">{isEditing ? 'Sửa ca làm việc' : 'Tạo lịch làm việc'}</h2>
          <p className="sr-branch">{store?.name || 'Chi nhánh đang chọn'}</p>
        </div>
        <button className="sr-close" type="button" aria-label="Đóng tạo lịch" disabled={saving} onClick={onClose}>Đóng</button>
      </header>

      <div className="sr-body">
        {error && <p role="alert" className="sr-error">{error}</p>}

        <section className="sr-section" aria-label="Thông tin ca">
          <div className="sr-section-heading">
            <div>
              <p className="sr-section-eyebrow">THIẾT LẬP CA</p>
              <h3>Phân công và thời gian</h3>
            </div>
            <span className="sr-duration">{durationText}</span>
          </div>
          <div className="sr-grid">
            <label><span>Nhân viên</span>
              <select aria-label="Nhân viên" value={form.staffId} disabled={saving || assignmentLocked} onChange={e => onEmployeeChange(e.target.value)}>
                <option value="" disabled={isEditing && !!form.staffId}>Chưa phân công nhân viên</option>
                {employees.map(item => <option key={item.staffId || item.id} value={item.staffId || item.id}>{item.staffFullName || item.fullName}</option>)}
              </select>
            </label>
            <label><span>Ngày làm việc</span>
              <input aria-label="Ngày làm việc" required type="date" min={!isEditing ? vietnamDate() : undefined} value={form.shiftDate} disabled={saving} onChange={e => setForm({ ...form, shiftDate: e.target.value })} />
            </label>
            <label><span>Điền giờ từ mẫu</span>
              <select aria-label="Điền giờ từ mẫu" value={form.shiftTemplateId || ''} disabled={saving || templateState !== 'ready'} onChange={e => {
                const template = templates.find(t => t.id === e.target.value);
                setForm({ ...form, shiftTemplateId: e.target.value, ...(template ? { startTime: template.startTime.slice(0, 5), endTime: template.endTime.slice(0, 5) } : {}) });
              }}>
                <option value="">{templateState === 'loading' ? 'Đang tải mẫu…' : 'Tùy chỉnh thời gian'}</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name} · {t.startTime.slice(0, 5)}–{t.endTime.slice(0, 5)}</option>)}
              </select>
              <small>{templateState === 'error' ? 'Không tải được mẫu ca. Bạn vẫn có thể nhập giờ thủ công.' : templateState === 'ready' && !templates.length ? 'Chưa có mẫu ca tại chi nhánh này.' : ''}</small>
            </label>
            <label><span>Vị trí làm việc</span>
              <select aria-label="Vị trí làm việc" value={form.location} disabled={saving || roleLocked} onChange={e => onSkillChange(e.target.value)}>
                <option value="">{form.staffId ? 'Chọn vị trí có kỹ năng' : 'Chọn nhân viên trước'}</option>
                {eligibleSkills.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <small>{skillHint}</small>
            </label>
            <label><span>Giờ bắt đầu</span>
              <input aria-label="Giờ bắt đầu" required type="time" value={form.startTime} disabled={saving} onChange={e => setForm({ ...form, startTime: e.target.value, shiftTemplateId: '' })} />
            </label>
            <label><span>Giờ kết thúc</span>
              <input aria-label="Giờ kết thúc" required type="time" value={form.endTime} disabled={saving} onChange={e => setForm({ ...form, endTime: e.target.value, shiftTemplateId: '' })} />
            </label>
          </div>
          {roleLocked && <p className="sr-note">Vị trí được giữ theo định biên và phân công hiện tại. Thay đổi tại Định biên hoặc chi tiết phân công.</p>}
          {assignmentLocked && <p className="sr-note">Ca có nhiều nhân viên. Quản lý từng người tại chi tiết phân công.</p>}
          {isEditing && form.shiftDate < vietnamDate() && <p className="sr-note">Bạn đang chỉnh sửa ca trong quá khứ. Các ràng buộc khóa lịch và bảng lương vẫn được hệ thống kiểm tra khi lưu.</p>}
        </section>

        <section className="sr-section">
          <div className="sr-section-heading sr-section-heading--simple"><div><p className="sr-section-eyebrow">NHẬN DIỆN</p><h3>Màu hiển thị trên lịch</h3></div></div>
          <div className="sr-colors" role="group" aria-label="Màu trên lịch">
            {palette.map((color, index) => <button key={color} type="button" aria-label={`Màu lịch ${index + 1}`} aria-pressed={form.color === color} disabled={saving} style={{ backgroundColor: color }} onClick={() => setForm({ ...form, color })} />)}
          </div>
          <p className="sr-note">Màu giúp nhận diện nhanh ca trên lịch. Bạn có thể thay đổi riêng cho ca này.</p>
        </section>

        <section className="sr-section">
          <div className="sr-section-heading sr-section-heading--simple"><div><p className="sr-section-eyebrow">BÀN GIAO</p><h3>Ghi chú</h3></div></div>
          <label className="sr-note-field"><span className="sr-sr-only">Ghi chú ca làm việc</span>
            <textarea aria-label="Ghi chú ca làm việc" maxLength={500} rows={2} value={form.note} disabled={saving} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Thông tin bàn giao hoặc lưu ý cho ca…" />
          </label>
          <span className="sr-note-count">{form.note.length}/500</span>
        </section>

        <details className="sr-attendance">
          <summary>Chấm công theo chi nhánh</summary>
          <p>Áp dụng cấu hình chung của chi nhánh, không thiết lập riêng trên từng ca.</p>
          {config ? <dl><div><dt>GPS khi vào ca</dt><dd>{config.requireGpsForCheckin == null ? 'Chưa có thông tin' : config.requireGpsForCheckin ? 'Bắt buộc' : 'Không bắt buộc'}</dd></div><div><dt>Bán kính chấm công</dt><dd>{config.geofenceRadiusM != null ? `${config.geofenceRadiusM} mét` : 'Chưa có thông tin'}</dd></div></dl> : <p>Chưa tải được thông tin cấu hình chấm công.</p>}
          <button type="button" disabled={saving} onClick={onSettings}>Mở cấu hình chi nhánh</button>
        </details>
      </div>

      <footer className="sr-footer">
        {isEditing ? <div className="sr-footer-secondary"><button type="button" className="sr-delete" disabled={saving} onClick={onDelete}>Xóa ca</button>{onShowQr && <button type="button" className="sr-qr-btn" disabled={saving} onClick={onShowQr}>Mã QR điểm danh</button>}</div> : <small>Lưu vào lịch nháp của chi nhánh. Bạn có thể tiếp tục điều chỉnh trước khi xuất bản.</small>}
        <div className="sr-footer-actions"><button type="button" disabled={saving} onClick={onClose}>Hủy</button><button type="submit" className="sr-save" disabled={saving}>{saving ? 'Đang lưu…' : isEditing ? 'Cập nhật' : 'Lưu lịch làm việc'}</button></div>
      </footer>
    </form>
  );
}

import {useEffect, useMemo, useRef, useState} from 'react';
import Store3DCanvas from '../../components/spatial/Store3DCanvas.jsx';
import {autoScheduleShifts, getShiftsForStore} from '../../services/shiftService.js';
import {assignmentsOf} from '../schedule-planner/plannerModel.js';
import {getShiftTimeRange} from '../spatial-workspace/utils/shiftTimeRange.js';
import {assignmentChanges, replayShifts, shiftsInWindow} from './visualizationModel.js';
import './auto-scheduler.css';

export default function AutoSchedulerVisualization({snapshot, onClose, onSaved}) {
  const {storeId, storeName, storeCategory, layout, zones, employees, skills, before, startDate, endDate} = snapshot;
  const [result, setResult] = useState(null), [after, setAfter] = useState(null), [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [mode, setMode] = useState('before'), [step, setStep] = useState(0), [playing, setPlaying] = useState(false);
  const [shiftId, setShiftId] = useState(before[0]?.id || ''), [zoneId, setZoneId] = useState('');
  const [spatial, setSpatial] = useState(false);
  const lock = useRef(false), dialog = useRef(null), close = useRef(onClose);
  close.current = onClose;
  const changes = useMemo(() => after ? assignmentChanges(before, after) : [], [before, after]);
  const visible = useMemo(() => mode === 'before' || !after ? before : mode === 'after' ? after : replayShifts(before, after, changes, step), [before, after, mode, changes, step]);
  const all = [...new Map([...before, ...(after || [])].map(s => [s.id, s])).values()];
  const chosen = visible.find(s => s.id === shiftId);
  const shift = chosen || {...all.find(s => s.id === shiftId), shiftAssignments: []};
  const current = changes[step - 1];
  useEffect(() => {
    const previous = document.activeElement, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    const key = e => {
      if (e.key === 'Escape' && !lock.current) close.current();
      if (e.key !== 'Tab') return;
      const items = [...dialog.current.querySelectorAll('button:not(:disabled),select,input,textarea,a[href],summary,[tabindex]:not([tabindex="-1"])')].filter(el => el.getClientRects().length);
      const first = items[0], last = items.at(-1);
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {e.preventDefault(); last?.focus();}
      if (!e.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) {e.preventDefault(); first?.focus();}
    };
    document.addEventListener('keydown', key);
    return () => {document.body.style.overflow = overflow; document.removeEventListener('keydown', key); previous?.focus();};
  }, []);
  useEffect(() => {
    if (!playing || mode !== 'replay' || step >= changes.length) return;
    const timer = setTimeout(() => {
      setShiftId(changes[step].shiftId);
      setZoneId(changes[step].assignment.zoneId || '');
      setStep(step + 1);
      if (step + 1 >= changes.length) setPlaying(false);
    }, 900);
    return () => clearTimeout(timer);
  }, [playing, mode, step, changes]);
  async function readSaved() {
    const response = await getShiftsForStore(storeId);
    const next = shiftsInWindow(response.data, startDate, endDate);
    setAfter(next);
    setMode('after');
    setShiftId(id => next.some(s => s.id === id) ? id : next[0]?.id || before[0]?.id || '');
  }
  async function run() {
    if (lock.current || result) return;
    lock.current = true; setAttempted(true); setBusy(true); setError('');
    try {
      const response = await autoScheduleShifts(storeId, {startDate, endDate});
      // A successful POST has already persisted assignments. Never retry it to reload visualization.
      setResult(response.data || {});
      onSaved();
      try {await readSaved();} catch {setError('Lịch đã được lưu, nhưng chưa tải được phân công để so sánh. Hãy tải lại kết quả.');}
    } catch (e) {
      setError(e.response?.data?.message || 'Chưa xác nhận được kết quả xếp lịch. Kiểm tra lịch trên máy chủ trước khi chạy lại.');
    } finally {lock.current = false; setBusy(false);}
  }
  async function retryRead() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {await readSaved();} catch {setError('Chưa tải được kết quả đã lưu. Thử tải lại.');}
    finally {lock.current = false; setBusy(false);}
  }
  const name = a => a.staffName || employees.find(p => (p.staffId || p.id) === a.staffId)?.fullName || a.staffId || 'Nhân viên';
  const place = a => a.workstationName || a.zoneName || zones.find(z => z.id === a.zoneId)?.name || 'Chưa gán khu vực';
  const relevantChanges = changes.filter(c => c.shiftId === shiftId && (!zoneId || c.assignment.zoneId === zoneId));
  const shortages = (result?.shortages || []).filter(s => !shiftId || s.shiftId === shiftId);
  const active = assignmentsOf(shift);
  const rowZones = [...zones];
  for (const s of [...before, ...(after || [])]) for (const a of assignmentsOf(s)) {
    if (a.zoneId && !rowZones.some(z => z.id === a.zoneId)) rowZones.push({id:a.zoneId,name:a.zoneName || `Khu vực chưa tải (${a.zoneId})`});
  }
  const requirements = mode === 'before' ? before.find(s => s.id === shiftId)?.skillRequirements || [] : (result?.requirementCoverages || []).filter(r => r.shiftId === shiftId);
  return <div className="asv-overlay">
    <section className="asv-dialog" ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="asv-title">
      <header className="asv-header"><div><h2 id="asv-title">Trực quan xếp lịch tự động</h2><small>{storeName} · {startDate} — {endDate}</small></div><button disabled={busy} onClick={onClose} aria-label="Đóng trực quan xếp lịch">×</button></header>
      <div className="asv-toolbar">
        <div className="asv-tabs" aria-label="So sánh lịch">
          {[['before','Trước khi xếp'],['replay','Phát lại thay đổi'],['after','Kết quả đã lưu']].map(([id,label]) => <button key={id} aria-pressed={mode === id} disabled={id !== 'before' && !after} onClick={() => {setMode(id); setPlaying(false);}}>{label}</button>)}
        </div>
        {!result && !attempted && <button className="asv-primary" disabled={busy || !['ADMIN','MANAGER'].includes(localStorage.getItem('userRole'))} onClick={run}>{busy ? 'Đang chờ kết quả máy chủ…' : 'Xếp và lưu lịch'}</button>}
        {attempted && !result && <button disabled={busy} onClick={retryRead}>Kiểm tra lịch trên máy chủ</button>}
        {result && !after && <button disabled={busy} onClick={retryRead}>Tải lại kết quả đã lưu</button>}
      </div>
      <p className="asv-notice">{result ? 'Đã lưu trên máy chủ. Phát lại chỉ minh họa thay đổi từ kết quả trả về, không phải quá trình thuật toán đang tính toán.' : 'Xem các vị trí hiện tại trước khi chạy. “Xếp và lưu lịch” sẽ cập nhật lịch trên máy chủ ngay; chỉ các ca nháp được xếp tự động.'}</p>
      {error && <p className="asv-error" role="alert">{error}</p>}
      {result && <div className="asv-metrics" aria-label="Kết quả máy chủ">
        <span>Nhu cầu <b>{result.totalDemandSlots ?? '—'}</b></span><span>Đã phân công <b>{result.totalAssignedSlots ?? '—'}</b></span><span>Còn thiếu <b>{result.shortageSlots ?? '—'}</b></span><span>Độ phủ <b>{result.coverageRate != null ? `${result.coverageRate}%` : '—'}</b></span>
      </div>}
      <div className="asv-filters">
        <label>Ca làm <select aria-label="Ca trực quan" value={shiftId} onChange={e => {setShiftId(e.target.value); setZoneId(''); setPlaying(false);}}><option value="">Chọn ca</option>{all.map(s => <option key={s.id} value={s.id}>{s.shiftDate || s.date} · {s.name || 'Ca làm'} · {s.startTime?.slice(0,5)}–{s.endTime?.slice(0,5)}</option>)}</select></label>
        <label>Khu vực <select aria-label="Khu vực trực quan" value={zoneId} onChange={e => setZoneId(e.target.value)}><option value="">Tất cả khu vực</option>{zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}</select></label>
        <button aria-pressed={spatial} onClick={() => setSpatial(!spatial)}>{spatial ? 'Xem bảng vị trí' : 'Xem không gian 3D'}</button>
      </div>
      {mode === 'replay' && <div className="asv-playback">
        <button disabled={!changes.length} onClick={() => {if (step === changes.length) setStep(0); setPlaying(!playing);}}>{playing ? 'Tạm dừng' : 'Phát lại'}</button>
        <button onClick={() => {setPlaying(false);setStep(0);}}>Về đầu</button>
        <input type="range" aria-label="Bước phát lại" min="0" max={changes.length} value={step} onChange={e => {const n=Number(e.target.value);setStep(n);setPlaying(false);if(n) setShiftId(changes[n-1].shiftId);}}/>
        <span>{step}/{changes.length} thay đổi</span>
        <span role="status">{current ? `${current.type === 'added' ? 'Thêm' : 'Bỏ'} ${name(current.assignment)} · ${place(current.assignment)}` : 'Trạng thái trước khi xếp'}</span>
      </div>}
      <div className="asv-content">
        <main className="asv-main">
          {spatial && shift.id ? <div className="asv-canvas"><Store3DCanvas planningMode planningTimeMinutes={getShiftTimeRange(shift).start} onPlanningZoneSelect={z => setZoneId(z.id)} layout={layout} zones={zones} staff={active.map(a => ({...a,id:a.staffId,staffName:name(a)}))} employees={employees} skills={skills} storeId={storeId} selectedStoreId={storeId} storeName={storeName} storeCategory={storeCategory} currentShift={shift} allDateShifts={[shift]} activeDate={shift.shiftDate || shift.date}/></div> : <div className="asv-table" role="region" aria-label="So sánh phân công" tabIndex={0}><table><thead><tr><th>Khu vực / Vị trí</th><th>Trước khi xếp</th><th>{mode === 'replay' ? 'Bước hiện tại' : 'Kết quả đã lưu'}</th></tr></thead><tbody>
            {[...rowZones, {id:'',name:'Chưa gán khu vực'}].filter(z => !zoneId || z.id === zoneId).map(z => {
              const old=assignmentsOf(before.find(s => s.id === shiftId)).filter(a => (a.zoneId || '') === z.id);
              const next=assignmentsOf((mode === 'replay' ? visible : after || []).find(s => s.id === shiftId)).filter(a => (a.zoneId || '') === z.id);
              const missing=shortages.filter(s => (s.zoneId || '') === z.id).reduce((n,s) => n + (s.shortageCount || 0),0);
              return <tr key={z.id} className={missing ? 'asv-shortage' : ''}><th>{z.name}{missing > 0 && <small>Thiếu {missing} người theo kết quả máy chủ</small>}</th><td>{old.length ? old.map((a,i) => <span key={i}>{name(a)}</span>) : 'Chưa có phân công'}</td><td>{!after ? 'Chưa chạy xếp lịch' : next.length ? next.map((a,i) => <span key={i} className={changes.some(c => c.type === 'added' && c.shiftId === shiftId && c.assignment === a) ? 'asv-added' : ''}>{name(a)}{changes.some(c => c.type === 'added' && c.shiftId === shiftId && c.assignment === a) ? ' · Mới' : ''}</span>) : 'Chưa có phân công'}</td></tr>;
            })}
          </tbody></table>{!all.length && <p>Chưa có ca trong khoảng ngày này. Máy chủ có thể tạo ca từ định biên khi chạy xếp lịch.</p>}</div>}
        </main>
        <aside className="asv-details"><h3>Định biên {mode === 'before' ? 'trước khi xếp' : 'theo kết quả'}</h3>
          {requirements.length ? requirements.map((r,i) => <article key={i}><b>{r.zoneName || r.skillName || 'Vị trí'}</b><p>Cần {r.requiredStaff ?? r.requiredCount ?? '—'} · Đã có {r.assignedCount ?? '—'} · Thiếu {r.shortageCount ?? '—'}</p></article>) : <p>Chưa có chi tiết định biên cho ca này.</p>}
          <h3>Thay đổi & lý do</h3>
          {!after && <p>Kết quả và chẩn đoán sẽ xuất hiện sau khi máy chủ hoàn tất.</p>}
          {after && !relevantChanges.length && <p>Không có thay đổi phân công tại ca/khu vực này.</p>}
          {relevantChanges.map((c,i) => <details key={i} className={c.type === 'added' ? 'asv-added' : ''}><summary>{c.type === 'added' ? '+ Thêm' : '− Bỏ'} {name(c.assignment)}<small>{place(c.assignment)}</small></summary><p>{c.assignment.reason || 'Máy chủ chưa cung cấp lý do lựa chọn cho từng nhân viên.'}</p><p>Nguồn phân công: {c.assignment.source || 'Chưa cung cấp'}. Kỹ năng: {c.assignment.skillName || 'Chưa cung cấp'}.</p></details>)}
          <h3>Vị trí còn thiếu</h3>
          {shortages.map((s,i) => <article className="asv-shortage" key={i}><b>{s.zoneName || s.workstationName || s.skillName || 'Chưa xác định khu vực'}</b><p>Thiếu {s.shortageCount} · Đã có {s.assignedCount}/{s.requiredCount}</p><small>{s.diagnosticDetails || s.primaryReason || 'Máy chủ chưa cung cấp chẩn đoán.'}</small></article>)}
          {result && !shortages.length && <p>Không có chi tiết thiếu người cho ca đang chọn.</p>}
          <details><summary>Ràng buộc & nguồn dữ liệu</summary><p>Khả dụng, trùng ca, kỹ năng, giờ nghỉ và hạn mức hợp đồng được xử lý bởi bộ xếp lịch phía máy chủ. API hiện chưa trả dấu vết kiểm tra từng ràng buộc cho từng nhân viên.</p><p>Thứ tự phát lại do giao diện sắp xếp để dễ xem; không thể hiện thứ tự thuật toán tìm lời giải.</p>{result?.message && <p>{result.message}</p>}{result?.spatialAllocationStatus && <p>Phân bổ không gian: {result.spatialAllocationStatus}</p>}</details>
        </aside>
      </div>
    </section>
  </div>;
}

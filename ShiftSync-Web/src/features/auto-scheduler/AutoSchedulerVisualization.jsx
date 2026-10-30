import {useEffect, useMemo, useRef, useState} from 'react';
import Store3DCanvas from '../../components/spatial/Store3DCanvas.jsx';
import {autoScheduleShifts, applyAutoSchedulePlan, getShiftsForStore} from '../../services/shiftService.js';
import {assignmentsOf} from '../schedule-planner/plannerModel.js';
import {getShiftTimeRange} from '../spatial-workspace/utils/shiftTimeRange.js';
import {assignmentChanges, replayShifts, shiftsInWindow, previewShifts} from './visualizationModel.js';
import './auto-scheduler.css';

export default function AutoSchedulerVisualization({snapshot, onClose, onSaved, onReplayOnBoard}) {
  const {storeId, storeName, storeCategory, layout, zones, employees, skills, before, startDate, endDate, replayOnBoard} = snapshot;
  const [result, setResult] = useState(null), [after, setAfter] = useState(null), [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [mode, setMode] = useState('before'), [step, setStep] = useState(0), [playing, setPlaying] = useState(false);
  const [shiftId, setShiftId] = useState(before[0]?.id || ''), [zoneId, setZoneId] = useState('');
  const [spatial, setSpatial] = useState(false);
  const [planInvalid, setPlanInvalid] = useState(false);
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
  async function readSaved(openBoard = false) {
    const response = await getShiftsForStore(storeId);
    const next = shiftsInWindow(response.data, startDate, endDate);
    const nextChanges = assignmentChanges(before, next);
    if (openBoard && nextChanges.length && onReplayOnBoard) {
      onReplayOnBoard({before, after: next, startDate});
      return;
    }
    setAfter(next);
    setSpatial(true);
    if (nextChanges.length) {
      const first = nextChanges[0];
      setMode('replay');
      setStep(0);
      setShiftId(first.shiftId);
      setZoneId(first.assignment.zoneId || '');
      setPlaying(true);
    } else {
      setMode('after');
      setPlaying(false);
      setShiftId(id => next.some(s => s.id === id) ? id : next[0]?.id || before[0]?.id || '');
    }
  }
  async function run(dryRun = false) {
    if (lock.current || (result && !result.dryRun)) return;
    lock.current = true; setAttempted(true); setBusy(true); setError('');
    try {
      const response = await autoScheduleShifts(storeId, {startDate, endDate, dryRun});
      const nextResult = response.data || {};
      setResult(nextResult);
      setPlanInvalid(false);
      if (dryRun) {
        setStep(0); setPlaying(false); setSpatial(false);
        try {
          const planned=previewShifts(before,nextResult,startDate,endDate,storeId);
          setAfter(planned);setMode('after');setShiftId(nextResult.plannedShifts[0]?.id || planned[0]?.id || '');
        } catch (previewError) {
          setAfter(null);setMode('before');setError(previewError.message);
        }
      } else {
        // A successful persistent POST has already saved assignments. Never retry it to reload visualization.
        await onSaved();
        try {await readSaved(replayOnBoard);} catch {setError('Lịch đã được lưu, nhưng chưa tải được phân công để so sánh. Hãy tải lại kết quả.');}
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Chưa xác nhận được kết quả xếp lịch. Kiểm tra lịch trên máy chủ trước khi chạy lại.');
    } finally {lock.current = false; setBusy(false);}
  }
  async function applyPreview() {
    if(lock.current || !result?.dryRun || !result.planId || planInvalid) return;
    lock.current=true;setBusy(true);setError('');
    try {
      const response=await applyAutoSchedulePlan(storeId,result.planId);
      setResult(response.data);
      await onSaved();
      try {await readSaved(replayOnBoard);} catch {setError('Phương án đã được lưu, nhưng chưa tải lại được lịch. Hãy tải lại kết quả.');}
    } catch(error) {
      if([404,409].includes(error.response?.status)) setPlanInvalid(true);
      setError(error.response?.data?.message || 'Chưa xác nhận được việc lưu. Bạn có thể thử áp dụng lại cùng phương án để kiểm tra kết quả.');
    } finally {lock.current=false;setBusy(false);}
  }
  async function retryRead() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {await readSaved(Boolean(result && !result.dryRun && replayOnBoard));} catch {setError('Chưa tải được kết quả đã lưu. Thử tải lại.');}
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
  const requirements = !result || mode === 'before' ? before.find(s => s.id === shiftId)?.skillRequirements || [] : (result?.requirementCoverages || []).filter(r => r.shiftId === shiftId);
  return <div className="asv-overlay">
    <section className="asv-dialog" ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="asv-title">
      <header className="asv-header"><div><h2 id="asv-title">Kết quả xếp lịch tự động</h2><small>{storeName} · {startDate} — {endDate}</small></div><button disabled={busy} onClick={onClose} aria-label="Đóng kết quả xếp lịch">×</button></header>
      <div className="asv-toolbar">
        <div className="asv-tabs" aria-label="So sánh lịch">
          {[['before','Lịch hiện tại'],['replay',result?.dryRun ? 'Phát phương án thử' : 'Animation xếp ca'],['after',result?.dryRun ? 'Phương án thử' : 'Lịch đã lưu']].map(([id,label]) => <button key={id} aria-pressed={mode === id} disabled={id !== 'before' && !after} onClick={() => {setMode(id); setPlaying(false); if(id === 'replay'){setSpatial(true);setStep(0);if(changes[0]){setShiftId(changes[0].shiftId);setZoneId(changes[0].assignment.zoneId||'');}}}}>{label}</button>)}
        </div>
        {!result && !attempted && <div className="asv-run-actions"><button disabled={busy || !['ADMIN','MANAGER'].includes(localStorage.getItem('userRole'))} onClick={() => run(true)}>{busy ? 'Đang thử phương án…' : 'Thử phương án'}</button><button className="asv-primary" disabled={busy || !['ADMIN','MANAGER'].includes(localStorage.getItem('userRole'))} onClick={() => run(false)}>Xếp & lưu</button></div>}
        {result?.dryRun && <><button disabled={busy} onClick={() => run(true)}>Tạo bản xem trước mới</button><button className="asv-primary" disabled={busy || planInvalid || !result.planId || !after || !['ADMIN','MANAGER'].includes(localStorage.getItem('userRole'))} onClick={applyPreview}>{busy ? 'Đang xử lý…' : 'Áp dụng phương án này'}</button></>}
        {attempted && !result && <button disabled={busy} onClick={retryRead}>Kiểm tra lịch trên máy chủ</button>}
        {result && !result.dryRun && !after && <button disabled={busy} onClick={retryRead}>Tải lại kết quả đã lưu</button>}
        {after && !result?.dryRun && changes.length > 0 && <button className="asv-primary" onClick={() => onReplayOnBoard?.({before, after, startDate})}>Phát trên bảng tuần</button>}
      </div>
      <p className="asv-notice">{result ? result.dryRun ? 'Đây là phương án chưa lưu vào lịch. Áp dụng sẽ lưu đúng phân công đã xem; nếu dữ liệu thay đổi, hệ thống yêu cầu tạo bản xem trước mới.' : 'Kết quả này đã được lưu trên máy chủ. Phát lại chỉ giúp đọc các thay đổi, không phải mô phỏng thuật toán.' : 'Chọn “Thử phương án” để xem tác động không lưu, hoặc “Xếp & lưu” để áp dụng ngay.'}</p>
      {result?.dryRun && result.planExpiresAt && <p className="asv-notice">Phương án có hiệu lực đến {new Date(result.planExpiresAt).toLocaleTimeString('vi-VN')}. {planInvalid ? 'Cần tạo bản xem trước mới trước khi áp dụng.' : 'Các phân công tay hiện có được giữ nguyên.'}</p>}
      {result?.availabilityToleranceMinutes != null && <p className="asv-notice">Chính sách đã dùng: {result.availabilityToleranceMinutes === 0 ? 'khớp chính xác lịch rảnh' : `dung sai ${result.availabilityToleranceMinutes} phút ở hai đầu lịch rảnh`}. Giờ ca qua đêm được chia vào từng tuần thực tế.</p>}
      {error && <p className="asv-error" role="alert">{error}</p>}
      {result && <div className="asv-metrics" aria-label="Kết quả máy chủ">
        <span>Nhu cầu <b>{result.totalDemandSlots ?? '—'}</b></span><span>Đã phân công <b>{result.totalAssignedSlots ?? '—'}</b></span><span>Còn thiếu <b>{result.shortageSlots ?? '—'}</b></span><span>Giờ nhu cầu <b>{result.feasibility?.totalDemandHours != null ? `${result.feasibility.totalDemandHours}h` : '—'}</b></span><span>Độ phủ <b>{result.coverageRate != null ? `${result.coverageRate}%` : '—'}</b></span>
      </div>}
      {result?.quality && <details className="asv-quality">
        <summary>Đánh giá phương án cuối · Còn thiếu {Number(result.quality.unfilledHours).toLocaleString('vi-VN', {maximumFractionDigits: 2})} giờ</summary>
        <div className="asv-metrics">
          <span>Giờ đã đáp ứng <b>{Number(result.quality.coveredHours).toLocaleString('vi-VN', {maximumFractionDigits: 2})}h</b></span>
          <span>Phân công AUTO giữ nguyên <b>{result.quality.autoAssignmentsKept}</b></span>
          <span>Thêm <b>{result.quality.autoAssignmentsAdded}</b></span>
          <span>Bỏ <b>{result.quality.autoAssignmentsRemoved}</b></span>
        </div>
        <p>Thay đổi được so theo người, ca, kỹ năng và vị trí. Chuyển người hoặc vị trí được tính là một lượt bỏ và một lượt thêm.</p>
        {(result.quality.monthlyLoads || []).map(month => <p key={month.month}>
          Tháng {month.month}: {month.staffCount} nhân viên · {Number(month.scheduledHours).toLocaleString('vi-VN', {maximumFractionDigits: 2})} giờ đã phân bổ trên các cửa hàng · Độ lệch tải theo hợp đồng {month.staffCount > 1 ? `${(month.normalizedLoadStdDev * 100).toLocaleString('vi-VN', {maximumFractionDigits: 2})} điểm %` : 'chưa đủ người để so sánh'}.
        </p>)}
        <p>Độ lệch là độ lệch chuẩn của tỷ lệ giờ đã phân bổ trên sức chứa tháng theo hợp đồng, gồm cả người chưa được xếp. Giá trị thấp cho biết tải gần nhau hơn; chưa điều chỉnh theo kỹ năng hay lịch rảnh. Các chỉ số này không chứng minh phương án tối ưu.</p>
      </details>}
      {(result?.validationWarnings || []).length > 0 && <section className="asv-validation-warnings" aria-label="Ca cần chỉnh sửa trước khi xếp lại">
        <strong>Ca chưa được xếp tự động</strong>
        {(result.validationWarnings || []).map((warning, index) => <p key={index}>{warning}</p>)}
      </section>}
      <div className="asv-filters">
        <label>Ca làm <select aria-label="Ca trực quan" value={shiftId} onChange={e => {setShiftId(e.target.value); setZoneId(''); setPlaying(false);}}><option value="">Chọn ca</option>{all.map(s => <option key={s.id} value={s.id}>{s.shiftDate || s.date} · {s.name || 'Ca làm'} · {s.startTime?.slice(0,5)}–{s.endTime?.slice(0,5)}</option>)}</select></label>
        <label>Khu vực <select aria-label="Khu vực trực quan" value={zoneId} onChange={e => setZoneId(e.target.value)}><option value="">Tất cả khu vực</option>{zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}</select></label>
        <button aria-pressed={spatial} onClick={() => setSpatial(!spatial)}>{spatial ? 'Xem bảng vị trí' : 'Xem không gian 3D'}</button>
      </div>
      {mode === 'replay' && <div className="asv-playback" aria-label="Điều khiển animation xếp ca">
        <button disabled={!changes.length} onClick={() => {if (step === changes.length) setStep(0); setPlaying(!playing);setSpatial(true);}}>{playing ? 'Tạm dừng' : step === changes.length ? 'Phát lại' : 'Phát animation'}</button>
        <button onClick={() => {setPlaying(false);setStep(0);}}>Về đầu</button>
        <input type="range" aria-label="Bước phát lại" min="0" max={changes.length} value={step} onChange={e => {const n=Number(e.target.value);setStep(n);setPlaying(false);if(n) setShiftId(changes[n-1].shiftId);}}/>
        <span>{step}/{changes.length} thay đổi</span>
        <span role="status">{current ? `${current.type === 'added' ? 'Thêm' : 'Bỏ'} ${name(current.assignment)} · ${place(current.assignment)}` : 'Trạng thái trước khi xếp'}</span>
      </div>}
      <div className="asv-content">
        <main className="asv-main">
          {spatial && shift.id ? <div className="asv-canvas"><Store3DCanvas planningMode planningTimeMinutes={getShiftTimeRange(shift).start} onPlanningZoneSelect={z => setZoneId(z.id)} layout={layout} zones={zones} staff={active.map(a => ({...a,id:a.staffId,staffName:name(a)}))} employees={employees} skills={skills} storeId={storeId} selectedStoreId={storeId} storeName={storeName} storeCategory={storeCategory} currentShift={shift} allDateShifts={[shift]} activeDate={shift.shiftDate || shift.date}/></div> : <div className="asv-table" role="region" aria-label="So sánh phân công" tabIndex={0}><table><thead><tr><th>Khu vực / Vị trí</th><th>Trước khi xếp</th><th>{mode === 'replay' ? 'Bước hiện tại' : result?.dryRun ? 'Tác động phương án thử' : 'Kết quả đã lưu'}</th></tr></thead><tbody>
            {[...rowZones, {id:'',name:'Chưa gán khu vực'}].filter(z => !zoneId || z.id === zoneId).map(z => {
              const old=assignmentsOf(before.find(s => s.id === shiftId)).filter(a => (a.zoneId || '') === z.id);
              const next=assignmentsOf((mode === 'replay' ? visible : after || []).find(s => s.id === shiftId)).filter(a => (a.zoneId || '') === z.id);
              const missing=shortages.filter(s => (s.zoneId || '') === z.id).reduce((n,s) => n + (s.shortageCount || 0),0);
              return <tr key={z.id} className={missing ? 'asv-shortage' : ''}><th>{z.name}{missing > 0 && <small>Thiếu {missing} người theo kết quả máy chủ</small>}</th><td>{old.length ? old.map((a,i) => <span key={i}>{name(a)}</span>) : 'Chưa có phân công'}</td><td>{!after ? result?.dryRun ? 'Chưa có phân công thử cụ thể' : 'Chưa chạy xếp lịch' : next.length ? next.map((a,i) => <span key={i} className={changes.some(c => c.type === 'added' && c.shiftId === shiftId && c.assignment === a) ? 'asv-added' : ''}>{name(a)}{changes.some(c => c.type === 'added' && c.shiftId === shiftId && c.assignment === a) ? ' · Mới' : ''}</span>) : 'Chưa có phân công'}</td></tr>;
            })}
          </tbody></table>{!all.length && <p>Chưa có ca trong khoảng ngày này. Máy chủ có thể tạo ca từ định biên khi chạy xếp lịch.</p>}</div>}
        </main>
        <aside className="asv-details"><h3>Định biên {!result || mode === 'before' ? 'trước khi xếp' : result.dryRun ? 'phương án thử' : 'theo kết quả'}</h3>
          {requirements.length ? requirements.map((r,i) => <article key={i}><b>{r.zoneName || r.skillName || 'Vị trí'}</b><p>Cần {r.requiredStaff ?? r.requiredCount ?? '—'} · Đã có {r.assignedCount ?? '—'} · Thiếu {r.shortageCount ?? '—'}</p></article>) : <p>Chưa có chi tiết định biên cho ca này.</p>}
          <h3>Thay đổi & lý do</h3>
          {result?.dryRun && <p>Danh sách dưới đây là phân công cụ thể của phương án chưa lưu vào lịch. Ca tạo từ định biên chỉ xuất hiện trong lịch chính sau khi áp dụng thành công.</p>}
          {!after && !result?.dryRun && <p>Kết quả và chẩn đoán sẽ xuất hiện sau khi máy chủ hoàn tất.</p>}
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

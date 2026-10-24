import DemandCoverage from './DemandCoverage.jsx';
import {useState,useRef,useEffect} from 'react';
import {demandStatus,demandSummary} from './demandStatus.js';

const number=value=>value==null?'—':value.toLocaleString('vi-VN');
export default function DemandDailyView({loading,error,data,onUpdateCount,onUpdateNorm,onAutoFill,onRetry,saving}) {
  const [editingNorm,setEditingNorm]=useState(null);
  const [normError,setNormError]=useState('');
  const normRef=useRef(null),normOpen=!!editingNorm;
  useEffect(()=>{
    if(!normOpen)return;
    const previous=document.activeElement;
    normRef.current?.querySelector('input')?.focus();
    return()=>{if(previous?.isConnected)previous.focus();};
  },[normOpen]);
  const normKeyboard=e=>{
    if(e.key==='Escape'){e.stopPropagation();if(!saving)setEditingNorm(null);}
    if(e.key!=='Tab')return;
    const nodes=[...normRef.current.querySelectorAll('input,button')].filter(n=>!n.disabled);
    const first=nodes[0],last=nodes.at(-1);
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
  };
  if(loading)return <div role="status" className="dp-empty-state">Đang tải định biên…</div>;
  if(error)return <div className="dp-error-card" role="alert"><h3>Không thể tải định biên</h3><p>{error}</p><button type="button" onClick={onRetry}>Thử lại</button></div>;
  if(!data)return null;
  const shifts=data.shifts||[],positions=data.positionKpis||[],stats=demandSummary(shifts);
  if(!positions.length||!shifts.length)return <div className="dp-empty-state" role="status"><h2>Chưa có dữ liệu định biên</h2><p>Chọn ngày khác hoặc kiểm tra cấu hình vị trí của chi nhánh.</p></div>;
  const edit=kpi=>{setNormError('');setEditingNorm({...kpi});};
  return <div className="dp-demand-day">
    <div className="dp-demand-intro"><strong>Nhu cầu cần bố trí</strong><span>Các con số dưới đây là chỉ tiêu cần người, chưa phải số nhân viên đã được phân công.</span></div>
    <div className="dp-demand-metrics">
      <div title="Một người ở hai ca tính hai lượt"><span>Lượt bố trí dự kiến</span><strong>{stats.slots}</strong><small>Một người ở hai ca tính hai lượt</small></div>
      <div><span>Giờ công dự kiến</span><strong>{number(stats.hours)}</strong><small>Theo số người cần × thời lượng ca</small></div>
      <div><span>Ô đạt đúng mục tiêu</span><strong>{stats.target} / {stats.total}</strong><small>{stats.within} trong giới hạn · {stats.review} cần kiểm tra</small></div>
    </div>
    <div className="dp-demand-table-scroll" role="region" aria-label="Bảng nhu cầu theo ca, cuộn ngang để xem đầy đủ" tabIndex={0}>
      <table className="dp-demand-table"><thead><tr><th scope="col">Vị trí</th>{shifts.map((shift,index)=><th scope="col" key={index}><strong>{shift.name?.replace(/\s*\(.*\)$/, '')||`Ca ${index+1}`}</strong><span>{shift.startTime?.slice(0,5)||'—'}–{shift.endTime?.slice(0,5)||'—'} · {number(shift.durationHours)} giờ</span></th>)}</tr></thead>
      <tbody>{positions.map(kpi=><tr key={kpi.positionId}><th scope="row"><div className="dp-demand-position"><strong>{kpi.positionName}</strong><button type="button" disabled={saving} onClick={()=>edit(kpi)} aria-label={`Sửa quy chuẩn ${kpi.positionName}`}>Sửa quy chuẩn</button></div></th>{shifts.map((shift,index)=>{const quota=shift.quotas?.find(q=>q.positionId===kpi.positionId),status=demandStatus(quota),disabled=saving||!quota||status.kind==='unknown';return <td key={index}><div className="dp-demand-cell"><div className="dp-demand-count"><strong>{quota?.count??'—'}</strong><span title="Hệ thống dùng quy tắc mặc định nếu chưa có chỉ tiêu đã lưu.">người cần{quota?.source==='SUGGESTED'?' · gợi ý':quota?.source==='SAVED'?' · đã lưu':''}</span><span className={`dp-demand-status is-${status.kind}`}>{status.label}</span></div><DemandCoverage quota={quota}/><div className="dp-demand-cell-bottom"><span>Mục tiêu {quota?.target??'—'} · Giới hạn {quota?.min??'—'}–{quota?.max??'—'}</span><div className="dp-demand-stepper"><button type="button" disabled={disabled||quota.count===0} aria-label={`Giảm nhu cầu ${kpi.positionName} ${shift.name}`} onClick={()=>onUpdateCount(quota.quotaId,quota.count-1,kpi.positionId,index===0?'morning':'afternoon')}>−</button><button type="button" disabled={disabled} aria-label={`Tăng nhu cầu ${kpi.positionName} ${shift.name}`} onClick={()=>onUpdateCount(quota.quotaId,quota.count+1,kpi.positionId,index===0?'morning':'afternoon')}>+</button></div></div></div></td>;})}</tr>)}</tbody></table>
    </div>
    <div className="dp-demand-review"><div><strong>{stats.review?'Có chỉ tiêu cần kiểm tra':stats.target===stats.total?'Các chỉ tiêu đã đạt đúng mục tiêu':'Các chỉ tiêu nằm trong giới hạn'}</strong></div><button type="button" disabled={saving} onClick={onAutoFill}>Điền theo quy tắc</button></div>
    {editingNorm&&<div className="dp-norm-dialog-backdrop" onClick={()=>!saving&&setEditingNorm(null)}><div ref={normRef} onKeyDown={normKeyboard} className="dp-norm-dialog-card" role="dialog" aria-modal="true" aria-label={`Quy chuẩn ${editingNorm.positionName}`} onClick={e=>e.stopPropagation()}><h3>Quy chuẩn · {editingNorm.positionName}</h3><p>Áp dụng chung cho vị trí này. Tối thiểu ≤ mục tiêu ≤ tối đa.</p><div className="dp-norm-dialog-body">{[['min','Tối thiểu'],['target','Mục tiêu'],['max','Tối đa']].map(([key,label])=><label className="dp-norm-field" key={key}>{label}<input type="number" min="0" step="1" disabled={saving} value={editingNorm[key]??''} onChange={e=>setEditingNorm({...editingNorm,[key]:e.target.value===''?'':Number(e.target.value)})}/></label>)}</div>{normError&&<p role="alert">{normError}</p>}<div className="dp-norm-dialog-actions"><button type="button" disabled={saving} onClick={()=>setEditingNorm(null)}>Hủy</button><button type="button" disabled={saving} onClick={async()=>{const {min,target,max,positionId}=editingNorm;if(![min,target,max].every(n=>Number.isInteger(n)&&n>=0)||min>target||target>max){setNormError('Nhập số nguyên không âm, tối thiểu ≤ mục tiêu ≤ tối đa.');return;}const ok=await onUpdateNorm(positionId,min,target,max);if(ok!==false)setEditingNorm(null);}}>Lưu quy chuẩn</button></div></div></div>}
  </div>;
}

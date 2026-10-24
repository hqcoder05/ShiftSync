import {useEffect,useMemo,useRef,useState} from 'react';
import Store3DCanvas from '../../components/spatial/Store3DCanvas.jsx';
import {getEligibleStaffForShift,assignStaffToShift} from '../../services/shiftService.js';
import {getZoneShiftRequirements} from '../../components/spatial/spatial.constants.js';
import {getShiftTimeRange,formatShiftMinute} from '../spatial-workspace/utils/shiftTimeRange.js';
import {assignmentsOf,staffIdOf,withDrafts,plannerWarnings,candidateReasons} from './plannerModel.js';
import './schedule-planner.css';
import '../spatial-workspace/components/store-explorer.css';

export default function SchedulePlanner({storeId,storeName,storeCategory,layout,zones=[],employees=[],skills=[],shifts=[],date,onDateChange,onExit,onReload}){
 const [mode,setMode]=useState('Spatial'),[shiftId,setShiftId]=useState(''),[zoneId,setZoneId]=useState('');
 const [minute,setMinute]=useState(0),[drafts,setDrafts]=useState([]),[eligible,setEligible]=useState({key:'',status:'idle',list:[]});
 const [retry,setRetry]=useState(0),[saving,setSaving]=useState(false),[message,setMessage]=useState(''),[exitPrompt,setExitPrompt]=useState(false);
 const saveLock=useRef(false),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 const canEdit=['MANAGER','ADMIN'].includes(localStorage.getItem('userRole'));
 const planned=useMemo(()=>withDrafts(shifts,drafts),[shifts,drafts]);
 const dayShifts=planned.filter(s=>(s.shiftDate||s.date)===date&&s.status!=='CANCELLED');
 const shift=dayShifts.find(s=>s.id===shiftId)||dayShifts[0]||null,zone=zones.find(z=>z.id===zoneId)||null;
 const range=getShiftTimeRange(shift),key=`${storeId}/${shift?.id||''}`;
 const timelineEnd=Math.ceil(Math.max(1440,...dayShifts.map(s=>getShiftTimeRange(s).end))/360)*360;
 const warnings=useMemo(()=>plannerWarnings(planned,zones),[planned,zones]);
 const currentAssignments=assignmentsOf(shift);
 useEffect(()=>{setMinute(getShiftTimeRange(shift).start);},[shift?.id]);
 useEffect(()=>{
  if(!shift?.id){setEligible({key,status:'idle',list:[]});return;}
  let active=true;setEligible({key,status:'loading',list:[]});
  getEligibleStaffForShift(storeId,shift.id).then(response=>{if(active)setEligible({key,status:'ready',list:Array.isArray(response.data)?response.data:response.data?.content||[]});}).catch(()=>{if(active)setEligible({key,status:'error',list:[]});});
  return()=>{active=false;};
 },[storeId,shift?.id,retry]);
 const ready=eligible.key===key&&eligible.status==='ready';
 const eligibleIds=new Set(ready?eligible.list.map(staffIdOf):[]);
 const people=useMemo(()=>{
  const map=new Map(employees.map(p=>[staffIdOf(p),p]));
  if(eligible.key===key)eligible.list.forEach(p=>map.set(staffIdOf(p),{...p,...map.get(staffIdOf(p))}));
  return [...map.values()];
 },[employees,eligible,key]);
 const candidates=people.map(person=>({person,reasons:candidateReasons(person,shift,zone,planned,eligibleIds)})).sort((a,b)=>a.reasons.length-b.reasons.length);
 const displayStaff=currentAssignments.map(a=>({...a,id:a.staffId,staffId:a.staffId,staffName:a.staffName||people.find(p=>staffIdOf(p)===a.staffId)?.fullName||'Nhân viên'}));
 const chooseSlot=(s,z)=>{if(s.id!==shift?.id)setShiftId(s.id);setZoneId(z.id);setMessage('');};
 const add=person=>{
  if(!ready||!canEdit||saving||candidateReasons(person,shift,zone,planned,eligibleIds).length)return;
  setDrafts(previous=>candidateReasons(person,shift,zone,withDrafts(shifts,previous),eligibleIds).length?previous:[...previous,{id:`draft-${crypto.randomUUID()}`,staffId:staffIdOf(person),gender:person.gender,staffName:person.fullName||person.staffFullName||person.staffName||'Nhân viên',shiftId:shift.id,zoneId:zone.id,zoneName:zone.name,source:'DRAFT'}]);
  setMessage('Đã thêm vào bản nháp. Chưa lưu lên hệ thống.');
 };
 const apply=async()=>{
  if(saveLock.current||!canEdit||!drafts.length||warnings.length)return;
  saveLock.current=true;setSaving(true);setMessage('');const saved=new Set();let failure='';
  try{
   for(const item of drafts){
    const latest=await getEligibleStaffForShift(storeId,item.shiftId);
    const list=Array.isArray(latest.data)?latest.data:latest.data?.content||[];
    if(!list.some(p=>staffIdOf(p)===item.staffId))throw new Error(`${item.staffName} không còn đủ điều kiện. Hãy kiểm tra lại ca.`);
    await assignStaffToShift(storeId,item.shiftId,item.staffId,item.zoneId,false);saved.add(item.id);
   }
  }catch(error){failure=error.response?.data?.message||error.message||'Không thể lưu phân công.';}
  finally{
   if(mounted.current){setDrafts(previous=>previous.filter(item=>!saved.has(item.id)));setRetry(value=>value+1);}
   try{if(saved.size)await onReload?.();}catch{failure+=' Đã lưu nhưng chưa tải lại được lịch; hãy làm mới trang.';}
   if(mounted.current){setMessage(`${saved.size?`Đã lưu ${saved.size} phân công. `:''}${failure||'Hoàn tất.'}`);setSaving(false);}
   saveLock.current=false;
  }
 };
 return <section className="sp-planner" aria-label="3D Schedule Planner">
  <header className="sp-header"><button className="se-button" disabled={saving} onClick={()=>drafts.length?setExitPrompt(true):onExit()}>← Lịch ca</button><div><strong>3D Schedule Planner</strong><small>{storeName} · Bản thử nghiệm</small></div>
   <label>Ngày<span className="sp-date"><span aria-hidden="true">{date.split('-').reverse().join('/')}</span><input aria-label="Ngày lập lịch" type="date" value={date} disabled={saving} onChange={e=>e.target.value&&onDateChange(e.target.value)}/></span></label>
   <label>Ca<select aria-label="Ca lập lịch" value={shift?.id||''} disabled={saving} onChange={e=>setShiftId(e.target.value)}>{!dayShifts.length&&<option value="">Chưa có ca</option>}{dayShifts.map(s=><option key={s.id} value={s.id}>{s.name} · {s.startTime?.slice(0,5)}–{s.endTime?.slice(0,5)}</option>)}</select></label>
   <div role="group" aria-label="Góc nhìn lập lịch" className="sp-modes">{['Matrix','Timeline','Spatial'].map(view=><button key={view} aria-pressed={mode===view} onClick={()=>setMode(view)}>{view}</button>)}</div>
  </header>
  <div className="sp-subbar"><label>Thời điểm <input aria-label="Thời điểm lập lịch" type="range" min={range.start} max={range.end} step="15" value={Math.min(range.end,Math.max(range.start,minute))} onChange={e=>setMinute(Number(e.target.value))}/><strong>{formatShiftMinute(minute)}</strong></label><span>{drafts.length} phân công nháp · {warnings.length} cảnh báo</span><button className="se-button" disabled={!drafts.length||saving} onClick={()=>setDrafts(previous=>previous.slice(0,-1))}>Hoàn tác</button><button className="se-button se-primary" disabled={!canEdit||!drafts.length||!!warnings.length||saving} onClick={apply}>{saving?'Đang lưu…':`Áp dụng (${drafts.length})`}</button></div>
  {message&&<p role="status" className="sp-message">{message}</p>}
  {exitPrompt&&<div role="alertdialog" aria-label="Bản nháp chưa lưu" className="sp-message">Bản nháp chưa được lưu. <button className="se-button" onClick={()=>setExitPrompt(false)}>Tiếp tục lập lịch</button><button className="se-button" onClick={()=>{setDrafts([]);onExit();}}>Bỏ nháp và quay lại</button></div>}
  <div className="sp-body"><main className="sp-main">
   {!dayShifts.length?<div className="sp-empty">Chưa có ca làm cho ngày này. Chọn ngày khác hoặc quay lại lịch để tạo ca.</div>:mode==='Spatial'?<Store3DCanvas planningMode planningTimeMinutes={minute} onPlanningZoneSelect={z=>setZoneId(z.id)} layout={layout} zones={zones} staff={displayStaff} storeName={storeName} storeCategory={storeCategory} storeId={storeId} selectedStoreId={storeId} employees={people} skills={skills} currentShift={shift} allDateShifts={dayShifts} activeDate={date}/>:mode==='Matrix'?<div className="sp-matrix"><table><caption>Phân công theo khu vực và ca · Bấm vị trí trống để tìm ứng viên</caption><thead><tr><th>Khu vực</th>{dayShifts.map(s=><th key={s.id}>{s.name}<small>{s.startTime?.slice(0,5)}–{s.endTime?.slice(0,5)}</small></th>)}</tr></thead><tbody>{zones.map(z=><tr key={z.id}><th>{z.name}</th>{dayShifts.map(s=>{const assigned=assignmentsOf(s).filter(a=>a.zoneId===z.id),target=getZoneShiftRequirements(zones,s,skills)[z.id]||0,missing=Math.max(0,target-assigned.length);return <td key={s.id}><button className={`sp-slot ${missing?'sp-slot--empty':''}`} aria-label={`${z.name}, ${s.name}, ${missing} vị trí trống`} onClick={()=>chooseSlot(s,z)}><strong>{assigned.length}/{target} người</strong>{assigned.map(a=><span key={a.id||a.staffId}>{a.staffName||'Nhân viên'}{a.source==='DRAFT'?' · Nháp':''}</span>)}<small>{missing?`+ ${missing} vị trí trống`:'Xem phân công'}</small></button></td>;})}</tr>)}</tbody></table>{!zones.length&&<div className="sp-empty">Cửa hàng chưa cấu hình khu vực.</div>}</div>:<div className="sp-timeline"><div className="sp-hours">{Array.from({length:Math.ceil(timelineEnd/360)+1},(_,i)=>i*6).map(hour=><span key={hour}>{hour}:00</span>)}</div>{zones.map(z=><div className="sp-track" key={z.id}><strong>{z.name}</strong><div>{dayShifts.map(s=>{const r=getShiftTimeRange(s),count=assignmentsOf(s).filter(a=>a.zoneId===z.id).length;return <button key={s.id} style={{left:`${r.start/timelineEnd*100}%`,width:`${Math.max(4,(r.end-r.start)/timelineEnd*100)}%`}} onClick={()=>chooseSlot(s,z)} aria-label={`${z.name}, ${s.name}, xem ứng viên`}>{s.name} · {count} người{r.end>1440?' · Qua đêm':''}</button>;})}<i style={{left:`${minute/timelineEnd*100}%`}}/></div></div>)}<p>Chọn thanh ca để xem vị trí và ứng viên. Ca qua đêm tiếp tục sang ngày hôm sau.</p></div>}
  </main><aside className="sp-sidebar" aria-label="Ứng viên và cảnh báo"><h2>{zone?zone.name:'Chọn một vị trí'}</h2><p>{shift?`${shift.name} · ${shift.startTime?.slice(0,5)}–${shift.endTime?.slice(0,5)}`:'Chưa chọn ca'}</p><label>Khu vực<select aria-label="Khu vực lập lịch" value={zoneId} onChange={e=>setZoneId(e.target.value)}><option value="">Chọn khu vực…</option>{zones.map(z=><option key={z.id} value={z.id}>{z.name}</option>)}</select></label>
   <h3>Ứng viên theo điều kiện ca</h3>{!zone||!shift?<p>Bấm khu vực trong Spatial hoặc ô vị trí trống trong Matrix.</p>:eligible.key!==key||eligible.status==='loading'?<p role="status">Đang kiểm tra ứng viên…</p>:eligible.status==='error'?<div role="alert">Không tải được ứng viên. <button className="se-button" onClick={()=>setRetry(n=>n+1)}>Thử lại</button></div>:<><small>Điều kiện ca được hệ thống kiểm tra. Bản nháp được kiểm tra trùng lịch trước khi lưu.</small>{!candidates.length&&<p>Chưa có nhân viên để đề xuất.</p>}{candidates.map(({person,reasons})=><article className="sp-candidate" key={staffIdOf(person)}><strong>{person.fullName||person.staffFullName||person.staffName||'Nhân viên'}</strong><small>{reasons.length?reasons.join(' '):'Đủ điều kiện ca · Không trùng bản nháp'}</small><button className="se-button" disabled={!canEdit||saving||!!reasons.length} onClick={()=>add(person)}>Thêm vào bản nháp</button></article>)}</>}
   <h3>Cảnh báo phân công ({warnings.length})</h3>{warnings.length?<ul role="alert">{warnings.map(w=><li key={w.key}>{w.message}<button className="se-button" onClick={()=>{const target=planned.find(item=>item.id===w.shiftId);if(target){onDateChange(target.shiftDate||target.date);setShiftId(target.id);setZoneId(zones.some(z=>z.id===w.zoneId)?w.zoneId:'');setMode('Matrix');}}}>Xem phân công</button></li>)}</ul>:<p>Không phát hiện trùng ca hoặc khu vực không hợp lệ trong dữ liệu đã tải.</p>}
   {drafts.length>0&&<><h3>Bản nháp chưa lưu</h3>{drafts.map(item=><div className="sp-draft" key={item.id}>{item.staffName} → {item.zoneName}<button aria-label={`Bỏ phân công ${item.staffName}`} disabled={saving} onClick={()=>setDrafts(previous=>previous.filter(a=>a.id!==item.id))}>×</button></div>)}</>}
   {!canEdit&&<p role="note">Bạn có quyền xem. Chỉ quản lý hoặc quản trị viên được phân công.</p>}
  </aside></div>
 </section>;
}

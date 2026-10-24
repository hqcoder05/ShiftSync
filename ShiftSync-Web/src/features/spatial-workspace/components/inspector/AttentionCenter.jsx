/**
 * AttentionCenter.jsx
 * Operational Cảnh báo vận hành view for the ShiftSync Contextual Inspector (State 1: Default / Store Overview).
 * 
 * Aggregates prioritized staffing alerts:
 * - Understaffed zones
 * - Skill mismatches
 * - Unassigned workstations
 * 
 * Provides:
 * - 1-Click Camera Glide to 3D zone
 * - 1-Click Smart Replacement recommendation launcher
 * - Store-wide capacity health gauge
 * - Zone directory with live occupancy badges
 * - Max-Min Dispersion spatial allocation trigger
 */

import {useState} from 'react';
import {AlertTriangle,CheckCircle2,Search,Sparkles,Users,ArrowUpRight,Zap,Clock,Box,ChevronRight,CalendarDays} from 'lucide-react';
import {getZoneShiftRequirements} from '../../../../components/spatial/spatial.constants';
import './attention-center.css';

export default function AttentionCenter({
  zones = [],
  staff = [],
  currentShift = null,
  skills = [],
  workstations = [],
  workstationOccupancies = null,
  onSelectZone,
  onFocusZone,
  onSelectWorkstation,
  onFocusWorkstation,
  onRunAlgorithm,
  isAllocating = false,
  onOpenAutoSchedule,
}) {
  const [filter,setFilter]=useState('all');
  // Map staff by zone
  const staffByZone = {};
  staff.forEach((s) => {
    const zid = s.zoneId || s.zone?.id;
    if (zid) {
      if (!staffByZone[zid]) staffByZone[zid] = [];
      staffByZone[zid].push(s);
    }
  });

  // Calculate shift requirements per zone
  const zoneRequirements = getZoneShiftRequirements(zones, currentShift, skills);
  const totalShiftTarget = Object.values(zoneRequirements).reduce((sum, val) => sum + val, 0);

  // Calculate total physical capacity and understaffed issues
  let totalCapacity = 0;
  const issues = [];

  // 1. Workstation Unassigned Issues (Equipment / Station Idle)
  if (Array.isArray(workstations) && workstations.length > 0 && currentShift) {
    workstations.forEach((ws) => {
      if (ws.isActive === false) return;
      const occ = workstationOccupancies?.get(ws.id);
      const isUnassigned = occ?.state === 'UNASSIGNED' || occ?.status === 'UNASSIGNED';

      if (isUnassigned) {
        issues.push({
          id: `unassigned-ws-${ws.id}`,
          severity: 'WARNING',
          type: 'WORKSTATION',
          workstation: ws,
          title: `Trạm chưa phân công: ${ws.name || ws.code}`,
          description: `Trạm tại ${ws.zoneName || 'khu vực chưa xác định'} chưa có nhân viên được phân công trong ca.`,
          impact: 'Quầy/trạm chưa được kích hoạt vận hành.',
        });
      }
    });
  }

  (currentShift ? zones : []).forEach((zone) => {
    const cap = zone.capacity || 4;
    totalCapacity += cap;
    const zStaff = staffByZone[zone.id] || [];
    const count = zStaff.length;
    const target = zoneRequirements[zone.id] !== undefined ? zoneRequirements[zone.id] : Math.ceil(cap * 0.5);

    // If target is 0, this zone is not requested in this shift
    if (target > 0) {
      if (count === 0) {
        issues.push({
          id: `empty-${zone.id}`,
          severity: 'Ưu tiên',
          zone,
          title: `Trống nhân sự: ${zone.name}`,
          description: `Chưa có phân công (Chỉ tiêu ca: ${target} nhân sự • Sức chứa quầy: ${cap} chỗ).`,
          impact: 'Nguy cơ gián đoạn phục vụ vị trí này trong ca trực.',
        });
      } else if (count < target) {
        issues.push({
          id: `understaffed-${zone.id}`,
          severity: 'WARNING',
          zone,
          title: `Thiếu định biên: ${zone.name}`,
          description: `Đã phân công ${count}/${target} nhân sự theo ca (Thiếu ${target - count} người • Sức chứa: ${cap}).`,
          impact: 'Dung lượng phục vụ giảm, thời gian xử lý đơn kéo dài.',
        });
      } else if (count > target || count > cap) {
        const surplus = count - target;
        issues.push({
          id: `overstaffed-${zone.id}`,
          severity: 'OVERSTAFFED',
          zone,
          title: `Dư thừa nhân sự: ${zone.name}`,
          description: `Đã phân công ${count}/${target} nhân sự (Dư ${surplus} người so với định biên ca • Sức chứa: ${cap}).`,
          impact: 'Lãng phí chi phí nhân công. Có thể điều chuyển sang quầy thiếu.',
        });
      }
    } else if (count > 0) {
      issues.push({
        id: `overstaffed-${zone.id}`,
        severity: 'OVERSTAFFED',
        zone,
        title: `Ngoài kế hoạch ca: ${zone.name}`,
        description: `Đã phân công ${count} nhân sự tại quầy không yêu cầu trong ca này.`,
        impact: 'Nên điều chuyển nhân sự sang các quầy trọng yếu đang thiếu.',
      });
    }
  });

  const effectiveTarget = totalShiftTarget > 0 ? totalShiftTarget : totalCapacity;
  const shiftCoveragePercent = effectiveTarget > 0
    ? Math.min(100, Math.round((staff.length / effectiveTarget) * 100))
    : 100;

  const priority={'Ưu tiên':0,WARNING:1,OVERSTAFFED:2};
  issues.sort((a,b)=>(priority[a.severity]??1)-(priority[b.severity]??1));
  const urgent=issues.filter(i=>i.severity==='Ưu tiên').length;
  const filtered=issues.filter(i=>filter==='all'||(filter==='urgent'?i.severity==='Ưu tiên':filter==='station'?i.type==='WORKSTATION':i.type!=='WORKSTATION'));
  const selectIssue=(issue,focus=false)=>{
    if(issue.type==='WORKSTATION'){onSelectWorkstation?.(issue.workstation);if(focus)onFocusWorkstation?.(issue.workstation);}
    else {onSelectZone?.(issue.zone);if(focus)onFocusZone?.(issue.zone);}
  };
  return <div className="ac-center">
    <div className="ac-context"><CalendarDays size={15}/><strong>{currentShift?(currentShift.name||'Ca làm việc'):'Chưa chọn ca làm việc'}</strong>{currentShift&&<span>{(currentShift.shiftDate||currentShift.date||'').split('-').reverse().join('/')} · {currentShift.startTime?.slice(0,5)}–{currentShift.endTime?.slice(0,5)}</span>}</div>
    <div className="ac-layout">
      <section className="ac-queue" aria-label="Danh sách cảnh báo">
        <div className="ac-queue-heading"><h3>Cần chú ý <span>{currentShift?issues.length:'—'}</span></h3><small>Phân công theo lịch ca</small></div>
        <div className="ac-filters" role="group" aria-label="Lọc cảnh báo">{[['all','Tất cả',issues.length],['urgent','Ưu tiên',urgent],['zone','Khu vực',issues.filter(i=>i.type!=='WORKSTATION').length],['station','Trạm',issues.filter(i=>i.type==='WORKSTATION').length]].map(([key,label,count])=><button key={key} type="button" aria-pressed={filter===key} onClick={()=>setFilter(key)}>{label}<span>{currentShift?count:'—'}</span></button>)}</div>
        {!currentShift?<div className="ac-empty"><Clock size={30}/><h4>Chọn ca để xem cảnh báo</h4><p>Chọn ngày và ca trên thanh công cụ để đối chiếu phân công với nhu cầu nhân sự.</p></div>:filtered.length===0?<div className="ac-empty"><CheckCircle2 size={30}/><h4>{issues.length?'Không có cảnh báo thuộc nhóm này':'Không có chênh lệch phân công'}</h4><p>{issues.length?'Chọn nhóm khác để xem các mục cần xử lý.':'Số lượng được đối chiếu với nhu cầu ca và cấu hình khu vực. Trạng thái điểm danh được xem riêng tại từng nhân viên.'}</p></div>:<div className="ac-issues">{filtered.map(issue=>{
          const tone=issue.severity==='Ưu tiên'?'critical':issue.severity==='OVERSTAFFED'?'surplus':'warning';
          const label=tone==='critical'?'Ưu tiên':tone==='surplus'?'Dư phân công':issue.type==='WORKSTATION'?'Trạm trống':'Thiếu người';
          return <article key={issue.id} className={`ac-issue ac-issue--${tone}`}>
            <div className="ac-issue-top"><span className="ac-severity"><AlertTriangle size={12}/>{label}</span><span className="ac-kind">{issue.type==='WORKSTATION'?'Trạm làm việc':'Khu vực'}</span></div>
            <h4>{issue.workstation?.name||issue.workstation?.code||issue.zone?.name}</h4><p>{issue.description}</p>
            <div className="ac-impact">{issue.impact}</div>
            <div className="ac-issue-actions"><button type="button" onClick={()=>selectIssue(issue,true)}><Search size={13}/>Xem trong 3D</button><button type="button" className="ac-primary-link" onClick={()=>selectIssue(issue)}>{issue.type==='WORKSTATION'?'Chi tiết trạm':'Tìm ứng viên'}<ArrowUpRight size={14}/></button></div>
          </article>;
        })}</div>}
      </section>
      <aside className="ac-summary" aria-label="Tổng quan phân công">
        <section className="ac-coverage"><span><Users size={15}/>Nhân sự trong ca</span><div className="ac-coverage-number">{currentShift?staff.length:'—'}<small>/ {currentShift?effectiveTarget:'—'}</small></div><p>Đã phân công / Nhu cầu đối chiếu</p><div className="ac-meter" role="progressbar" aria-label="Độ phủ phân công" aria-valuemin={0} aria-valuemax={100} aria-valuenow={currentShift?shiftCoveragePercent:0}><i style={{width:`${currentShift?shiftCoveragePercent:0}%`}}/></div><small>{currentShift?`${shiftCoveragePercent}% độ phủ theo số lượng`:'Chưa đánh giá khi chưa chọn ca'}</small></section>
        <div className="ac-tools"><h4>Hỗ trợ phân công</h4><button type="button" id="btn-run-spatial-allocation" onClick={onRunAlgorithm} disabled={!currentShift||isAllocating||!onRunAlgorithm}><Zap size={16}/><span>{isAllocating?'Đang phân bổ…':'Phân bổ theo khu vực'}</span><ChevronRight size={14}/></button>{onOpenAutoSchedule&&<button type="button" id="btn-trigger-auto-schedule" onClick={onOpenAutoSchedule} disabled={!currentShift}><Sparkles size={16}/><span>Xếp ca tự động</span><ChevronRight size={14}/></button>}<p>Các thao tác mở luồng xử lý hiện có. Phân công chưa xác nhận không đồng nghĩa nhân viên đã có mặt.</p></div>
        <details className="ac-directory"><summary><Box size={14}/>Các khu vực<span>{zones.length}</span></summary><div>{zones.map(zone=><button type="button" key={zone.id} onClick={()=>{onSelectZone?.(zone);onFocusZone?.(zone);}}><span>{zone.name}</span><small>{currentShift?`${(staffByZone[zone.id]||[]).length} phân công`:'Chưa chọn ca'}</small><ChevronRight size={13}/></button>)}</div></details>
      </aside>
    </div>
  </div>;
}

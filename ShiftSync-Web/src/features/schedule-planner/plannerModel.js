import {getShiftTimeRange} from '../spatial-workspace/utils/shiftTimeRange.js';

export const staffIdOf=person=>person?.staffId||person?.userId||person?.id;
export const assignmentsOf=shift=>Array.isArray(shift?.shiftAssignments)?shift.shiftAssignments:shift?.staffId?[{staffId:shift.staffId,staffName:shift.staffName,zoneId:shift.zoneId}]:[];
export function interval(shift){
 const day=Date.parse(`${shift.shiftDate||shift.date}T00:00:00Z`)/60000;
 const range=getShiftTimeRange(shift);
 return{start:day+range.start,end:day+range.end};
}
export function overlapsShift(a,b){const x=interval(a),y=interval(b);return x.start<y.end&&x.end>y.start;}
export function withDrafts(shifts,drafts){return shifts.map(shift=>({...shift,shiftAssignments:[...assignmentsOf(shift),...drafts.filter(item=>item.shiftId===shift.id)]}));}
export function plannerWarnings(shifts,zones){
 const warnings=[],seen=[];
 shifts.filter(s=>s.status!=='CANCELLED').forEach(shift=>zones.forEach(zone=>{
  const count=assignmentsOf(shift).filter(a=>a.zoneId===zone.id).length;
  if(Number(zone.capacity)>0&&count>Number(zone.capacity))warnings.push({key:`capacity-${shift.id}-${zone.id}`,shiftId:shift.id,zoneId:zone.id,message:`${zone.name} trong ${shift.name}: ${count} người vượt sức chứa ${zone.capacity}.`});
 }));
 shifts.filter(s=>s.status!=='CANCELLED').forEach(shift=>assignmentsOf(shift).forEach(a=>{
  if(!staffIdOf(a)){warnings.push({key:`missing-${shift.id}-${seen.length}`,shiftId:shift.id,message:`${shift.name}: phân công thiếu định danh nhân viên.`});return;}
  if(!a.zoneId||!zones.some(z=>z.id===a.zoneId))warnings.push({key:`zone-${shift.id}-${staffIdOf(a)}`,shiftId:shift.id,message:`${a.staffName||'Nhân viên'} trong ${shift.name}: chưa có khu vực hợp lệ.`});
  for(const previous of seen)if(staffIdOf(previous.a)===staffIdOf(a)&&overlapsShift(previous.shift,shift)){
   const left=interval(previous.shift),right=interval(shift);
   const format=value=>new Intl.DateTimeFormat('vi-VN',{timeZone:'UTC',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(value*60000));
   warnings.push({key:`overlap-${previous.shift.id}-${shift.id}-${staffIdOf(a)}-${warnings.length}`,shiftId:shift.id,zoneId:a.zoneId,message:`${a.staffName||'Nhân viên'} trùng lịch: ${previous.shift.name} và ${shift.name}. Khoảng trùng ${format(Math.max(left.start,right.start))} – ${format(Math.min(left.end,right.end))}.`});
  }
  seen.push({a,shift});
 }));
 return warnings;
}
export function candidateReasons(person,shift,zone,shifts,eligibleIds){
 if(!shift||!zone)return['Chọn ca và khu vực trước.'];
 const id=staffIdOf(person),reasons=[];
 if(!id)reasons.push('Thiếu định danh nhân viên.');
 if(shift.status==='CANCELLED')reasons.push('Ca đã hủy.');
 for(const other of shifts.filter(s=>s.status!=='CANCELLED'))if(assignmentsOf(other).some(a=>staffIdOf(a)===id)&&overlapsShift(other,shift)){reasons.push(other.id===shift.id?'Đã được phân công trong ca này.':`Trùng với ${other.name||'ca khác'}.`);break;}
 if(!eligibleIds.has(id))reasons.push('Chưa đủ điều kiện ca theo hệ thống (lịch rảnh, nghỉ phép, kỹ năng hoặc giới hạn giờ).');
 const req=(shift.skillRequirements||[]).find(r=>r.zoneId===zone.id);
 const requiredId=zone.requiredSkillId||req?.skillId,requiredName=zone.requiredSkill||req?.skillName;
 if(requiredId||requiredName){
  const skills=person.skills||[];
  if(!skills.some(s=>requiredId?(s.skillId||s.id)===requiredId:String(s.name||s.skillName||s).toLowerCase()===String(requiredName).toLowerCase()))reasons.push('Chưa xác minh kỹ năng yêu cầu của khu vực.');
 }
 const capacity=Number(zone.capacity);
 const count=assignmentsOf(shift).filter(a=>a.zoneId===zone.id).length;
 if(capacity>0&&count>=capacity)reasons.push('Khu vực đã đủ sức chứa.');
 return reasons;
}

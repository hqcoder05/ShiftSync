export function demandStatus(quota) {
  const {count, min, target, max} = quota || {};
  if (![count,min,target,max].every(v => typeof v === 'number' && Number.isFinite(v))) return {kind:'unknown', label:'Chưa có thông tin'};
  if (count < min) return {kind:'under', label:`Dưới tối thiểu ${min-count} người`};
  if (count > max) return {kind:'over', label:`Vượt tối đa ${count-max} người`};
  if (count === target) return {kind:'target', label:'Đạt mục tiêu'};
  return {kind:'within', label:count < target ? `Trong giới hạn · dưới mục tiêu ${target-count}` : 'Trong giới hạn · trên mục tiêu'};
}
export function demandSummary(shifts=[]) {
  const cells=shifts.flatMap(s=>s.quotas||[]), states=cells.map(demandStatus);
  return {total:cells.length, target:states.filter(s=>s.kind==='target').length,
    within:states.filter(s=>s.kind==='within').length, review:states.filter(s=>['under','over','unknown'].includes(s.kind)).length,
    slots:cells.reduce((n,q)=>n+(q.count||0),0),
    hours:shifts.every(s=>typeof s.durationHours==='number') ? shifts.reduce((n,s)=>n+(s.quotas||[]).reduce((a,q)=>a+(q.count||0)*s.durationHours,0),0) : null};
}

// Match MarketplaceService's Asia/Ho_Chi_Minh business clock, not browser timezone.
const DAY=86400000;
function localShiftTime(date,time){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||!/^\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(time||''))return NaN;
 return Date.parse(`${date}T${time}+07:00`);
}
export function vietnamDate(now=Date.now()){
 return new Date(Number(now)+7*3600000).toISOString().slice(0,10);
}
export function marketplaceTiming(shift,now=Date.now()){
 const start=localShiftTime(shift?.shiftDate,shift?.startTime);
 let end=localShiftTime(shift?.shiftDate,shift?.endTime);
 if(Number.isFinite(start)&&Number.isFinite(end)&&end<=start)end+=DAY;
 const raw=shift?.availabilityDeadline;
 const deadline=raw?Date.parse(/[zZ]$|[+-]\d{2}:?\d{2}$/.test(raw)?raw:`${raw}+07:00`):null;
 const isCancelled=shift?.status==='CANCELLED';
 const isPastOrStarted=Number.isFinite(start)&&start<=Number(now);
 const isDeadlineExpired=deadline!==null&&Number.isFinite(deadline)&&deadline<=Number(now);
 const valid=Number.isFinite(start)&&Number.isFinite(end)&&(!raw||Number.isFinite(deadline));
 const ended=valid&&end<=Number(now);
 const recruitmentOpen=valid&&!isCancelled&&!isPastOrStarted&&!isDeadlineExpired;
 const label=isCancelled?'Đã hủy':!valid?'Chưa đủ thông tin thời gian':ended?'Đã kết thúc':isPastOrStarted?'Đang diễn ra · Đã đóng nhận ca':isDeadlineExpired?'Hết hạn nhận ca':'Chưa bắt đầu';
 return {start,end,deadline,ended,isCancelled,isPastOrStarted,isDeadlineExpired,recruitmentOpen,label};
}

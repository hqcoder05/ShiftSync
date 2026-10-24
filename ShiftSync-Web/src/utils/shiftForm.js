import {vietnamDate} from './marketplaceTime.js';
const stamp=(date,time)=>Date.parse(`${date}T${time}:00+07:00`);
const minutes=time=>Number(time.slice(0,2))*60+Number(time.slice(3,5));
const hhmm=value=>`${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;
export function newShiftDefaults(store={},requestedDate,now=Date.now()){
 const today=vietnamDate(now),local=new Date(Number(now)+7*3600000);
 let date=requestedDate&&requestedDate>=today?requestedDate:today;
 const open=store.openTime?.slice(0,5)||'08:00',close=store.closeTime?.slice(0,5)||'16:00';
 let start=minutes(open);
 if(date===today)start=Math.max(start,(Math.floor((local.getUTCHours()*60+local.getUTCMinutes())/15)+1)*15);
 if(start>=minutes(close)){
  date=vietnamDate(Date.parse(`${date}T00:00:00+07:00`)+86400000);start=minutes(open);
 }
 return {shiftDate:date,startTime:hhmm(start),endTime:hhmm(Math.min(start+8*60,minutes(close)))};
}
export function validateShiftForm(form,store={},mode='create',now=Date.now()){
 const start=stamp(form.shiftDate,form.startTime),end=stamp(form.shiftDate,form.endTime);
 if(!Number.isFinite(start)||!Number.isFinite(end))return 'Vui lòng nhập ngày và giờ làm việc hợp lệ.';
 if(mode==='create'&&start<=Number(now))return 'Không thể tạo ca trong quá khứ hoặc đã bắt đầu. Hãy chọn thời gian trong tương lai.';
 const startMinutes=minutes(form.startTime),endMinutes=minutes(form.endTime);
 if(endMinutes<=startMinutes)return 'Giờ kết thúc phải sau giờ bắt đầu.';
 const open=store.openTime?.slice(0,5),close=store.closeTime?.slice(0,5);
 if(open&&close){
  if(form.startTime<open)return `Giờ bắt đầu phải từ ${open} (giờ mở cửa).`;
  if(form.endTime>close)return `Giờ kết thúc không được sau ${close} (giờ đóng cửa).`;
 }
 return '';
}
export function shiftRegistrationDeadline(form,hours=24,now=Date.now()){
 const start=stamp(form.shiftDate,form.startTime),candidate=start-Math.max(0,Number(hours)||0)*3600000;
 return new Date(candidate>Number(now)?candidate:start).toISOString();
}

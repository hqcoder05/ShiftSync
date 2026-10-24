import {useEffect,useState} from 'react';
import {Check, Circle, Wrench} from 'lucide-react';
import {getWorkstationEquipment} from '../../../../services/layoutService.js';
import {findStaffAttendance} from '../../utils/spatialInfoModel.js';

const unknown='Chưa có thông tin';
const states={OPERATIONAL:'Hoạt động',MAINTENANCE:'Bảo trì',OUT_OF_SERVICE:'Ngừng hoạt động',RETIRED:'Đã thanh lý'};
function Row({label,children}){return <div className="se-world-row"><dt>{label}</dt><dd>{children??unknown}</dd></div>;}
function EquipmentSummary({storeId,id}){
 const[state,setState]=useState({loading:true});
 useEffect(()=>{
  const controller=new AbortController();
  getWorkstationEquipment(storeId,id,controller.signal).then(({data})=>{if(!controller.signal.aborted)setState(Array.isArray(data)?{items:data}:{error:true});}).catch(()=>{if(!controller.signal.aborted)setState({error:true});});
  return()=>controller.abort();
 },[storeId,id]);
 return <div className="se-world-list se-world-equipment"><h4><span className="se-world-list-label"><Wrench size={13}/> Thiết bị</span></h4>{state.loading?<p role="status">Đang tải thiết bị…</p>:state.error?<p>Chưa tải được thông tin thiết bị.</p>:state.items.length?state.items.map(item=><div key={item.id}><span>{item.name||unknown}</span><small>{states[item.status]||unknown}</small></div>):<p>Chưa có thiết bị được ghi nhận.</p>}</div>;
}
export default function WorldInfoSummary({type,data,status,zone,people,attendanceRecords,currentShift,requirement,shiftHours,storeId}){
 const checkedIn=people.filter(person=>{const record=findStaffAttendance(person,attendanceRecords,currentShift?.id);return record?.checkInTime&&!record.checkOutTime;}).length;
 return <div className="se-world-content">
  <div className={`se-world-status se-world-status--${status.tone}`}><strong>{status.title}</strong><p>{status.note}</p></div>
  <h4 className="se-world-section-title">{type==='staff'?'Phân công trong ca':type==='workstation'?'Thông tin trạm':'Nhu cầu & phân công'}</h4>
  <dl className={type==='zone'?'se-world-metrics':undefined}>{type==='staff'?<>
   <Row label="Vai trò">{data.skillName||data.role||unknown}</Row>
   <Row label="Khu vực">{data.zoneName||zone?.name||unknown}</Row>
   <Row label="Trạm làm việc">{data.workstationName||(data.workstationId?unknown:'Chưa gắn trạm cụ thể')}</Row>
   <Row label="Ca làm">{data.startTime&&data.endTime?`${data.startTime.slice(0,5)}–${data.endTime.slice(0,5)}`:shiftHours||unknown}</Row>
  </>:type==='workstation'?<>
   <Row label="Trạng thái trạm">{data.isActive===true?'Đang hoạt động':data.isActive===false?'Tạm đóng':unknown}</Row>
   <Row label="Khu vực">{data.zoneName||zone?.name||unknown}</Row>
   <Row label="Sức chứa tối đa">{data.capacity!=null?`${data.capacity} người cùng lúc`:unknown}</Row>
  </>:<>
   <Row label="Cần cho ca này">{requirement!=null?`${requirement} người`:'Chưa có chỉ tiêu'}</Row>
   <Row label="Đã phân công">{currentShift?`${people.length} người`:unknown}</Row>
   <Row label="Sức chứa tối đa">{data.capacity!=null?`${data.capacity} người cùng lúc`:unknown}</Row>
  </>}</dl>
  {type==='staff'?<details className="se-world-extra"><summary>Thông tin cá nhân</summary><dl><Row label="Giới tính">{{MALE:'Nam',FEMALE:'Nữ',OTHER:'Khác'}[data.gender]||unknown}</Row></dl></details>:<div className="se-world-list">
   <h4>Nhân sự trong ca <span>{currentShift?people.length:'—'}</span></h4>
   <p>{currentShift?`${checkedIn} người có bản ghi check-in và chưa check-out.`:'Chọn ca để xem nhân sự.'}</p>
   {people.length?people.map(person=>{const record=findStaffAttendance(person,attendanceRecords,currentShift?.id);const present=Boolean(record?.checkInTime&&!record.checkOutTime);const name=person.staffName||person.fullName||unknown;return <div className="se-world-person" key={person.assignmentId||person.staffId||person.id}><span className="se-world-person-avatar" aria-hidden="true">{name.split(' ').filter(Boolean).slice(-2).map(part=>part[0]).join('')}</span><div><span>{name}</span><small>{person.skillName||unknown}</small><small className={`se-world-person-attendance ${present?'is-present':''}`}>{present?<Check size={11}/>:<Circle size={9}/>} {record?.checkOutTime?'Đã kết thúc ca':record?.checkInTime?'Đã check-in':'Chưa có ghi nhận điểm danh'}</small></div></div>;}):<p>Chưa có nhân sự được phân công.</p>}
  </div>}
  {type==='workstation'&&<EquipmentSummary key={`${storeId}/${data.id}`} storeId={storeId} id={data.id}/>}
 </div>;
}

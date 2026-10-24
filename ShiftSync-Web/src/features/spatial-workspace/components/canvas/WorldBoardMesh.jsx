import { useEffect, useMemo, useState } from 'react';
import { Html, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { getWorkstationEquipment } from '../../../../services/layoutService.js';
import { findStaffAttendance } from '../../utils/spatialInfoModel.js';

const unknown = 'Chưa có thông tin';
const equipmentStates = { OPERATIONAL:'Hoạt động', MAINTENANCE:'Bảo trì', OUT_OF_SERVICE:'Ngừng hoạt động', RETIRED:'Đã thanh lý' };

function wrapped(ctx, text, x, y, width, lineHeight, limit = 2) {
  const words = String(text || unknown).split(/\s+/);
  let line = '', row = 0;
  for (let index = 0; index < words.length; index++) {
    const next = line ? `${line} ${words[index]}` : words[index];
    if (ctx.measureText(next).width > width && line) {
      if (row === limit - 1) { ctx.fillText(`${line.slice(0, -1)}…`, x, y + row * lineHeight); return; }
      ctx.fillText(line, x, y + row * lineHeight); row++; line = words[index];
    } else line = next;
  }
  // A single long token must also fit within its text column.
  while (ctx.measureText(line).width > width && line.length > 1) line = line.slice(0, -2) + '…';
  ctx.fillText(line, x, y + row * lineHeight);
}

function useTexture(draw, dependencies, width = 720, height = 760) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    draw(canvas.getContext('2d'), width, height);
    const result = new THREE.CanvasTexture(canvas); result.colorSpace = THREE.SRGBColorSpace;
    result.anisotropy = 4;
    return result;
    // The explicit dependencies describe the immutable drawing input.
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/use-memo
  }, dependencies);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function BoardButton({ label, width, position, active = false, onClick, name }) {
  const [hover, setHover] = useState(false);
  const texture = useTexture((ctx,w,h) => {
    ctx.fillStyle = active ? '#dfa01c' : hover ? '#536659' : '#34483e'; ctx.fillRect(0,0,w,h);
    ctx.fillStyle = active ? '#241c0d' : '#fff8ea'; ctx.font = '600 40px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label,w/2,h/2,w-20);
  }, [label, active, hover], Math.round(width*120), 80);
  return <group position={position} name={name} userData={{ isWorldBoard: true, boardButton: label }}>
    <RoundedBox args={[width,.7,.16]} radius={.07} smoothness={2}
      onPointerOver={event=>{event.stopPropagation();setHover(true);}}
      onPointerOut={()=>setHover(false)}
      onClick={event=>{event.stopPropagation();onClick();}}>
      <meshStandardMaterial color={active ? '#b98727' : '#263d32'} roughness={.45}/>
    </RoundedBox>
    <mesh position={[0,0,.085]} onClick={event=>{event.stopPropagation();onClick();}}><planeGeometry args={[width-.04,.61]}/><meshBasicMaterial map={texture} toneMapped={false}/></mesh>
  </group>;
}

/** A physical WebGL panel: extruded case, face texture and raycastable mesh keys. */
export default function WorldBoardMesh({ width, height, type, data, name, role, status, shiftDate, shiftHours, currentShift, people, attendanceRecords, requirement, zone, storeId, onActions, onClose }) {
  const [tab, setTab] = useState('summary'), [page, setPage] = useState(0);
  const [equipment, setEquipment] = useState({ loading: true });
  useEffect(()=>{
    if(type !== 'workstation')return;
    const controller = new AbortController();
    getWorkstationEquipment(storeId,data.id,controller.signal).then(({data:items})=>{
      if(!controller.signal.aborted)setEquipment(Array.isArray(items)?{items}:{error:true});
    }).catch(()=>{if(!controller.signal.aborted)setEquipment({error:true});});
    return ()=>controller.abort();
  },[type,storeId,data.id]);
  const overview = type === 'staff' ? [
    ['Vai trò',data.skillName || data.role || unknown],
    ['Khu vực',data.zoneName || zone?.name || unknown],
    ['Trạm',data.workstationName || (data.workstationId ? unknown : 'Chưa gắn trạm cụ thể')],
    ['Giới tính',{MALE:'Nam',FEMALE:'Nữ',OTHER:'Khác'}[data.gender] || unknown],
  ] : type === 'workstation' ? [
    ['Trạng thái trạm',data.isActive === true ? 'Hoạt động' : data.isActive === false ? 'Tạm đóng' : unknown],
    ['Khu vực',data.zoneName || zone?.name || unknown],
    ['Sức chứa',data.capacity != null ? `${data.capacity} người cùng lúc` : unknown],
    ['Theo lịch',currentShift ? `${people.length} người được phân công` : 'Chưa chọn ca'],
  ] : [
    ['Cần cho ca',requirement != null ? `${requirement} người` : 'Chưa có chỉ tiêu'],
    ['Đã phân công',currentShift ? `${people.length} người` : 'Chưa chọn ca'],
    ['Sức chứa',data.capacity != null ? `${data.capacity} người cùng lúc` : unknown],
  ];
  const rows = tab === 'summary' ? overview : tab === 'people' ? people.map(person=>{
    const attendance = findStaffAttendance(person,attendanceRecords,currentShift?.id);
    return [person.staffName || person.fullName || unknown,`${person.skillName || unknown} · ${attendance?.checkOutTime ? 'Đã kết thúc ca' : attendance?.checkInTime ? 'Đã check-in' : 'Chưa ghi nhận điểm danh'}`];
  }) : (equipment.items || []).map(item=>[item.name || unknown,equipmentStates[item.status] || unknown]);
  const compact = height < 350;
  const perPage = compact ? 1 : 4;
  const pages = Math.max(1,Math.ceil(rows.length/perPage));
  const currentPage = Math.min(page,pages-1);
  const heading = tab === 'summary' ? 'THÔNG TIN THEO CA' : tab === 'people' ? `NHÂN SỰ · ${people.length} NGƯỜI` : 'THIẾT BỊ TẠI TRẠM';
  const texture = useTexture((ctx,w,h)=>{
    ctx.fillStyle='#f4ede0';ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#243a30';ctx.fillRect(0,0,w,compact ? 142 : 186);
    ctx.fillStyle=role.color;ctx.fillRect(0,0,9,compact ? 142 : 186);
    ctx.font='600 24px sans-serif';ctx.fillStyle='#c9d4c9';ctx.fillText(type==='staff'?'NHÂN VIÊN':type==='zone'?'KHU VỰC':'TRẠM LÀM VIỆC',28,compact ? 28 : 35);
    ctx.font='700 32px sans-serif';ctx.fillStyle='#fff8e9';wrapped(ctx,name,28,compact ? 67 : 82,w-56,compact ? 32 : 37,2);
    ctx.font='500 23px sans-serif';ctx.fillStyle='#d6dfd0';
    wrapped(ctx,`${shiftDate ? shiftDate.split('-').reverse().join('/') : 'Chưa có ngày ca'} · ${currentShift?.name || 'Chưa chọn ca'}${shiftHours ? ` · ${shiftHours}` : ''}`,28,compact ? 123 : 158,w-56,23,1);
    ctx.fillStyle=status.tone==='warning'?'#805512':status.tone==='success'?'#136449':'#344e40';ctx.font='700 26px sans-serif';wrapped(ctx,status.title,28,compact ? 177 : 228,w-56,31,1);
    ctx.fillStyle='#6d665a';ctx.font='23px sans-serif';wrapped(ctx,status.note,28,compact ? 215 : 295,w-56,25,compact ? 1 : 2);
    ctx.fillStyle='#7a6b54';ctx.font='700 23px sans-serif';ctx.fillText(heading,28,compact ? 270 : 370);
    const visible=rows.slice(currentPage*perPage,currentPage*perPage+perPage);
    visible.forEach(([label,value],index)=>{
      const y=(compact ? 305 : 403)+index*76;
      ctx.strokeStyle='#d9cdbb';ctx.beginPath();ctx.moveTo(28,y+59);ctx.lineTo(w-28,y+59);ctx.stroke();
      ctx.font='23px sans-serif';ctx.fillStyle='#776a57';wrapped(ctx,label,28,y+15,tab==='summary'?210:w-56,22,1);
      ctx.font='600 26px sans-serif';ctx.fillStyle='#292c23';wrapped(ctx,value,tab==='summary'?247:28,tab==='summary'?y+15:y+44,tab==='summary'?w-275:w-56,25,tab==='summary'?2:1);
    });
    if(!visible.length){ctx.fillStyle='#776a57';ctx.font='22px sans-serif';wrapped(ctx,tab==='people'?'Chưa có nhân sự được phân công.':equipment.loading?'Đang tải thiết bị…':equipment.error?'Chưa tải được thông tin thiết bị.':'Chưa ghi nhận thiết bị.',28,compact ? 315 : 430,w-56,30,2);}
    ctx.fillStyle='#7a6b54';ctx.font='18px sans-serif';ctx.fillText(`${currentPage+1}/${pages} trang · ${rows.length} mục`,28,h-25);
    ctx.textAlign='right';ctx.fillText('Esc để đóng',w-28,h-25);
  },[name,type,role.color,status.title,status.note,status.tone,shiftDate,shiftHours,currentShift?.name,JSON.stringify(rows),tab,currentPage,pages,heading,equipment.loading,equipment.error,compact,perPage,width,height],Math.round(width*2),Math.round((height-52)*2));
  const w=width/40, h=height/40;
  const choose=value=>{setTab(value);setPage(0);};
  return <group name="worldPhysicalBoard" userData={{isWorldBoard:true,boardType:type}}>
    <RoundedBox args={[w,h,.22]} radius={.1} smoothness={3} castShadow receiveShadow><meshStandardMaterial color="#405345" metalness={.1} roughness={.65}/></RoundedBox>
    <RoundedBox args={[w-.12,h-.12,.12]} position={[0,0,.19]} radius={.1} smoothness={2}><meshStandardMaterial color="#203b2c" roughness={.6}/></RoundedBox>
    <mesh position={[0,.48,.26]} name="worldBoardFace"><planeGeometry args={[w-.28,h-1.3]}/><meshBasicMaterial map={texture} toneMapped={false}/></mesh>
    <BoardButton name="worldBoardClose" label="×" width={.65} position={[w/2-.55,h/2-.56,.38]} onClick={onClose}/>
    <group position={[0,-h/2+.56,.38]}>
      {type!=='staff' && <BoardButton name="worldBoardSummary" label="Tổng quan" width={2} position={[-w/2+1.2,0,0]} active={tab==='summary'} onClick={()=>choose('summary')}/>}
      {type!=='staff' && <BoardButton name="worldBoardPeople" label="Nhân sự" width={1.75} position={[-w/2+3.17,0,0]} active={tab==='people'} onClick={()=>choose('people')}/>}
      {type==='workstation' && <BoardButton name="worldBoardEquipment" label="Thiết bị" width={1.75} position={[-w/2+5,0,0]} active={tab==='equipment'} onClick={()=>choose('equipment')}/>}
      <BoardButton name="worldBoardActions" label="Thao tác" width={2} position={[w/2-1.2,0,0]} onClick={onActions}/>
    </group>
    {pages>1&&<group position={[0,-h/2+1.55,.4]}><BoardButton name="worldBoardPreviousPage" label="‹" width={.65} position={[w/2-1.8,0,0]} onClick={()=>setPage((currentPage+pages-1)%pages)}/><BoardButton name="worldBoardNextPage" label="›" width={.65} position={[w/2-.85,0,0]} onClick={()=>setPage((currentPage+1)%pages)}/></group>}
    <Html style={{pointerEvents:'none'}}><section className="se-board-accessible" aria-label={`Bảng 3D ${name}`}><h3>{name}</h3><p>{status.title}. {status.note}</p><dl>{rows.map(([label,value],index)=><div key={index}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><button onClick={()=>choose('summary')}>Tổng quan</button>{type!=='staff'&&<button onClick={()=>choose('people')}>Nhân sự</button>}{type==='workstation'&&<button onClick={()=>choose('equipment')}>Thiết bị</button>}<button onClick={onActions}>Thao tác</button><button onClick={onClose}>Đóng bảng thông tin</button>{pages>1&&<><button onClick={()=>setPage((currentPage+pages-1)%pages)}>Trang trước</button><button onClick={()=>setPage((currentPage+1)%pages)}>Trang sau</button></>}</section></Html>
  </group>;
}

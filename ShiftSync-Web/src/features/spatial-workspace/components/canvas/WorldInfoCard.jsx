import WorldInfoSummary from './WorldInfoSummary.jsx';
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { X, ArrowUpRight, Users, User, Box, CalendarDays, Clock3 } from 'lucide-react';
import { areSameStaff } from '../../utils/staffIdentity.js';
import { findStaffAttendance } from '../../utils/spatialInfoModel.js';
import { getRoleTheme } from '../../visualization/ZoneStatus.js';
import { toThreeCoords } from '../../../../components/spatial/spatial.constants.js';
import '../world-info-card.css';

const time = value => value?.slice(0, 5);

export default function WorldInfoCard({ selection, avatarMeshes, workstationMeshes, layout, staff, zones, currentShift, attendanceRecords, workstationOccupancies, zoneReqMap, storeId, onClose, onActions, actions, onBack, onVisibilityChange, anchorRef }) {
  const { camera, size, gl } = useThree();
  const root = useRef(), content = useRef(), line = useRef(), halo = useRef();
  const previousHidden = useRef(false);
  const anchorOffsets = useRef(new WeakMap());
  const scratch = useRef({ anchor: new THREE.Vector3(), projected: new THREE.Vector3(), position: new THREE.Vector3(), bounds: new THREE.Box3(), meshBounds: new THREE.Box3(), points: new Float32Array(6) });
  const { type, data } = selection;
  const width = Math.min(360, Math.max(220, size.width - 24));
  const maxHeight = Math.max(180, Math.min(440, size.height - 145));
  const role = getRoleTheme(data.skillName || data.role || data.name);
  const name = type === 'staff' ? data.staffName || data.fullName || 'Nhân viên' : data.name || (type === 'zone' ? 'Khu vực' : 'Trạm làm việc');
  const Icon = type === 'staff' ? User : type === 'zone' ? Users : Box;
  const zone = type === 'zone' ? data : zones.find(item => item.id === (data.zoneId || data.zone?.id));
  const people = staff.filter(item => type === 'workstation' ? item.workstationId === data.id : item.zoneId === data.id);
  const attendance = type === 'staff' ? findStaffAttendance(data, attendanceRecords, currentShift?.id) : null;
  const occupancy = type === 'workstation' ? workstationOccupancies?.get(data.id) : null;
  const showingActions = Boolean(actions);
  useEffect(() => {
    // Re-enter each view at its heading rather than inheriting the previous scroll.
    const body = content.current?.querySelector(showingActions ? '.se-world-actions' : '.se-world-content');
    if (body) body.scrollTop = 0;
  }, [showingActions]);
  const requirement = zoneReqMap?.[data.id];
  const shiftDate = currentShift?.shiftDate || currentShift?.date;
  const shiftHours = currentShift?.startTime && currentShift?.endTime ? `${time(currentShift.startTime)}–${time(currentShift.endTime)}` : null;
  const status = type === 'staff'
    ? { title: attendance?.checkOutTime ? 'Đã kết thúc ca' : attendance?.checkInTime ? 'Đã check-in' : 'Chưa có ghi nhận điểm danh', note: attendance?.checkInTime ? 'Trạng thái từ bản ghi chấm công của ca đang xem.' : 'Có tên trong lịch chưa có nghĩa là đã có mặt.', tone: attendance?.checkInTime && !attendance.checkOutTime ? 'success' : 'neutral' }
    : !currentShift || occupancy?.state === 'UNKNOWN'
      ? { title: 'Chưa đủ dữ liệu ca', note: occupancy?.statusReason || 'Chọn ca để xem phân công và đối chiếu nhân sự.', tone: 'neutral' }
      : type === 'workstation'
        ? { title: people.length ? `${people.length} người được phân công` : 'Chưa có người được phân công', note: data.isActive === false ? 'Trạm đang tạm đóng.' : 'Phân công theo lịch, đối chiếu điểm danh ở bên dưới.', tone: data.isActive === false || occupancy?.isOverCapacity ? 'warning' : 'neutral' }
        : { title: requirement == null ? 'Chưa thiết lập nhu cầu nhân sự' : people.length < requirement ? `Cần thêm ${requirement - people.length} người` : people.length > requirement ? `Nhiều hơn nhu cầu ${people.length - requirement} người` : 'Đủ người theo kế hoạch', note: requirement == null ? 'Chưa có chỉ tiêu để kết luận đủ hay thiếu người.' : `${people.length} đã phân công / ${requirement} cần cho ca này.`, tone: requirement != null && people.length !== requirement ? 'warning' : 'neutral' };
  useEffect(() => () => onVisibilityChange?.(false), [onVisibilityChange]);

  useFrame(() => {
    if (!root.current || !content.current) return;
    camera.updateMatrixWorld(true);
    const s = scratch.current;
    const target = type === 'staff' ? avatarMeshes.find(mesh => areSameStaff(mesh.userData?.employee, data)) : type === 'workstation' ? workstationMeshes.find(mesh => String(mesh.userData?.workstation?.id || mesh.userData?.workstationId) === String(data.id)) : null;
    if (target) {
      target.updateWorldMatrix(true, true);
      // Keep the anchor steady during idle breathing; follow the entity's actual movement.
      if (!anchorOffsets.current.has(target)) {
        s.bounds.makeEmpty();
        target.traverse(node => { if (node.isMesh && node.geometry && !node.isSprite) { if (!node.geometry.boundingBox) node.geometry.computeBoundingBox(); s.bounds.union(s.meshBounds.copy(node.geometry.boundingBox).applyMatrix4(node.matrixWorld)); } });
        if (s.bounds.isEmpty()) target.getWorldPosition(s.anchor);
        else { s.bounds.getCenter(s.anchor); s.anchor.y = s.bounds.max.y + 0.12; }
        anchorOffsets.current.set(target, target.worldToLocal(s.anchor.clone()));
      }
      target.localToWorld(s.anchor.copy(anchorOffsets.current.get(target)));
    } else {
      const frame = data.physicalFrame;
      if (frame) s.anchor.set(frame.centerX ?? frame.x ?? 0, 0.25, frame.centerZ ?? frame.z ?? 0);
      else s.anchor.set(...toThreeCoords(data.x || 0, data.y || 0, data.z || 0, layout)).add(new THREE.Vector3(0, 0.35, 0));
    }
    anchorRef?.current.copy(s.anchor);
    s.projected.copy(s.anchor).project(camera);
    const hidden = s.projected.z < -1 || s.projected.z > 1 || Math.abs(s.projected.x) > 1.1 || Math.abs(s.projected.y) > 1.1;
    if (hidden !== previousHidden.current) { previousHidden.current = hidden; onVisibilityChange?.(hidden); }
    root.current.visible = !hidden;
    if(content.current) content.current.style.visibility = hidden ? 'hidden' : 'visible';
    if (line.current) line.current.visible = !hidden;
    if (hidden) return;
    const toolbar = gl.domElement.closest('.se-workspace')?.querySelector('.se-toolbar');
    const toolbarBottom = toolbar ? toolbar.getBoundingClientRect().bottom - gl.domElement.getBoundingClientRect().top + 12 : 76;
    const marginTop = Math.max(12, Math.min(toolbarBottom, size.height - 145));
    if(content.current) content.current.style.maxHeight = `${Math.max(130, Math.min(440, size.height - marginTop - 12))}px`;
    const height = content.current.offsetHeight || 300;
    const x = THREE.MathUtils.clamp((s.projected.x + 1) * size.width / 2 + width / 2 + 24, width / 2 + 12, size.width - width / 2 - 12);
    const y = THREE.MathUtils.clamp((1 - s.projected.y) * size.height / 2 - height / 2 - 26, marginTop + height / 2, Math.max(marginTop + height / 2, size.height - height / 2 - 12));
    s.position.set(x / size.width * 2 - 1, 1 - y / size.height * 2, s.projected.z).unproject(camera);
    root.current.position.copy(s.position);
    const depth = Math.max(0.1, -s.position.clone().applyMatrix4(camera.matrixWorldInverse).z);
    const units = 2 * (camera.isOrthographicCamera ? 1 : depth) / (camera.projectionMatrix.elements[5] * size.height);
    root.current.scale.setScalar(units * 40);
    camera.getWorldQuaternion(root.current.quaternion);
    root.current.updateWorldMatrix(false, true);
    if (line.current) { s.points.set(s.anchor.toArray(), 0); s.points.set((showingActions ? s.position : s.position.clone().add(new THREE.Vector3(-width/2*units, 0, 0).applyQuaternion(camera.quaternion))).toArray(), 3); line.current.geometry.attributes.position.array.set(s.points); line.current.geometry.attributes.position.needsUpdate = true; line.current.geometry.computeBoundingSphere(); }
    if (halo.current) { halo.current.position.copy(s.anchor); halo.current.quaternion.copy(camera.quaternion); halo.current.scale.setScalar(units * 15); }
  });

  return <>
    <line ref={line} name="worldInfoLeader" renderOrder={950}><bufferGeometry><bufferAttribute attach="attributes-position" args={[new Float32Array(6), 3]}/></bufferGeometry><lineBasicMaterial color={role.color} transparent opacity={0.8} depthTest={false}/></line>
    <mesh ref={halo} renderOrder={951}><ringGeometry args={[0.65, 1, 24]}/><meshBasicMaterial color={role.color} transparent opacity={0.7} depthTest={false}/></mesh>
    <group ref={root} name="worldInfoAnchor">
      <Html transform distanceFactor={10} zIndexRange={[28, 27]}>
        <section ref={content} data-world-info={type} className={`se-world-card ${actions ? 'se-world-card--actions' : ''}`} style={{ width, maxHeight, '--world-accent': role.color }} role="region" aria-label={`Thông tin ${name}`}
          onPointerDown={event => event.stopPropagation()} onPointerUp={event => event.stopPropagation()} onClick={event => event.stopPropagation()} onWheel={event => event.stopPropagation()}>
          <header><span className="se-world-icon"><Icon size={20}/></span><div><small>{type === 'staff' ? 'NHÂN VIÊN' : type === 'zone' ? 'KHU VỰC' : 'TRẠM LÀM VIỆC'}</small><h3>{name}</h3></div><button type="button" aria-label="Đóng bảng thông tin" onClick={onClose}><X size={17}/></button></header>
          <div className="se-world-context"><span><CalendarDays size={12} aria-hidden="true"/>{shiftDate ? shiftDate.split('-').reverse().join('/') : 'Chưa có ngày ca'}</span><strong>{currentShift?.name || 'Chưa chọn ca'}</strong>{shiftHours&&<span className="se-world-hours"><Clock3 size={12} aria-hidden="true"/>{shiftHours}</span>}</div>
          {actions && <div className="se-world-action-context"><strong>Thao tác với {type === 'staff' ? 'nhân viên' : type === 'zone' ? 'khu vực' : 'trạm'}</strong><span>{type === 'staff' ? 'Theo dõi và thử phương án phân công' : type === 'zone' ? 'Xem ứng viên và phân công theo ca' : 'Chọn mục Thông tin trạm, Nhân sự & ca hoặc Thiết bị bên dưới'}</span></div>}
          {showingActions ? <div className="se-world-actions" data-world-actions>{actions}</div> : <WorldInfoSummary type={type} data={data} status={status} zone={zone} people={people} attendanceRecords={attendanceRecords} currentShift={currentShift} requirement={requirement} shiftHours={shiftHours} storeId={storeId}/> }
          <footer><span>{showingActions ? 'Esc để quay lại thông tin' : type === 'staff' ? 'Theo dõi · Phương án phân công' : type === 'zone' ? 'Ứng viên · Phân công' : 'Nhân sự · Thiết bị · Bố trí'}</span><button type="button" onClick={showingActions ? onBack : onActions}>{showingActions ? 'Quay lại thông tin' : <>Thao tác <ArrowUpRight size={15}/></>}</button></footer>
        </section>
      </Html>
    </group>
  </>;
}

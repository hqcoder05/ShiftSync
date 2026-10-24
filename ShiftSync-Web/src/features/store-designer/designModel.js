import * as THREE from 'three';
import { CATALOG, assetById } from './catalog.js';

export const MAX_ITEMS = 150;
export const clone = value => JSON.parse(JSON.stringify(value));
export const newId = () => globalThis.crypto.randomUUID();
export const emptyDesign = (floor={length:24,width:16,height:3.5}) => ({schemaVersion:1,floor:{length:floor.length,width:floor.width,height:floor.height},items:[]});
export function validateDesign(doc, workstationIds = null) {
  if (!doc || doc.schemaVersion !== 1 || !doc.floor || !Array.isArray(doc.items) || doc.items.length > MAX_ITEMS) throw new Error('Tệp thiết kế không hợp lệ hoặc vượt 150 đối tượng.');
  for (const key of ['length','width','height']) if (!Number.isFinite(doc.floor[key]) || doc.floor[key]<2 || doc.floor[key]>100) throw new Error('Kích thước mặt bằng phải từ 2 đến 100m.');
  const ids=new Set(),bindings=new Set();
  for(const item of doc.items) {
    if(typeof item.id!=='string'||!item.id||item.id.length>80||ids.has(item.id))throw new Error('Định danh đồ vật bị trùng hoặc không hợp lệ.');
    ids.add(item.id);
    if(item.asset!=='group'&&!assetById(item.asset))throw new Error('Đồ vật không thuộc thư viện.');
    if(typeof item.name!=='string'||!item.name.trim()||item.name.length>120||typeof item.locked!=='boolean')throw new Error('Tên hoặc trạng thái khóa không hợp lệ.');
    if(!Array.isArray(item.position)||item.position.length!==3||item.position.some(n=>!Number.isFinite(n)||Math.abs(n)>100)||!Number.isFinite(item.rotation)||Math.abs(item.rotation)>Math.PI*100||!Number.isFinite(item.scale)||item.scale<.1||item.scale>5)throw new Error('Vị trí, góc xoay hoặc tỷ lệ không hợp lệ.');
    if(item.dimensions&&(!Array.isArray(item.dimensions)||item.dimensions.length!==3||item.dimensions.some(n=>!Number.isFinite(n)||n<.05||n>100)))throw new Error('Kích thước đồ vật không hợp lệ.');
    if(item.workstationId) {
      if(!assetById(item.asset)?.role||bindings.has(item.workstationId)||(workstationIds&&!workstationIds.includes(item.workstationId)))throw new Error('Trạm đã được gắn, không thuộc cửa hàng hoặc không phù hợp với đồ vật.');
      bindings.add(item.workstationId);
    }
  }
  const map=new Map(doc.items.map(i=>[i.id,i]));
  for(const item of doc.items) {
    let current=item,seen=new Set();
    while(current.parentId) {
      if(seen.has(current.id)||seen.size>8)throw new Error('Nhóm bị lặp hoặc lồng quá sâu.');
      seen.add(current.id);current=map.get(current.parentId);
      if(!current||current.asset!=='group')throw new Error('Nhóm cha không tồn tại.');
    }
  }
  return clone(doc);
}
export function isLocked(doc,id) {
  const item=doc.items.find(i=>i.id===id);
  return Boolean(item&&(item.locked||(item.parentId&&isLocked(doc,item.parentId))));
}
export function worldMatrix(doc,item) {
  const local=new THREE.Matrix4().compose(new THREE.Vector3(...item.position),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),item.rotation),new THREE.Vector3().setScalar(item.scale));
  const parent=doc.items.find(i=>i.id===item.parentId);
  return parent?worldMatrix(doc,parent).multiply(local):local;
}
function transform(matrix) {
  const p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();matrix.decompose(p,q,s);
  return {position:p.toArray().map(n=>Number(n.toFixed(5))),rotation:Math.atan2(2*(q.w*q.y+q.x*q.z),1-2*(q.y*q.y+q.z*q.z)),scale:Number(s.x.toFixed(5))};
}
export function createItem(asset,id=newId()) {
  const spec=assetById(asset);
  if(!spec)throw new Error('Đồ vật không tồn tại.');
  return {id,asset,name:spec.name,position:[0,0,0],rotation:0,scale:1,parentId:null,locked:false,...(spec.dimensions?{dimensions:[...spec.dimensions]}:{})};
}
function descendants(doc,id) {return [id,...doc.items.filter(i=>i.parentId===id).flatMap(i=>descendants(doc,i.id))];}
export function editDesign(doc,action) {
  const next=clone(doc),selected=(action.ids||[]).filter(id=>doc.items.some(i=>i.id===id));
  const roots=selected.filter(id=>{let i=doc.items.find(x=>x.id===id);while(i?.parentId){if(selected.includes(i.parentId))return false;i=doc.items.find(x=>x.id===i.parentId);}return true;});
  if(action.type==='add')next.items.push(createItem(action.asset,action.id));
  if(action.type==='floor')next.floor={...next.floor,...action.values};
  if(action.type==='update') {
    const item=next.items.find(i=>i.id===action.id);
    if(item&&!isLocked(doc,item.id))Object.assign(item,action.values);
  }
  if(action.type==='lock')for(const id of roots){const i=next.items.find(i=>i.id===id);if(!i.parentId||!isLocked(doc,i.parentId))i.locked=!i.locked;}
  if(['delete','duplicate','group','ungroup'].includes(action.type)&&roots.some(id=>isLocked(doc,id)))throw new Error('Hãy mở khóa nhóm trước khi chỉnh sửa.');
  if(action.type==='delete'){const remove=new Set(roots.flatMap(id=>descendants(doc,id)));next.items=next.items.filter(i=>!remove.has(i.id));}
  if(action.type==='duplicate')for(const id of roots){
    const ids=descendants(doc,id),remap=new Map(ids.map(key=>[key,newId()]));
    for(const key of ids){const source=doc.items.find(i=>i.id===key),copy=clone(source);copy.id=remap.get(key);copy.workstationId=null;copy.parentId=remap.get(source.parentId)||source.parentId;if(key===id){copy.name+=' (bản sao)';copy.position[0]+=.5;}next.items.push(copy);}
  }
  if(action.type==='group'&&roots.length>1){
    const group={id:action.id||newId(),asset:'group',name:'Nhóm đồ vật',position:[0,0,0],rotation:0,scale:1,parentId:null,locked:false};
    const positions=roots.map(id=>new THREE.Vector3().setFromMatrixPosition(worldMatrix(doc,doc.items.find(i=>i.id===id))));
    group.position=positions.reduce((sum,p)=>sum.add(p),new THREE.Vector3()).multiplyScalar(1/positions.length).toArray();
    const inverse=new THREE.Matrix4().makeTranslation(...group.position).invert();
    for(const id of roots){const item=next.items.find(i=>i.id===id);Object.assign(item,transform(inverse.clone().multiply(worldMatrix(doc,item))),{parentId:group.id});}
    next.items.push(group);
  }
  if(action.type==='ungroup')for(const id of roots){const group=doc.items.find(i=>i.id===id);if(group.asset!=='group')continue;const parent=doc.items.find(i=>i.id===group.parentId),inverse=parent?worldMatrix(doc,parent).invert():new THREE.Matrix4();for(const item of next.items.filter(i=>i.parentId===id))Object.assign(item,transform(inverse.clone().multiply(worldMatrix(doc,item))),{parentId:group.parentId});next.items=next.items.filter(i=>i.id!==id);}
  return validateDesign(next);
}
export function seedDesign(root,floor,workstations=[]) {
  const doc=emptyDesign(floor),used=new Set();
  for(const asset of CATALOG.filter(a=>a.node)) {
    const matches=[];root.traverse(node=>{if(node.name===asset.node||(asset.id==='bistro'&&/^Bistro_Table_Group_\d+$/.test(node.name))||(asset.id==='booth'&&/^Booth_Section_\d+$/.test(node.name)))matches.push(node);});
    for(const node of matches){const item=createItem(asset.id);Object.assign(item,transform(node.matrixWorld));const ws=workstations.find(w=>node.userData.workstationId===w.id&&!used.has(w.id));if(ws){item.workstationId=ws.id;item.name=ws.name;used.add(ws.id);}doc.items.push(item);}
  }
  const back=createItem('wall');back.dimensions=[floor.length,2.7,.16];back.position=[0,0,-floor.width/2+.08];doc.items.push(back);
  const west=createItem('wall');west.dimensions=[floor.width,2.7,.16];west.position=[-floor.length/2+.08,0,0];west.rotation=Math.PI/2;doc.items.push(west);
  return validateDesign(doc);
}

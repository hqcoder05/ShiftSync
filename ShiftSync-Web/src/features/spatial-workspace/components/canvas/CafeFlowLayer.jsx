import {useEffect,useRef} from 'react';
import * as THREE from 'three';
import {geometryFootprint,getCoffeeFloorLayout} from '../../scene/StoreArrangement.js';
import {disposeHierarchy} from '../../scene/ResourceManager.js';

/** Physical wayfinding is independent of staffing/attendance status. */
export default function CafeFlowLayer({modelRoot,workstationMeshes,visible}) {
 const ref=useRef(null);
 useEffect(()=>{
  const group=ref.current;
  if(!group)return;
  const clear=()=>{for(const child of [...group.children]){group.remove(child);disposeHierarchy(child);}};
  clear();
  if(!modelRoot||!visible)return;
  const label=(text,x,z,width=2.6)=>{
   const canvas=document.createElement('canvas');canvas.width=768;canvas.height=128;
   const ctx=canvas.getContext('2d');
   ctx.fillStyle='#e9dfcf';ctx.beginPath();ctx.roundRect(2,2,764,124,16);ctx.fill();
   ctx.fillStyle='#44382d';ctx.font='600 42px Segoe UI';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,384,64);
   const material=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
   const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,width/6),material);mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.065,z);mesh.userData.isWayfinding=true;group.add(mesh);
  };
  const cashier=modelRoot.getObjectByName('Workstation_POS_01'),pickup=modelRoot.getObjectByName('Workstation_Service_01');
  if(cashier){const b=geometryFootprint(cashier);label('GỌI MÓN · THANH TOÁN',(b.minX+b.maxX)/2,b.maxZ+.8);}
  if(pickup){const b=geometryFootprint(pickup);label('NHẬN ĐỒ',(b.minX+b.maxX)/2,b.maxZ+.8,1.9);}
  const floor=getCoffeeFloorLayout(modelRoot,{length:24,width:16});
  label('LỐI ĐI',0,floor.width/2-2.6,1.5);
  const points=[new THREE.Vector3(0,.06,floor.width/2-1.2),new THREE.Vector3(0,.06,-5.5)];
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineDashedMaterial({color:0xb6a58b,dashSize:.24,gapSize:.3,transparent:true,opacity:.6}));line.computeLineDistances();group.add(line);
  return clear;
 },[modelRoot,workstationMeshes,visible]);
 return <group ref={ref} name="cafeWayfinding" />;
}

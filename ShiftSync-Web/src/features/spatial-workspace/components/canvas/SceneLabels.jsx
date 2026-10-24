import { useFrame, useThree } from '@react-three/fiber';
import {useEffect,useRef} from 'react';
import * as THREE from 'three';
/** Keep operational labels legible and prevent overlapping labels in screen space. */
export default function SceneLabels({ activeInfoSelection = null }) {
 const { scene } = useThree();
 const leaders=useRef(new Map());
 useEffect(()=>()=>{for(const line of leaders.current.values()){scene.remove(line);line.geometry.dispose();line.material.dispose();}leaders.current.clear();},[scene]);
 useFrame(state => {
  const {camera,size}=state;
  camera.updateMatrixWorld();
  const labels=[];
  scene.traverse(node=>{if(node.isSprite&&(node.userData.isZoneTag||node.userData.isWorkstationTag||node.userData.isStaffTag))labels.push(node);});
  labels.sort((a,b)=>(Number(b.userData.isSelected)*4+(Number(b.userData.isWorkstationTag)*2+Number(b.userData.isStaffTag)))-(Number(a.userData.isSelected)*4+(Number(a.userData.isWorkstationTag)*2+Number(a.userData.isStaffTag))));
  const used=[];
  const active=new Set(labels.map(label=>label.uuid));
  for(const [id,line] of leaders.current){if(!active.has(id)){scene.remove(line);line.geometry.dispose();line.material.dispose();leaders.current.delete(id);}}
  labels.forEach(sprite=>{
   if(activeInfoSelection){sprite.visible=false;const line=leaders.current.get(sprite.uuid);if(line)line.visible=false;return;}
   if(sprite.userData.isZoneTag){
    if(!sprite.userData.labelAnchor)sprite.userData.labelAnchor=sprite.position.clone();
    sprite.position.copy(sprite.userData.labelAnchor);sprite.updateWorldMatrix(true,false);
   }
   const oldLine=leaders.current.get(sprite.uuid);if(oldLine)oldLine.visible=false;
   let parent=sprite.parent,visible=true;while(parent){if(!parent.visible)visible=false;parent=parent.parent;}
   const position=sprite.getWorldPosition(new THREE.Vector3()),projected=position.clone().project(camera);
   if(!visible||projected.z>1||projected.z< -1){sprite.visible=false;return;}
   const operational=sprite.userData.isZoneTag||sprite.userData.isWorkstationTag;
   const width=operational?Math.min(sprite.userData.isSelected?260:240,size.width-24):sprite.userData.isSelected?175:145;
   const height=operational?width*192/720:40;
   const depth=-position.clone().applyMatrix4(camera.matrixWorldInverse).z;
   const units=camera.isOrthographicCamera?(camera.top-camera.bottom)/camera.zoom/size.height:2*Math.max(.01,depth)*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))/size.height;
   sprite.scale.set(width*units,height*units,1);
   const x=(projected.x+1)*size.width/2,y=(1-projected.y)*size.height/2;
   const step=height+10;
   const offsets=sprite.userData.isZoneTag?[[0,0],[0,step],[0,-step],[70,step],[-70,step],[0,step*2],[0,-step*2]]:[[0,0]];
   let placement=null;
   for(const [dx,dy] of offsets){
    const box={left:x+dx-width/2,right:x+dx+width/2,top:y+dy-height/2,bottom:y+dy+height/2};
    if(box.left<4||box.right>size.width-4||box.top<4||box.bottom>size.height-4)continue;
    if(!used.some(other=>box.left<other.right+6&&box.right>other.left-6&&box.top<other.bottom+6&&box.bottom>other.top-6)){placement={box,dx,dy};break;}
   }
   sprite.visible=Boolean(placement);
   if(placement){
    used.push(placement.box);
    if(placement.dx||placement.dy){
     const end=position.clone().add(new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion).multiplyScalar(placement.dx*units)).add(new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion).multiplyScalar(-placement.dy*units));
     sprite.position.copy(sprite.parent.worldToLocal(end.clone()));sprite.updateWorldMatrix(true,false);
     let line=leaders.current.get(sprite.uuid);
     if(!line){line=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0x94a3b8,transparent:true,opacity:.8,depthTest:false}));line.renderOrder=899;leaders.current.set(sprite.uuid,line);scene.add(line);}
     line.geometry.setFromPoints([position,end]);line.visible=true;
    }
   }
  });
 });
 return null;
}

import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {mergeGeometries,mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const CREW_ROLES={
 barista:{shirt:0xe7dfcf,apron:0x315a4c,pants:0x303b37,hair:0x29221e,skin:0xd9a77e,style:'swept',label:'Pha chế'},
 cashier:{shirt:0xf2e8d8,apron:0xa45e42,pants:0x3d3937,hair:0x32251f,skin:0xe8bb96,style:'bun',label:'Thu ngân'},
 manager:{shirt:0x34495d,apron:null,pants:0x27333f,hair:0x282321,skin:0xc68e67,style:'crop',label:'Quản lý'},
 chef:{shirt:0xf0eadd,apron:0x797c54,pants:0x3b4139,hair:0x372a22,skin:0xe0ae84,style:'cap',label:'Đầu bếp'},
};

/** Rigid-joint crew, +Z forward, metres, feet at zero. Materials merged per joint. */
export function buildCrewModel(role='barista',gender='MALE'){
 const female=gender==='FEMALE';
 const theme={...(CREW_ROLES[role]||CREW_ROLES.barista),...(female?{hair:0x171513}:{}),style:female?'long':role==='chef'?'cap':'swept'};
 const root=new THREE.Group();root.name=`ShiftSync_CrewV2_${role}`;
 root.userData={designVersion:2,role,gender:female?'FEMALE':'MALE',units:'metres',forward:'+Z'};
 const materials={};
 const material=(name,color,roughness=.84)=>materials[name]??=(new THREE.MeshStandardMaterial({name,color,roughness,metalness:0}));
 const skin=material('crew_skin',theme.skin),hair=material('crew_hair',theme.hair),shirt=material('crew_shirt',theme.shirt);
 const pants=material('crew_trousers',theme.pants),shoe=material('crew_shoes',0x30302c),sole=material('crew_soles',0xbab5a6);
 const apron=theme.apron?material('crew_apron',theme.apron):shirt;
 const dark=material('crew_eyes',0x302920),light=material('crew_eye_glint',0xfff6e9),brass=material('crew_brass',0xc8a86a,.5);
 const pocket=material('crew_seam',new THREE.Color(theme.apron||theme.shirt).multiplyScalar(.78));
 const lip=material('crew_smile',0x895345),blush=material('crew_cheeks',0xc68768);
 const mesh=(parent,name,geometry,mat,x=0,y=0,z=0)=>{const n=new THREE.Mesh(geometry,mat);n.name=name;n.position.set(x,y,z);parent.add(n);return n;};
 const box=(p,n,w,h,d,m,x,y,z,r=.025)=>mesh(p,n,new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/3,h/3,d/3)),m,x,y,z);
 const sphere=(p,n,rx,ry,rz,m,x,y,z)=>{const g=new THREE.SphereGeometry(1,16,12);g.scale(rx,ry,rz);return mesh(p,n,g,m,x,y,z);};
 const joint=(p,name,x,y,z)=>{const n=new THREE.Group();n.name=name;n.position.set(x,y,z);p.add(n);return n;};
 const hips=joint(root,'Hips',0,.76,0),spine=joint(hips,'Spine',0,.08,0);
 box(hips,'Pelvis',.33,.16,.22,pants,0,-.015,0,.055);
 box(spine,'Shirt',female?.355:.39,.45,.235,shirt,0,.2,0,.07);
 box(spine,'Hem',.35,.055,.24,shirt,0,-.005,.005,.018);
 sphere(spine,'Neck',.064,.075,.062,skin,0,.48,0);
 for(const side of [-1,1]){
  const hip=joint(hips,side<0?'LeftHip':'RightHip',side*.094,-.035,0);
  box(hip,'TrouserUpper',.145,.335,.17,pants,0,-.145,0,.045);
  const knee=joint(hip,side<0?'LeftKnee':'RightKnee',0,-.31,0);
  box(knee,'TrouserLower',.126,.315,.145,pants,0,-.145,0,.035);
  const ankle=joint(knee,side<0?'LeftAnkle':'RightAnkle',0,-.325,0);
  box(ankle,'Sole',.15,.04,.26,sole,0,-.065,.045,.017);
  box(ankle,'Shoe',.144,.09,.245,shoe,0,-.025,.04,.035);
  box(ankle,'ShoeVamp',.095,.018,.065,pocket,0,.018,.09,.006);
  const shoulder=joint(spine,side<0?'LeftShoulder':'RightShoulder',side*(female?.205:.221),.36,0);
  shoulder.rotation.z=side*.075;
  box(shoulder,'Sleeve',.145,.21,.177,shirt,0,-.06,0,.05);
  sphere(shoulder,'UpperArm',.057,.12,.06,skin,0,-.175,0);
  const elbow=joint(shoulder,side<0?'LeftElbow':'RightElbow',0,-.245,0);
  box(elbow,'Forearm',.1,.215,.11,skin,0,-.09,.007,.036);
  const wrist=joint(elbow,side<0?'LeftWrist':'RightWrist',0,-.19,.006);
  box(wrist,'Hand',.09,.115,.07,skin,0,-.04,.012,.026);
  sphere(wrist,'Thumb',.025,.044,.025,skin,-side*.045,-.023,.038);
  if(role==='manager'&&side<0)box(wrist,'Watch',.112,.035,.116,shoe,0,.015,0,.01);
 }
 // Front opening collar, two buttons, compact role insignia.
 for(const side of [-1,1]){
  const collar=box(spine,'Collar',.088,.1,.026,role==='manager'?material('crew_collar',0xd8d4c8):shirt,side*.051,.405,.129,.012);
  collar.rotation.z=-side*.32;
 }
 box(spine,'Placket',.022,.14,.012,pocket,0,.322,.124,.005);
 for(const y of [.305,.35])sphere(spine,'Button',.008,.008,.006,brass,0,y,.136);
 if(theme.apron){
  box(spine,'ApronBib',.24,.28,.018,apron,0,.245,.133,.022);
  box(spine,'ApronSkirt',.345,.34,.026,apron,0,-.035,.146,.03);
  box(spine,'WaistBand',.37,.035,.035,pocket,0,.09,.145,.012);
  for(const side of [-1,1]){
   const strap=box(spine,'ApronStrap',.035,.14,.024,apron,side*.09,.38,.125,.009);strap.rotation.z=-side*.12;
   sphere(spine,'ApronRivet',.011,.011,.008,brass,side*.09,.35,.153);
  }
  box(spine,'ApronPocket',.17,.105,.014,pocket,0,-.026,.165,.014);
  box(spine,'PocketEdge',.17,.012,.012,apron,0,.019,.177,.004);
  if(role==='barista')box(spine,'Towel',.075,.18,.018,material('crew_towel',0xc8baa1),.13,-.1,.17,.012);
 }
 box(spine,'NameBadge',.09,.036,.013,brass,role==='manager'?-.105:0,.27,.155,.006);
 box(spine,'BadgeLine',.055,.006,.006,pocket,role==='manager'?-.105:0,.27,.164,.002);
 if(role==='manager'){
  box(spine,'ShirtPocket',.1,.1,.015,pocket,-.105,.245,.132,.012);
  box(spine,'Pen',.012,.09,.012,brass,.115,.287,.137,.004);
 }
 if(role==='chef')for(const x of [-.07,.07])for(const y of [.16,.25])sphere(spine,'ChefButton',.009,.009,.005,pocket,x,y,.14);
 const head=joint(spine,'Head',0,.67,0);
 sphere(head,'Face',.146,.19,.139,skin,0,0,.008);
 sphere(head,'Jaw',female?.113:.125,.104,.119,skin,0,-.083,.018);
 for(const side of [-1,1]){
  sphere(head,'Ear',.034,.053,.03,skin,side*.145,-.018,0);
  sphere(head,'Eye',.012,.016,.009,dark,side*.055,.012,.139);
  sphere(head,'EyeGlint',.0035,.004,.003,light,side*.055-.003,.016,.146);
  const brow=box(head,'Brow',.034,.009,.009,hair,side*.055,.051,.133,.004);brow.rotation.z=-side*.05;
  sphere(head,'Cheek',.022,.01,.003,blush,side*.083,-.036,.128);
 }
 sphere(head,'Nose',.022,.032,.027,skin,0,-.014,.144);
 const smile=new THREE.CatmullRomCurve3([new THREE.Vector3(-.027,-.066,.138),new THREE.Vector3(0,-.073,.143),new THREE.Vector3(.027,-.066,.138)]);
 mesh(head,'Smile',new THREE.TubeGeometry(smile,8,.0035,5,false),lip);
 const cap=new THREE.SphereGeometry(1,20,12,0,Math.PI*2,0,Math.PI*.53);cap.scale(.153,.19,.147);mesh(head,'HairCap',cap,hair,0,.026,-.009);
 box(head,'HairBack',.257,.155,.055,hair,0,.027,-.116,.024);
 if(theme.style==='long'){
  // Swept fringe follows the forehead; a low ponytail keeps the face and collar clear.
  const longHair=joint(head,'LongHair',0,0,0);
  longHair.userData.hairStyle='low-ponytail';
  const fringeCurve=new THREE.CatmullRomCurve3([
   new THREE.Vector3(-.11,.095,.101),new THREE.Vector3(-.055,.145,.118),
   new THREE.Vector3(.035,.125,.135),new THREE.Vector3(.108,.065,.103),
  ]);
  const fringeGeometry=new THREE.TubeGeometry(fringeCurve,12,.024,7,false);
  mesh(longHair,'SideSweptFringe',fringeGeometry,hair);
  sphere(longHair,'NapeHair',.112,.095,.045,hair,0,-.045,-.129);
  const tailCurve=new THREE.CatmullRomCurve3([
   new THREE.Vector3(0,-.035,-.17),new THREE.Vector3(.025,-.16,-.205),
   new THREE.Vector3(.045,-.31,-.19),new THREE.Vector3(.035,-.43,-.15),
  ]);
  const tailGeometry=new THREE.TubeGeometry(tailCurve,14,.052,9,false);
  // Taper the end instead of leaving a blunt tube.
  const positions=tailGeometry.attributes.position;
  for(let ring=0;ring<=14;ring++){
   const center=tailCurve.getPointAt(ring/14),scale=1-.74*Math.pow(ring/14,1.6);
   for(let side=0;side<=9;side++){
    const index=ring*10+side;
    positions.setXYZ(index,center.x+(positions.getX(index)-center.x)*scale,center.y+(positions.getY(index)-center.y)*scale,center.z+(positions.getZ(index)-center.z)*scale);
   }
  }
  tailGeometry.computeVertexNormals();
  mesh(longHair,'LowPonytail',tailGeometry,hair);
  sphere(longHair,'HairTie',.057,.023,.034,material('crew_hair_tie',0x393731),0,-.065,-.177);
 }else if(theme.style!=='cap'){
  for(let i=0;i<3;i++){const lock=sphere(head,'SweptHair',.07,.05,.081,hair,-.065+i*.05,.146-i*.014,.074);lock.rotation.z=-.22;}
 }
 if(role==='chef'){
  box(head,'ChefCapBand',.301,.065,.285,shirt,0,.158,-.004,.027);
  sphere(head,'ChefCapCrown',.16,.085,.15,shirt,0,.215,-.02);
 }
 // Merge static pieces inside each articulated group, sharing one buffer per material.
 const nodes=[];root.traverse(n=>{if(n.isGroup)nodes.push(n);});
 nodes.forEach(node=>{
  const batches=new Map();
  for(const child of [...node.children])if(child.isMesh){child.updateMatrix();const g=(child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone()).applyMatrix4(child.matrix);const list=batches.get(child.material)||[];list.push(g);batches.set(child.material,list);node.remove(child);child.geometry.dispose();}
  for(const [mat,geometries]of batches){const merged=mergeGeometries(geometries,false);const geometry=mergeVertices(merged,1e-5);merged.dispose();geometries.forEach(g=>g.dispose());const n=new THREE.Mesh(geometry,mat);n.name=`${node.name}_${mat.name}`;n.castShadow=true;n.receiveShadow=true;node.add(n);}
 });
 return root;
}

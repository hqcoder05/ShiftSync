import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {mergeGeometries,mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const CAFE_STORE_URL='/models/store-v2/shiftsync-cafe.glb';

/** Metres, +Z entrance. Semantic groups remain movable independently of decoration. */
export function buildCafeStoreModel(font=null){
 const root=new THREE.Group();root.name='ShiftSync_Store_DigitalTwin';
 root.userData={storeDesignVersion:2,design:'Oak & Moss',units:'metres',length:22.2,width:14.22,height:3.5};
 const materials={};
 const mat=(name,color,roughness=.8,metalness=0)=>materials[name]??=new THREE.MeshStandardMaterial({name:`cafe_v2_${name}`,color,roughness,metalness});
 const oak=mat('oak',0xb88c61),oakLight=mat('oak_edge',0xd1b18b),cream=mat('plaster',0xe8dfcf),stone=mat('limestone',0xd2c4af);
 const green=mat('moss',0x38574c),fabric=mat('sage_fabric',0x718677),terracotta=mat('clay',0xb9765c),ivory=mat('ivory',0xf3eadb);
 const charcoal=mat('charcoal',0x303e38),brass=mat('brass',0xb19861,.4,.5),steel=mat('steel',0xa9b2ad,.35,.65),coffee=mat('coffee',0x423128);
 const leaf=mat('leaf',0x43664c),leafLight=mat('leaf_light',0x71845a),sand=mat('sand_fabric',0xc4b497),glow=mat('warm_light',0xffe2ac,.5);
 glow.emissive=new THREE.Color(0xffd294);glow.emissiveIntensity=.45;
 const glass=mat('glass',0xb5c8c1,.18);glass.transparent=true;glass.opacity=.13;glass.depthWrite=false;
 const screen=mat('screen',0x42665a,.5);screen.emissive=new THREE.Color(0x42665a);screen.emissiveIntensity=.2;
 const group=(p,name,layer,x=0,y=0,z=0)=>{const g=new THREE.Group();g.name=name;if(layer)g.userData.layer=layer;g.position.set(x,y,z);p.add(g);return g;};
 const mesh=(p,name,geo,m,x=0,y=0,z=0)=>{const n=new THREE.Mesh(geo,m);n.name=name;n.position.set(x,y,z);n.castShadow=true;n.receiveShadow=true;p.add(n);return n;};
 const box=(p,n,w,h,d,m,x=0,y=0,z=0,r=0)=>mesh(p,n,r?new RoundedBoxGeometry(w,h,d,1,Math.min(r,w/3,h/3,d/3)):new THREE.BoxGeometry(w,h,d),m,x,y,z);
 const cyl=(p,n,rt,rb,h,m,x=0,y=0,z=0,segments=16)=>mesh(p,n,new THREE.CylinderGeometry(rt,rb,h,segments),m,x,y,z);
 const orb=(p,n,x,y,z,sx,sy,sz,m)=>{const g=new THREE.SphereGeometry(1,10,7);g.scale(sx,sy,sz);return mesh(p,n,g,m,x,y,z);};
 const text=(p,words,x,y,z,size,m=ivory)=>{
  if(!font)return;
  const geo=new THREE.ShapeGeometry(font.generateShapes(words,size),3);geo.computeBoundingBox();geo.translate(-(geo.boundingBox.max.x-geo.boundingBox.min.x)/2,0,0);
  return mesh(p,`Lettering_${words.replaceAll(' ','_')}`,geo,m,x,y,z);
 };
 // Merge only within a semantic unit; never merge a workstation or seating set into its neighbour.
 const compact=p=>{
  const buckets=new Map();p.updateWorldMatrix(true,true);const inverse=p.matrixWorld.clone().invert(),old=[];
  p.traverse(n=>{if(!n.isMesh)return;old.push(n);let g=n.geometry.index?n.geometry.toNonIndexed():n.geometry.clone();g.applyMatrix4(inverse.clone().multiply(n.matrixWorld));const b=buckets.get(n.material)||[];b.push(g);buckets.set(n.material,b);});
  old.forEach(n=>{n.removeFromParent();n.geometry.dispose();});
  for(const[m,list]of buckets){const merged=mergeGeometries(list,false),indexed=mergeVertices(merged);mesh(p,`Baked_${p.name}_${m.name}`,indexed,m);merged.dispose();list.forEach(g=>g.dispose());}
  // Remove empty temporary prop groups after baking their transforms.
  const empty=[];p.traverse(n=>{if(n!==p&&n.isGroup)empty.push(n);});empty.reverse().forEach(n=>{if(!n.children.length)n.removeFromParent();});
 };
 const plant=(p,x,z,scale=1)=>{
  const g=group(p,'Planter',null,x,0,z);cyl(g,'Pot',.19*scale,.14*scale,.33*scale,cream,0,.165*scale,0);
  cyl(g,'Soil',.17*scale,.17*scale,.018,coffee,0,.33*scale,0);
  cyl(g,'Stem',.018,.022,.9*scale,oak,0,.7*scale,0,8);
  for(let i=0;i<7;i++){const a=i*2.4;const n=orb(g,'Foliage',Math.sin(a)*.18*scale,(.65+i*.095)*scale,Math.cos(a)*.16*scale,.12*scale,.26*scale,.06*scale,i%2?leaf:leafLight);n.rotation.set(.35*Math.cos(a),a,.5*Math.sin(a));}
  return g;
 };
 const mug=(p,x,y,z)=>{cyl(p,'Cup',.055,.04,.105,ivory,x,y+.052,z,12);cyl(p,'Coffee',.048,.048,.003,coffee,x,y+.106,z,12);const g=new THREE.TorusGeometry(.032,.009,6,10);mesh(p,'Cup_handle',g,ivory,x+.052,y+.055,z);};
 const chair=(p,x,z,rotation=0,seatMat=fabric)=>{
  const g=group(p,'Chair',null,x,0,z);g.rotation.y=rotation;
  box(g,'Seat',.45,.09,.44,seatMat,0,.46,0,.055);
  box(g,'Curved_back',.46,.35,.08,seatMat,0,.72,-.19,.045);
  for(const side of [-1,1]){box(g,'Back_support',.035,.38,.035,oak,side*.18,.59,-.18);for(const front of [-1,1]){const leg=box(g,'Leg',.038,.42,.038,oak,side*.17,.22,front*.15);leg.rotation.z=-side*.055;}}
  return g;
 };

 const shell=group(root,'Architectural_Shell');
 const floors=group(shell,'Store_Floor_System','floor');
 box(floors,'Main_Floor_Plinth',22.2,.18,14.22,stone,0,-.09,0,.06);
 box(floors,'Floor_Terrazzo',22.04,.014,14.06,cream,0,-.002,0);
 box(floors,'Zone_Dining_Floor',8.84,.018,13.1,oakLight,6.1,.005,0);
 // Long oak boards read as construction rather than a checkerboard floor.
 for(let i=0;i<29;i++)box(floors,`Floor_Board_Seam_${i}`,.012,.003,13.08,oak,1.77+i*.305,.016,0);
 box(floors,'Zone_Barista_Floor',8.6,.012,5.2,stone,-5.8,.007,-3.8);
 box(floors,'Zone_Storage_Floor',4.8,.012,4.2,stone,-8.2,.007,4.4);
 box(floors,'Floor_Divider_Brass',.026,.006,13.1,brass,1.67,.019,0);
 box(floors,'Store_Entrance_Mat',2.8,.018,1.25,green,0,.018,6.05,.04);
 // Back and west are full height; the front/right are deliberate architectural cutaways.
 const back=group(shell,'Store_Wall_Back','walls');
 box(back,'Plaster',22.2,3.5,.18,cream,0,1.75,-7.02);
 box(back,'Sage_wainscot',12.6,1.12,.06,green,-3.8,.56,-6.9);
 box(back,'Picture_rail',12.7,.045,.1,oakLight,-3.8,1.13,-6.85);
 for(let i=0;i<34;i++)box(back,'Back_slats',.055,1.02,.035,oakLight,-9.9+i*.36,.56,-6.86);
 box(back,'Brand_panel',5.2,1.1,.05,green,-5.3,2.26,-6.86,.1);
 text(back,'SHIFTSYNC',-5.3,2.32,-6.82,.32);text(back,'COFFEE & EVERYDAY',-5.3,2.05,-6.82,.12,oakLight);
 for(const x of [2.7,4.2,5.7]){box(back,'Art_frame',1.05,1.28,.08,oak,x,2.2,-6.86,.02);box(back,'Art_paper',.94,1.17,.015,ivory,x,2.2,-6.81);cyl(back,'Art_botanical',.26,.26,.014,fabric,x,2.2,-6.79).rotation.x=Math.PI/2;}
 compact(back);
 const west=group(shell,'Store_Wall_West','walls');box(west,'Wall',.18,3.5,14.05,cream,-11.01,1.75,0);box(west,'Baseboard',.06,.15,14,oak,-10.88,.075,0);compact(west);
 const east=group(shell,'Window_East_Cutaway','walls');
 box(east,'Window_sill',.21,.25,14.05,cream,11.01,.125,0);
 for(const z of [-6.9,-3.5,0,3.5,6.9]){box(east,'Window_mullion',.065,2.85,.065,charcoal,11.01,1.68,z);}
 box(east,'Window_rail',.055,.055,14,charcoal,11.01,2.88,0);box(east,'Glass',.018,2.55,13.9,glass,11.01,1.6,0);compact(east);
 const front=group(shell,'Store_Wall_Front_Cutaway','walls');
 for(const side of [-1,1]){box(front,'Low_front_wall',8.9,.2,.18,cream,side*6.65,.1,7.02);box(front,'Entrance_jamb',.08,2.75,.1,charcoal,side*1.7,1.375,7.02);}
 box(front,'Entrance_transom',3.5,.08,.1,charcoal,0,2.75,7.02);
 // Door leaves are recessed and open to the sides, leaving the centre accessible.
 for(const side of [-1,1]){const door=group(front,'Entrance_Double_Doors',null,side*1.7,0,7.02);door.rotation.y=side*Math.PI*.43;box(door,'Glass_leaf',1.48,2.58,.02,glass,-side*.74,1.34,0);box(door,'Door_edge',.045,2.62,.05,charcoal,-side*1.49,1.34,0);cyl(door,'Handle',.016,.016,.55,brass,-side*1.36,1.3,.05,8);}
 compact(front);
 // Back of house enclosure with a real gap for access, kept inside its existing footprint.
 const storageEast=group(shell,'Partition_Storage_East','walls');box(storageEast,'Panel',.16,1.75,4.4,cream,-5.8,.875,4.8);box(storageEast,'Cap',.2,.05,4.4,oak,-5.8,1.77,4.8);compact(storageEast);
 const storageSouth=group(shell,'Partition_Storage_South','walls');
 box(storageSouth,'Panel',3.6,1.75,.16,cream,-9.2,.875,2.6);box(storageSouth,'Cap',3.6,.05,.2,oak,-9.2,1.77,2.6);compact(storageSouth);
 for(const [i,x]of [-9.6,9.6].entries()){const col=group(shell,`Store_Column_0${i+1}`,'furniture',x,0,-6.5);box(col,'Shaft',.62,3.5,.62,cream,0,1.75,0,.035);box(col,'Oak_sleeve',.68,1.05,.68,oak,0,.525,0,.03);compact(col);}

 const zones=group(root,'Zones','zones');
 for(const[name,x,z]of [['POS',-1.84,-2],['Barista',-5,-2],['CustomerService',-8.1,-2],['Dining',5,0],['Storage',-8.4,4.6],['Entrance',0,5.2]])group(zones,`Zone_${name}`,'zones',x,0,z);
 const workstations=group(root,'Workstations');
 const counter=(name,type,w,d,x,z)=>{
  const g=group(workstations,name,'workstations',x,0,z);g.userData.workstationType=type;
  box(g,'Toe_kick',w-.14,.12,d-.12,charcoal,0,.06,0,.018);
  box(g,'Cabinet',w-.08,.77,d-.08,green,0,.5,0,.04);
  box(g,'Stone_top',w,.09,d,ivory,0,.93,0,.035);
  for(let i=0;i<Math.floor(w/.15);i++)box(g,'Flute',.052,.68,.025,oakLight,-w/2+.11+i*.15,.5,d/2-.025,.006);
  box(g,'Warm_toe_strip',w-.22,.018,.012,glow,0,.13,d/2-.055);
  for(const side of [-1,1])box(g,'Cabinet_side',.025,.74,d-.11,oak,side*(w/2-.035),.5,0);
  return g;
 };
 const pos=counter('Workstation_POS_01','POS',2.4,1.1,-1.84,-2);
 cyl(pos,'Terminal_foot',.13,.15,.035,charcoal,-.45,.997,-.1);box(pos,'Terminal_stand',.055,.2,.06,charcoal,-.45,1.1,-.1);
 box(pos,'Terminal',.47,.31,.045,charcoal,-.45,1.29,-.1,.018);box(pos,'Staff_screen',.42,.26,.006,screen,-.45,1.29,-.126);
 for(let i=0;i<3;i++)box(pos,'Screen_row',.24,.018,.008,ivory,-.48,1.36-i*.058,-.132);
 box(pos,'Card_reader',.12,.055,.18,charcoal,.2,1.01,.16,.012);box(pos,'Receipt_printer',.21,.15,.2,charcoal,.55,1.05,-.1,.018);box(pos,'Receipt',.09,.04,.004,ivory,.55,1.145,.005);
 box(pos,'Small_order_sign',.56,.23,.028,green,.65,1.16,.35,.012);text(pos,'ORDER',.65,1.14,.367,.09);compact(pos);
 const bar=counter('Workstation_Barista_01','BARISTA',3.6,1.2,-5,-2);
 const machine=group(bar,'Commercial_Espresso_Machine',null,-.45,.98,0);
 box(machine,'Machine_body',1.08,.43,.57,green,0,.3,0,.05);box(machine,'Steel_roof',1.1,.04,.58,steel,0,.53,0,.015);
 box(machine,'Service_face',.98,.24,.025,steel,0,.28,-.29);box(machine,'Drip_tray',1.02,.045,.3,steel,0,.04,-.22,.008);
 for(const x of [-.29,.29]){cyl(machine,'Group_head',.06,.06,.11,steel,x,.18,-.22);box(machine,'Portafilter',.18,.035,.055,charcoal,x,.13,-.32,.012);mug(machine,x,.065,-.25);}
 for(let i=0;i<4;i++)mug(machine,-.34+i*.22,.55,.02);
 for(const x of [.55,1.16]){box(bar,'Grinder_base',.31,.06,.34,charcoal,x,1.01,.04,.02);cyl(bar,'Grinder_body',.1,.12,.3,steel,x,1.18,.08);cyl(bar,'Bean_hopper',.115,.075,.19,coffee,x,1.43,.08);cyl(bar,'Hopper_lid',.125,.125,.025,charcoal,x,1.535,.08);box(bar,'Grinder_chute',.08,.06,.14,charcoal,x,1.17,-.06);}
 box(bar,'Sink_rim',.4,.012,.4,steel,-1.32,.982,.02,.025);box(bar,'Sink_bowl',.3,.014,.3,charcoal,-1.32,.99,.02,.025);cyl(bar,'Tap',.018,.018,.28,steel,-1.32,1.13,.19,8);box(bar,'Tap_spout',.035,.035,.16,steel,-1.32,1.26,.12,.008);compact(bar);
 const pickup=counter('Workstation_Service_01','SERVICE',1.65,1.2,-7.705,-2);
 box(pickup,'Pickup_sign',.87,.3,.03,green,0,1.18,.35,.018);text(pickup,'PICK UP',0,1.15,.367,.11);
 for(const x of [-.48,.45]){cyl(pickup,'Takeaway_cup',.065,.05,.16,ivory,x,1.06,0);cyl(pickup,'Lid',.07,.07,.02,charcoal,x,1.15,0);box(pickup,'Cup_sleeve',.115,.07,.12,oak,x,1.065,0,.008);}compact(pickup);
 const kitchen=counter('Workstation_Kitchen_01','KITCHEN',2.2,1.1,-8.3,-5);
 box(kitchen,'Pastry_base',1.8,.09,.78,steel,0,1.02,0,.02);box(kitchen,'Display_glass',1.79,.5,.76,glass,0,1.31,0,.03);
 for(const y of [1.09,1.3]){box(kitchen,'Display_shelf',1.67,.02,.65,ivory,0,y,0);for(const x of [-.55,0,.55])orb(kitchen,'Pastry',x,y+.065,0,.13,.065,.08,terracotta);}compact(kitchen);

 const customer=group(root,'Customer_Furniture','furniture');
 const booths=group(customer,'Dining_Booths_Cluster','furniture');
 for(let i=0;i<3;i++){
  const g=group(booths,`Booth_Section_${i}`,'furniture',9.6,0,[-3.9,0,3.9][i]);
  box(g,'Banquette_base',.67,.36,1.86,oak,.65,.18,0,.04);box(g,'Banquette_seat',.71,.16,1.88,green,.64,.44,0,.065);box(g,'Banquette_back',.16,.72,1.9,green,.94,.77,0,.055);
  for(let j=0;j<5;j++)box(g,'Back_channel',.025,.59,.018,fabric,.849,.78,-.74+j*.37,.006);
  box(g,'Table_top',.78,.065,1.14,ivory,-.05,.76,0,.07);cyl(g,'Pedestal',.045,.055,.66,charcoal,-.05,.39,0);cyl(g,'Foot',.26,.29,.04,charcoal,-.05,.025,0);
  chair(g,-.79,0,-Math.PI/2,sand);mug(g,-.08,.8,.25);compact(g);
 }
 const bistros=group(customer,'Bistro_Tables_And_Chairs','furniture');
 for(let i=0;i<4;i++){
  const g=group(bistros,`Bistro_Table_Group_${i}`,'furniture',i%2?6.1:3.2,0,i<2?-4:i===2?3.1:4.1);
  cyl(g,'Bistro_Tabletop',.43,.43,.065,oakLight,0,.755,0,28);cyl(g,'Table_stem',.04,.06,.69,charcoal,0,.37,0);cyl(g,'Table_foot',.23,.25,.035,charcoal,0,.02,0);
  chair(g,-.72,0,-Math.PI/2,i%2?terracotta:fabric);chair(g,.72,0,Math.PI/2,i%2?terracotta:fabric);
  cyl(g,'Small_vase',.04,.05,.12,cream,.1,.85,.04,10);orb(g,'Vase_leaf',.1,.96,.04,.08,.09,.05,leaf);mug(g,-.16,.79,.16);compact(g);
 }
 const communal=group(customer,'Communal_Work_Table_Group','furniture',6.2,0,0);
 box(communal,'Communal_Tabletop',2.8,.09,.84,oakLight,0,.83,0,.07);
 for(const x of [-.94,.94]){box(communal,'Trestle',.075,.75,.64,green,x,.4,0,.02);box(communal,'Foot',.28,.06,.74,green,x,.04,0,.02);}
 for(const x of [-.93,0,.93])for(const side of [-1,1])chair(communal,x,side*.78,side>0?0:Math.PI,sand);
 box(communal,'Power_rail',1.5,.022,.085,charcoal,0,.888,0,.01);for(const x of [-.55,.55])box(communal,'Power_outlet',.14,.005,.052,ivory,x,.902,0);compact(communal);
 const lounge=group(customer,'Lounge_Seating_Nook','furniture',6.2,0,5.8);
 for(const side of [-1,1]){
  const g=group(lounge,'Lounge_chair',null,side*.94,0,0);g.rotation.y=-side*.16;
  for(const x of [-.26,.26])for(const z of [-.22,.22])cyl(g,'Foot',.025,.028,.22,oak,x,.11,z,8);
  box(g,'Seat',.66,.19,.62,side<0?fabric:terracotta,0,.38,0,.09);box(g,'Back',.69,.48,.15,side<0?fabric:terracotta,0,.65,-.24,.065);
  for(const x of [-.32,.32])box(g,'Arm',.13,.24,.6,side<0?fabric:terracotta,x,.54,0,.055);
  box(g,'Cushion',.31,.23,.11,ivory,.06,.61,-.12,.04);
 }
 cyl(lounge,'Coffee_Table_Marble',.38,.4,.055,ivory,0,.46,.12,28);cyl(lounge,'Coffee_Table_base',.17,.22,.42,green,0,.22,.12);mug(lounge,.08,.5,.12);compact(lounge);
 const logistics=group(root,'Furniture_Storage_And_Logistics','furniture',-8.45,0,4.7);
 for(const x of [-1.3,1.3]){
  for(const dx of [-.48,.48])for(const z of [-.33,.33])box(logistics,'Rack_upright',.035,1.65,.035,charcoal,x+dx,.825,z);
  for(const y of [.12,.65,1.2,1.65]){box(logistics,'Rack_shelf',1.04,.04,.74,oak,x,y,0);for(const dx of [-.26,.26])box(logistics,'Stock_box',.34,.32,.46,sand,x+dx,y+.18,0,.018);}
 }compact(logistics);
 const decor=group(root,'Decor_Cafe_Greenery','furniture');
 for(const[x,z,s]of [[-10.2,-5.9,1.2],[-10.2,1.1,1.3],[10.3,-6,1.15],[10.3,5.9,1.1]])plant(decor,x,z,s);compact(decor);
 const shelving=group(root,'Decor_Backbar_Shelves','furniture');
 for(const y of [1.45,2.02]){box(shelving,'Shelf',3.6,.055,.34,oak,-5.3,y,-6.68);for(let i=0;i<8;i++){cyl(shelving,'Tin',.07,.07,.17,i%2?green:ivory,-6.75+i*.41,y+.115,-6.66,12);}}
 box(shelving,'Menu_board',2.1,1.1,.07,charcoal,-1.1,2.1,-6.83,.03);text(shelving,'COFFEE',-1.1,2.43,-6.786,.17);text(shelving,'ESPRESSO   35',-1.1,2.18,-6.786,.09);text(shelving,'LATTE      45',-1.1,1.99,-6.786,.09);text(shelving,'COLD BREW  45',-1.1,1.8,-6.786,.09);compact(shelving);
 const lighting=group(root,'Ceiling_Beam_Lighting','ceiling');
 for(const[x,z]of [[-5,-2],[-1.8,-2],[3.2,-4],[6.1,-4],[6.2,0],[6.2,5.8]]){
  cyl(lighting,'Pendant_cable',.009,.009,.65,charcoal,x,3.16,z,8);
  cyl(lighting,'Pendant_shade',.12,.33,.25,green,x,2.72,z,24);cyl(lighting,'Pendant_diffuser',.3,.3,.012,glow,x,2.59,z,24);
 }compact(lighting);
 root.updateMatrixWorld(true);return root;
}

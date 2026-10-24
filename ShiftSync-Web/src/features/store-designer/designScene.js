import * as THREE from 'three';
import { assetById } from './catalog.js';
import { buildIndoorPlant, buildStorageShelves } from '../spatial-workspace/scene/FurnitureBuilder.js';

function box(parent,size,position,color) {
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),new THREE.MeshStandardMaterial({color,roughness:.8}));
 mesh.position.set(...position);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.designOwned=true;parent.add(mesh);return mesh;
}
export function createAsset(item,source) {
 const spec=assetById(item.asset),template=spec?.node&&source?.getObjectByName(spec.node);
 if(template){const object=template.clone(true);object.position.set(0,0,0);object.rotation.set(0,0,0);object.scale.setScalar(1);object.visible=true;object.traverse(n=>{n.userData={};});return object;}
 const g=new THREE.Group();
 if(item.asset==='plant'||item.asset==='shelf'){const built=item.asset==='plant'?buildIndoorPlant():buildStorageShelves(2);built.traverse(n=>{if(n.isMesh)n.userData.designGeometryOwned=true;});return built;}
 if(item.asset==='wall'){const [w,h,d]=item.dimensions||[3,2.7,.16];box(g,[w,h,d],[0,h/2,0],'#e8dfcf');box(g,[w,.09,d+.02],[0,.045,0],'#b88c61');}
 else if(item.asset==='door'){const[w,h,d]=item.dimensions||[1.2,2.5,.16];for(const x of [-w/2,w/2]){const post=box(g,[.07,h,d],[x,h/2,0],'#38574c');post.userData.isDoorPost=true;post.name=`Door_${item.id}_${x}`;}box(g,[w+.07,.07,d],[0,h,0],'#38574c');}
 else if(item.asset==='chair'){box(g,[.46,.1,.46],[0,.46,0],'#718677');box(g,[.46,.38,.07],[0,.72,-.2],'#718677');for(const x of [-.17,.17])for(const z of [-.17,.17])box(g,[.045,.42,.045],[x,.21,z],'#b88c61');}
 else if(item.asset==='table'){box(g,[1.2,.08,.8],[0,.76,0],'#b88c61');for(const x of [-.5,.5])for(const z of [-.3,.3])box(g,[.06,.72,.06],[x,.36,z],'#38574c');}
 else if(item.asset==='lamp'){box(g,[.35,.04,.35],[0,.02,0],'#303e38');box(g,[.04,1.6,.04],[0,.82,0],'#b19861');box(g,[.5,.3,.5],[0,1.65,0],'#f3eadb');}
 else if(spec)throw new Error(`Không tải được mẫu ${spec.name}.`);
 return g;
}
export function buildDesignModel(document,source) {
 const root=new THREE.Group();root.name='ShiftSync_Store_DigitalTwin';root.userData={customDesign:true};
 const nodes=new Map(),walls=[];
 const floor=new THREE.Group();floor.name='Store_Floor_System';floor.userData.layer='floor';root.add(floor);
 const surface=box(floor,[document.floor.length,.12,document.floor.width],[0,-.06,0],'#d2c4af');surface.name='Main_Floor_Plinth';
 for(const item of document.items){
  const object=new THREE.Group();object.name=`Design_${item.id}`;
  object.userData={designItemId:item.id,designWorkstationId:item.workstationId||null,designAsset:item.asset,layer:item.asset==='wall'||item.asset==='door'?'walls':assetById(item.asset)?.role?'workstations':'furniture'};
  object.position.fromArray(item.position);object.rotation.y=item.rotation;object.scale.setScalar(item.scale);
  if(item.asset!=='group')object.add(createAsset(item,source));
  if(item.asset==='wall'||item.asset==='door'){object.userData.isWall=true;object.traverse(n=>{if(n.isMesh){n.userData.isWall=true;walls.push(n);}});}
  nodes.set(item.id,object);
 }
 for(const item of document.items)(nodes.get(item.parentId)||root).add(nodes.get(item.id));
 root.updateMatrixWorld(true);
 const layers={floor:[floor],walls,ceiling:[],furniture:[],workstations:[]};
 for(const node of nodes.values()){if(node.userData.designAsset!=='group'&&layers[node.userData.layer])layers[node.userData.layer].push(node);}
 return {layers,modelRoot:root,scene:root,workstationsMap:new Map(),zonesMap:new Map(),columns:[],wallMeshes:walls,isGlb:true,customDesign:true,designNodes:nodes};
}
// Cloned GLB geometry/materials belong to the source; dispose only new primitives.
export function disposeDesignModel(model) {model?.modelRoot.traverse(n=>{if(n.userData.designOwned){n.geometry?.dispose();n.material?.dispose();}else if(n.userData.designGeometryOwned)n.geometry?.dispose();});}

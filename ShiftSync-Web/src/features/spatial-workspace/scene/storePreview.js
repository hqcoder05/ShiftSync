import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {loadDigitalTwinModel} from './DigitalTwinModelLoader.js';
import {arrangeStoreInterior} from './StoreArrangement.js';

const scene=new THREE.Scene();scene.background=new THREE.Color('#eeebe4');
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
document.querySelector('#scene').appendChild(renderer.domElement);
const camera=new THREE.PerspectiveCamera(36,innerWidth/innerHeight,.1,250);camera.position.set(23,21,25);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.4,0);controls.enableDamping=true;controls.maxPolarAngle=Math.PI/2-.025;controls.minDistance=4;controls.maxDistance=150;controls.update();
scene.add(new THREE.HemisphereLight(0xfffbef,0xb9baac,2));
const key=new THREE.DirectionalLight(0xfff1db,2.4);key.position.set(-8,17,12);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-18,right:18,top:16,bottom:-16,near:1,far:55});key.shadow.bias=-.0002;scene.add(key);
const fill=new THREE.DirectionalLight(0xe4edff,1.1);fill.position.set(8,9,-10);scene.add(fill);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.MeshStandardMaterial({color:0xeeebe4,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.19;ground.receiveShadow=true;scene.add(ground);
const data=await loadDigitalTwinModel().catch(()=>null);
if(data){
 scene.add(data.modelRoot);arrangeStoreInterior(data.modelRoot,[],{length:24,width:16});
 document.querySelector('#scene').setAttribute('aria-busy','false');
 document.querySelector('#status').textContent='Kéo để xoay · Cuộn để xem gần. Mô hình mẫu, không chứa dữ liệu phân công.';
 const poses={overview:{position:[23,21,25],target:[0,.4,0]},top:{position:[0,34,.01],target:[0,0,0]},counter:{position:[-.5,4.8,6.6],target:[-4.2,.9,-2]}};
 function pose(name){const p=poses[name];controls.target.fromArray(p.target);camera.position.fromArray(p.position).sub(controls.target).multiplyScalar(Math.max(1,1.35/camera.aspect)).add(controls.target);controls.update();for(const id of Object.keys(poses))document.querySelector('#'+id).setAttribute('aria-pressed',String(id===name));}
 for(const id of Object.keys(poses))document.querySelector('#'+id).onclick=()=>pose(id);
 for(const[id,layer]of [['walls','walls'],['lights','ceiling']])document.querySelector('#'+id).onclick=e=>{const value=e.target.getAttribute('aria-pressed')!=='true';e.target.setAttribute('aria-pressed',String(value));data.layers[layer].forEach(n=>{n.visible=value;});};
 window.storePreview={scene,camera,renderer,controls,model:data.modelRoot};
 pose('overview');
}else{
 document.querySelector('#scene').setAttribute('aria-busy','false');document.querySelector('#status').textContent='Chưa tải được mô hình. Hãy tải lại để thử tiếp.';document.querySelector('#retry').hidden=false;document.querySelector('#retry').onclick=()=>location.reload();
 document.querySelectorAll('nav button').forEach(n=>{n.disabled=true;});
}
renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

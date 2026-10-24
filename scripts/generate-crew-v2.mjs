import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {GLTFExporter} from '../ShiftSync-Web/node_modules/three/examples/jsm/exporters/GLTFExporter.js';
import {buildCrewModel,CREW_ROLES} from '../ShiftSync-Web/src/features/spatial-workspace/scene/character/CrewModel.js';
globalThis.FileReader=class{async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.();}};
const destination=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../ShiftSync-Web/public/models/crew-v2');
await fs.mkdir(destination,{recursive:true});
for(const role of Object.keys(CREW_ROLES))for(const gender of ['MALE','FEMALE']){
 const model=buildCrewModel(role,gender),buffer=await new GLTFExporter().parseAsync(model,{binary:true});
 await fs.writeFile(path.join(destination,`${role}${gender==='FEMALE'?'-female':''}.glb`),Buffer.from(buffer));
 let meshes=0,triangles=0;model.traverse(n=>{if(n.isMesh){meshes++;triangles+=(n.geometry.index?.count||n.geometry.attributes.position.count)/3;}});
 console.log(JSON.stringify({role,bytes:buffer.byteLength,meshes,triangles}));
 model.traverse(n=>{if(n.isMesh)n.geometry.dispose();});
}

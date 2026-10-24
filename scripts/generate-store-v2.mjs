import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {GLTFExporter} from '../ShiftSync-Web/node_modules/three/examples/jsm/exporters/GLTFExporter.js';
import {FontLoader} from '../ShiftSync-Web/node_modules/three/examples/jsm/loaders/FontLoader.js';
import {buildCafeStoreModel} from '../ShiftSync-Web/src/features/spatial-workspace/scene/CafeStoreModel.js';

globalThis.FileReader=class{async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.();}};
const here=path.dirname(fileURLToPath(import.meta.url));
// Three.js r185 example font: https://github.com/mrdoob/three.js/tree/r185/examples/fonts
const fontData=JSON.parse(await fs.readFile(path.resolve(here,'assets/helvetiker_regular.typeface.json'),'utf8'));
const font=new FontLoader().parse(fontData);
const root=buildCafeStoreModel(font);
const buffer=await new GLTFExporter().parseAsync(root,{binary:true});
const destination=path.resolve(here,'../ShiftSync-Web/public/models/store-v2');
await fs.mkdir(destination,{recursive:true});await fs.writeFile(path.join(destination,'shiftsync-cafe.glb'),Buffer.from(buffer));
await fs.writeFile(path.join(destination,'FONT-LICENSE.txt'),`Helvetiker font from Three.js r185 examples/fonts.\nSource: https://github.com/mrdoob/three.js/tree/r185/examples/fonts\n\n${fontData.original_font_information?.copyright||''}\n${fontData.original_font_information?.license_description||fontData.original_font_information?.description||''}\n`);
let meshes=0,triangles=0;root.traverse(n=>{if(n.isMesh){meshes++;triangles+=(n.geometry.index?.count||n.geometry.attributes.position.count)/3;}});
console.log(JSON.stringify({path:destination,bytes:buffer.byteLength,meshes,triangles}));

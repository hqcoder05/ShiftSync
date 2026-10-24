const path = require('path');
const fs = require('fs');

const glbPath = path.resolve(__dirname, '../ShiftSync-Web/public/models/ShiftSync_Workstation.glb');
globalThis.self = globalThis;
if (typeof globalThis.createImageBitmap === 'undefined') {
  globalThis.createImageBitmap = async () => ({ width: 512, height: 512, close: () => {} });
}

// ── Read and Parse glTF 2.0 Binary Header and JSON Chunk ──
const rawBuffer = fs.readFileSync(glbPath);
const magic = rawBuffer.readUInt32LE(0);
const version = rawBuffer.readUInt32LE(4);
const length = rawBuffer.readUInt32LE(8);
const jsonChunkLength = rawBuffer.readUInt32LE(12);
const jsonChunkType = rawBuffer.readUInt32LE(16);

console.log('=== GLB BINARY HEADER ===');
console.log(`Magic: 0x${magic.toString(16)} ('glTF')`);
console.log(`Version: ${version}`);
console.log(`Total Length: ${(length / 1024 / 1024).toFixed(2)} MB (${length} bytes)`);
console.log(`JSON Chunk Length: ${(jsonChunkLength / 1024).toFixed(2)} KB`);

const jsonChunkBuffer = rawBuffer.subarray(20, 20 + jsonChunkLength);
const gltfJson = JSON.parse(jsonChunkBuffer.toString('utf8'));

console.log('\n=== GLTF JSON CHUNK SUMMARY ===');
console.log(`Generator: ${gltfJson.asset ? gltfJson.asset.generator : 'unknown'}`);
console.log(`Nodes count: ${gltfJson.nodes ? gltfJson.nodes.length : 0}`);
console.log(`Meshes count: ${gltfJson.meshes ? gltfJson.meshes.length : 0}`);
console.log(`Materials count: ${gltfJson.materials ? gltfJson.materials.length : 0}`);
console.log(`Textures count: ${gltfJson.textures ? gltfJson.textures.length : 0}`);
console.log(`Images count: ${gltfJson.images ? gltfJson.images.length : 0}`);

console.log('\n--- ALL MATERIALS IN WORKSTATION ---');
(gltfJson.materials || []).forEach((mat, idx) => {
  const pbr = mat.pbrMetallicRoughness || {};
  console.log(`[${idx}] "${mat.name}":`, JSON.stringify({
    baseColorFactor: pbr.baseColorFactor,
    baseColorTexture: pbr.baseColorTexture ? pbr.baseColorTexture.index : null,
    metallicFactor: pbr.metallicFactor,
    roughnessFactor: pbr.roughnessFactor,
    emissiveFactor: mat.emissiveFactor,
    alphaMode: mat.alphaMode,
    doubleSided: mat.doubleSided,
  }));
});

console.log('\n--- NODES STRUCTURE (First 40 nodes) ---');
(gltfJson.nodes || []).slice(0, 40).forEach((n, idx) => {
  console.log(`Node [${idx}] "${n.name}": mesh=${n.mesh !== undefined ? n.mesh : 'none'}, children=${n.children ? JSON.stringify(n.children) : '[]'}, translation=${JSON.stringify(n.translation)}, rotation=${JSON.stringify(n.rotation)}, scale=${JSON.stringify(n.scale)}`);
});
if ((gltfJson.nodes || []).length > 40) {
  console.log(`... and ${gltfJson.nodes.length - 40} more nodes`);
  (gltfJson.nodes || []).slice(40).forEach((n, idx) => {
    console.log(`Node [${idx + 40}] "${n.name}": mesh=${n.mesh !== undefined ? n.mesh : 'none'}`);
  });
}

console.log('\n=== MESHES SUMMARY ===');
(gltfJson.meshes || []).forEach((mesh, idx) => {
  const prims = mesh.primitives || [];
  const matIndices = prims.map(p => p.material);
  console.log(`Mesh [${idx}] "${mesh.name}": primitives=${prims.length}, materials=[${matIndices.join(', ')}]`);
});


console.log('\n=== INSPECTION COMPLETE ===');

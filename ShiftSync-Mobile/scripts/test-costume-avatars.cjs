const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const out=path.resolve('output/costume-avatars-2026-11-02');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:path.resolve('qa-week2-2026-10-20/browsers/chromium-1248/chrome-win64/chrome.exe'),headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
 const page=await browser.newPage({viewport:{width:1200,height:1200}});
 await page.route('http://avatars.local/**',route=>{
  const req=new URL(route.request().url()).pathname;
  if(req==='/')return route.fulfill({contentType:'text/html',body:'<!doctype html><script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js"}}</script>'});
  const file=path.resolve('.'+req);if(!file.startsWith(process.cwd()+path.sep))throw Error('Path escape');return route.fulfill({contentType:'text/javascript',body:fs.readFileSync(file)});
 });
 await page.goto('http://avatars.local/');
 const result=await page.evaluate(async()=>{
  const THREE=await import('three');const {AVATAR_OPTIONS}=await import('/components/avatarConfigs.js');
  const {createCostumeAvatar,animateCostumeAvatar,getAvatarCamera}=await import('/components/costumeAvatarScene.js');
  const camera=new THREE.PerspectiveCamera(34,1,.1,25);
  const checks=[];
  for(const opt of AVATAR_OPTIONS){
   const cam=getAvatarCamera('full',opt.id);camera.position.set(...cam.position);camera.lookAt(...cam.target);camera.updateMatrixWorld();
   const model=createCostumeAvatar(opt.id);let max=0,minWave=10,maxWave=-10,minStride=10,maxStride=-10,minX=10,maxX=-10,minY=10,maxY=-10;
   for(let frame=0;frame<600;frame++){
    const t=frame/30;animateCostumeAvatar(model,t,1/30,{active:frame>300&&frame<420,lookX:Math.sin(t),lookY:Math.cos(t)});model.updateMatrixWorld(true);
    minWave=Math.min(minWave,model.userData.shoulders[1].rotation.z);maxWave=Math.max(maxWave,model.userData.shoulders[1].rotation.z);minStride=Math.min(minStride,model.userData.hips[0].rotation.x);maxStride=Math.max(maxStride,model.userData.hips[0].rotation.x);
    minX=Math.min(minX,model.userData.body.position.x);maxX=Math.max(maxX,model.userData.body.position.x);minY=Math.min(minY,model.userData.body.position.y);maxY=Math.max(maxY,model.userData.body.position.y);
    model.traverse(p=>{if(!p.geometry)return;p.geometry.computeBoundingBox();const b=p.geometry.boundingBox;for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){const v=new THREE.Vector3(x,y,z).applyMatrix4(p.matrixWorld).project(camera);if(![v.x,v.y,v.z].every(Number.isFinite))throw Error(opt.id+' nonfinite');max=Math.max(max,Math.abs(v.x),Math.abs(v.y));}});
   }
   checks.push({id:opt.id,label:opt.label,maxProjection:+max.toFixed(3),waveRange:+(maxWave-minWave).toFixed(3),strideRange:+(maxStride-minStride).toFixed(3),travelRange:+(maxX-minX).toFixed(3),hopRange:+(maxY-minY).toFixed(3),frames:600});
  }
  return {checks,options:AVATAR_OPTIONS.map(({id,label})=>({id,label}))};
 });
 const raw=fs.readFileSync('components/avatarPortraitData.js','utf8'),data=JSON.parse(raw.slice(raw.indexOf('export default ')+15).replace(/;\s*$/,''));
 for(const framing of ['full','head']){
  assert.equal(Object.keys(data[framing]).length,20);assert.equal(new Set(Object.values(data[framing]).map(v=>crypto.createHash('sha256').update(v.uri).digest('hex'))).size,20);
  await page.setContent(`<style>body{margin:0;padding:24px;background:#F5F7FA;display:grid;grid-template-columns:repeat(5,1fr);gap:12px;font-family:Arial}figure{margin:0;background:white;border-radius:20px;text-align:center}img{width:205px;height:205px}figcaption{font-size:14px;color:#2B3442;padding-bottom:14px}</style>${result.options.map(({id,label})=>`<figure><img src="${data[framing][id].uri}"/><figcaption>${label}</figcaption></figure>`).join('')}`);
  await page.screenshot({path:path.join(out,`all-${framing}.png`),fullPage:true});
 }
 fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify(result,null,2));
 for(const check of result.checks){assert.ok(check.maxProjection<.98,check.id+' needs canvas margin: '+check.maxProjection);assert.ok(check.waveRange>1.5,check.id+' actual shoulder wave');assert.ok(check.strideRange>.7,check.id+' actual hip stride');assert.ok(check.travelRange>.2&&check.hopRange>.1,check.id+' walk and jump');}
 console.log('PASS:20 costume models,40distinct full/head previews,12000 bounded poses, shoulder wave +hip stride+walk+hop.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

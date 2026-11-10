import * as THREE from 'three';
import { getAvatarById } from './avatarConfigs.js';

export function getAvatarCamera(framing='full', avatarId='dilan') {
  // Compact account chips intentionally crop hats/torso to keep the face legible.
  // The full framing below includes the entire costume and every waving pose.
  if(framing==='head')return {position:[0,.78,3.6],target:[0,.65,0],fov:34};
  const kind=getAvatarById(avatarId).kind;
  const top={ 'bow-princess':1.94,zombie:1.45,warrior:1.45,liberty:2.10,shark:1.95,skeleton:1.78,rasta:1.80,scarecrow:2.21,redhood:1.60,owl:1.86,mummy:2.13,sombrero:2.28,rapper:1.58,professor:1.46,vampire:1.46,pirate:2.44,gentleman:1.84,tiara:2.16,emperor:1.79,witch:2.60 }[kind]||1.95;
  const head=framing==='head', bottom=head?-.15:-1.65,center=(top+bottom)/2+.045;
  const width={sombrero:2.60,pirate:2.25,liberty:2.20,professor:2.15}[kind]||1.95;
  const extent=Math.max(top-bottom+(head?.20:.35),head?width:2.9);
  const distance=extent*1.08/(2*Math.tan(17*Math.PI/180))+.45;
  return {position:[0,center+.13,distance],target:[0,center,0],fov:34};
}

export function createCostumeAvatar(id='dilan') {
  const option=getAvatarById(id),{kind}=option;
  const skin=option.skin||'#EBC3A6',hair=option.hair||'#3D414A',outfit=option.body||'#738B99',accent=option.accent||'#B65B50';
  const cream='#EEE9D5',ink='#26343C',white='#F8F5E8',gold='#D8AB54';
  const model=new THREE.Group(),body=new THREE.Group();body.rotation.y=-.13;model.add(body);
  const palette=new Map();
  const mat=color=>{if(!palette.has(color))palette.set(color,new THREE.MeshStandardMaterial({color,roughness:.95,metalness:0,flatShading:true}));return palette.get(color);};
  const add=(p,g,c,pos=[0,0,0])=>{const m=new THREE.Mesh(g,mat(c));m.position.set(...pos);p.add(m);return m;};
  const box=(p,c,s,pos)=>add(p,new THREE.BoxGeometry(...s),c,pos);
  const poly=(p,c,points,depth,pos=[0,0,0],bevel=.025)=>{const s=new THREE.Shape();s.moveTo(...points[0]);points.slice(1).forEach(v=>s.lineTo(...v));s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth,steps:1,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:1,curveSegments:1});g.translate(0,0,-depth/2);return add(p,g,c,pos);};
  const slab=(p,c,w,h,d,pos,cut=.06)=>poly(p,c,[[-w/2+cut,-h/2],[w/2-cut,-h/2],[w/2,-h/2+cut],[w/2,h/2-cut],[w/2-cut,h/2],[-w/2+cut,h/2],[-w/2,h/2-cut],[-w/2,-h/2+cut]],d,pos,.025);
  const ball=(p,c,r,pos,scale=[1,1,1])=>{const m=add(p,new THREE.IcosahedronGeometry(r,1),c,pos);m.scale.set(...scale);return m;};
  const disc=(p,c,r,pos,scale=[1,1,1])=>{const m=add(p,new THREE.CylinderGeometry(r,r,.035,12),c,pos);m.rotation.x=Math.PI/2;m.scale.set(...scale);return m;};
  const stroke=(p,c,points,r=.018)=>add(p,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v))),Math.max(4,points.length*3),r,5,false),c);
  const triangle=(p,c,w,h,pos,inv=false)=>poly(p,c,inv?[[-w/2,h/2],[w/2,h/2],[0,-h/2]]:[[-w/2,-h/2],[w/2,-h/2],[0,h/2]],.035,pos,0);
  const head=new THREE.Group();head.position.y=.65;body.add(head);
  poly(head,skin,[[-.48,-.66],[.46,-.66],[.62,-.52],[.64,.49],[.46,.67],[-.43,.67],[-.62,.49],[-.64,-.48]],.64,[0,0,.03],.035);
  for(const x of [-.66,.66])ball(head,skin,.12,[x,-.15,.03],[.65,1,.65]);
  const eyes=[-.17,.17].map(x=>slab(head,ink,.052,.15,.035,[x,.12,.398],.009));
  const nose=triangle(head,kind==='liberty'?'#4E8C7E':kind==='zombie'?'#597C96':'#CE8F76',.12,.22,[0,-.14,.425]);
  const mouth=stroke(head,'#A46F5D',[[-.11,-.35,.414],[0,-.39,.43],[.11,-.35,.414]],.012);
  if(['bow-princess','redhood','tiara','witch'].includes(kind))for(const x of [-.38,.38])disc(head,'#D98C84',.085,[x,-.28,.412],[1,.83,1]);
  box(body,skin,[.23,.21,.28],[0,-.11,.02]);
  const torso=slab(body,outfit,.88,.83,.46,[0,-.62,0],.06),shoulders=[],hips=[];
  for(const side of [-1,1]){
    const s=new THREE.Group();s.position.set(side*.53,-.28,0);s.rotation.z=side*.61;body.add(s);
    const sleeve=box(s,outfit,[.24,.42,.36],[0,-.22,0]);
    const forearm=box(s,kind==='shark'?outfit:skin,[.20,.28,.30],[0,-.56,0]);
    const hand=slab(s,kind==='skeleton'?cream:['mummy','shark'].includes(kind)?outfit:skin,.21,.18,.30,[0,-.74,0],.02);
    s.userData={sleeve,forearm,hand};shoulders.push(s);
    const h=new THREE.Group();h.position.set(side*.19,-1.04,0);body.add(h);
    box(h,['bow-princess','redhood','tiara','scarecrow','sombrero'].includes(kind)?skin:outfit,[.24,.39,.28],[0,-.18,0]);
    h.userData.foot=box(h,['bow-princess','tiara'].includes(kind)?'#4D4767':['redhood','rapper'].includes(kind)?'#A33C45':kind==='liberty'?outfit:'#39424E',[.25,.16,.39],[0,-.44,.045]);hips.push(h);
  }
  const fringe=(c=hair,pointy=false)=>{slab(head,c,1.36,.48,.67,[0,.49,-.04],.10);poly(head,c,pointy?[[-.67,.64],[-.6,.19],[-.36,.39],[-.23,.18],[.04,.4],[.31,.25],[.6,.18],[.58,.7]]:[[-.66,.62],[-.64,.18],[-.32,.22],[.01,.47],[.18,.18],[.64,.29],[.62,.66]],.10,[0,0,.395],.01);};
  const longHair=(c=hair,bottom=-.77)=>{poly(head,c,[[-.72,.58],[-.8,-.2],[-.91,bottom+.08],[-.58,bottom],[.61,bottom],[.89,bottom+.12],[.79,-.13],[.7,.61]],.48,[0,0,-.21],.02);fringe(c);};
  const hood=(c,w=1.61)=>poly(head,c,[[-w/2+.11,-.78],[w/2-.1,-.78],[w/2,-.47],[w/2-.05,.61],[.49,.88],[-.42,.9],[-w/2+.05,.58],[-w/2,-.44]],.67,[0,0,-.14],.025);
  const sash=(c,w=.17)=>{const m=box(body,c,[w,.94,.045],[0,-.61,.269]);m.rotation.z=-.75;};
  const belt=(c=ink)=>box(body,c,[.91,.10,.49],[0,-.91,.01]);
  const bow=(p,c,pos,size=.22)=>{poly(p,c,[[-size,-size*.6],[0,-size*.23],[0,size*.23],[-size,size*.6]],.08,pos,.005);poly(p,c,[[size,-size*.6],[0,-size*.23],[0,size*.23],[size,size*.6]],.08,pos,.005);ball(p,c,size*.27,pos);};
  const skirt=c=>add(body,new THREE.CylinderGeometry(.36,.55,.48,6),c,[0,-.98,0]);
  const badge=(c,pos,r=.095)=>disc(body,c,r,pos);
  const eyebrows=(c=ink)=>[-1,1].forEach(side=>{const b=box(head,c,[.17,.045,.035],[side*.18,.32,.408]);b.rotation.z=side*-.1;});
  switch(kind){
    case 'bow-princess':
      longHair(hair,-.65);bow(head,accent,[0,.97,.01],.45);torso.material=mat('#364D6C');skirt(outfit);
      poly(body,white,[[-.31,-.19],[0,-.29],[.31,-.19],[.22,-.11],[-.22,-.11]],.025,[0,0,.26],0);
      for(const s of shoulders){s.userData.sleeve.material=mat('#3D587B');box(s,accent,[.245,.075,.37],[0,-.25,.01]);}
      for(const x of [-.29,-.15,0,.15,.29])box(body,'#D69C3D',[.016,.33,.018],[x,-1,.42]);
      break;
    case 'zombie':
      fringe(hair,true);eyebrows(hair);eyes.forEach((e,i)=>{disc(head,'#E8EFE1',.18,[i===0?-.2:.2,.14,.41]);e.position.z=.46;e.scale.x=1.4;});
      box(head,'#6E91A0',[.68,.035,.035],[0,-.40,.42]);for(const x of [-.3,-.11,.14,.29])box(head,'#6E91A0',[.025,.09,.03],[x,-.36,.43]);
      for(const side of [-1,1]){box(body,accent,[.19,.78,.12],[side*.32,-.6,.26]);const arm=shoulders[side===-1?0:1];arm.userData.sleeve.material=mat('#397C88');for(const y of [-.13,-.29])disc(arm,'#776B9A',.045,[0,y,.20]);}
      break;
    case 'warrior':
      longHair(hair,-.68);poly(head,hair,[[-.47,-.22],[-.44,-.48],[0,-.85],[.45,-.46],[.46,-.22],[.14,-.12],[-.18,-.12]],.20,[0,0,.38],.018);
      for(const x of [-.25,0,.25])stroke(head,'#C18C3D',[[x,-.31,.51],[x*.5,-.69,.51]],.012);sash(accent,.23);belt('#716B62');badge(gold,[.15,-.89,.32],.16);
      for(const s of shoulders){s.userData.sleeve.material=mat(skin);box(s,gold,[.25,.12,.34],[0,-.55,.01]);}
      for(const h of hips){h.userData.foot.material=mat('#74634F');for(const y of [-.12,-.25]){const m=box(h,'#78654D',[.26,.035,.03],[0,y,.165]);m.rotation.z=.25;}}
      break;
    case 'liberty':
      longHair(hair,-.58);box(head,hair,[1.27,.18,.73],[0,.68,-.02]);
      for(let i=0;i<7;i++){const a=(i-3)*.39;const ray=triangle(head,hair,.22,.75,[Math.sin(a)*.79,.84+Math.cos(a)*.20,-.05]);ray.rotation.z=-a;}
      sash('#3E7D73',.25);poly(body,accent,[[-.46,-.28],[-.17,-.35],[.35,-1.10],[-.48,-1.10]],.08,[0,0,.27],0);hips.forEach(h=>h.userData.foot.material=mat(outfit));
      break;
    case 'shark':
      hood(hair,1.6);triangle(head,hair,.30,.48,[0,1,-.05]);
      for(const x of [-.53,-.27,0,.27,.53])triangle(head,white,.22,.18,[x,.54,.46],true);for(const x of [-.42,-.14,.14,.42])triangle(head,white,.23,.17,[x,-.59,.46]);
      disc(head,ink,.035,[-.55,.72,.31]);disc(head,ink,.035,[.55,.72,.31]);poly(body,accent,[[-.21,-.24],[.19,-.24],[.30,-.93],[0,-1.1],[-.29,-.93]],.07,[0,0,.25],.015);
      shoulders.forEach(s=>{s.userData.sleeve.scale.x=1.25;s.userData.forearm.scale.y=1.3;s.userData.hand.visible=false;});triangle(body,outfit,.56,.48,[0,-.91,-.38]).rotation.x=.9;
      break;
    case 'skeleton':
      hood(hair);eyes.forEach((e,i)=>{disc(head,white,.16,[i===0?-.18:.18,.13,.4]);e.position.z=.46;});nose.material=mat(ink);nose.rotation.z=Math.PI;box(head,hair,[.38,.12,.05],[0,-.58,.41]);
      box(head,cream,[1,.12,.18],[0,.95,-.04]);for(const x of [-.49,.49])for(const y of [.89,1.02])ball(head,cream,.095,[x,y,-.04]);
      stroke(body,cream,[[0,-.26,.27],[0,-.94,.27]],.035);for(let i=0;i<4;i++)for(const side of [-1,1])stroke(body,cream,[[side*.03,-.36-i*.13,.28],[side*.29,-.34-i*.14,.28],[side*.36,-.46-i*.12,.28]],.025);
      shoulders.forEach(s=>{box(s,cream,[.08,.49,.025],[0,-.39,.19]);for(const y of [-.17,-.60])disc(s,cream,.07,[0,y,.2]);});hips.forEach(h=>{box(h,cream,[.075,.28,.03],[0,-.16,.16]);disc(h,cream,.07,[0,-.28,.17]);});
      break;
    case 'rasta':
      longHair(hair,-.75);for(const side of [-1,1])for(let i=0;i<3;i++)slab(head,hair,.13,.94,.15,[side*(.55+i*.08),-.15,.16],.025).rotation.z=side*.05;
      poly(head,'#579768',[[-.7,.61],[0,1.12],[.69,.61]],.65,[0,0,-.02],.015);box(head,gold,[1.34,.15,.7],[0,.64,-.02]);box(head,'#C64645',[1.4,.16,.72],[0,.50,-.01]);
      box(body,'#DEA64F',[.22,.69,.08],[-.31,-.57,.27]);box(body,'#5B9D77',[.22,.69,.08],[.31,-.57,.27]);shoulders.forEach(s=>s.userData.sleeve.material=mat('#BE4E49'));
      stroke(body,'#91A9A5',[[-.2,-.22,.31],[0,-.58,.34],[.2,-.22,.31]],.017);badge('#B0C6C3',[0,-.61,.34],.1);
      break;
    case 'scarecrow': {
      longHair(hair,-.63);eyebrows('#7A5B36');add(head,new THREE.CylinderGeometry(.98,1.02,.08,8),accent,[0,.77,-.02]).scale.z=.55;add(head,new THREE.CylinderGeometry(.43,.69,.45,7),accent,[0,1,-.02]);
      for(const x of [-.45,-.25,0,.25,.45])box(head,'#D5A566',[.045,.25,.04],[x,.98,.28]).rotation.z=-.15;
      ball(head,cream,.16,[.2,1.38,.02],[1.2,.75,.85]);triangle(head,gold,.17,.13,[.37,1.34,.14],true);disc(head,ink,.024,[.24,1.4,.15]);
      stroke(head,'#9C7647',[[-.34,-.28,.43],[-.18,-.42,.43],[.15,-.4,.43],[.32,-.22,.43]],.013);for(const x of [-.23,-.05,.15])stroke(head,'#9C7647',[[x,-.36,.44],[x+.03,-.46,.44]],.009);
      shoulders.forEach(s=>s.userData.sleeve.material=mat(accent));for(const x of [-.28,.28]){box(body,'#4D8A96',[.12,.48,.06],[x,-.41,.28]);badge(gold,[x,-.5,.32],.035);}box(body,'#2B596C',[.35,.27,.035],[0,-.76,.27]);
      break; }
    case 'redhood':
      hood('#A63742');fringe(hair);poly(body,'#A13843',[[-.35,-.16],[-.63,-1.15],[.62,-1.15],[.33,-.16]],.1,[0,0,-.30],.02);bow(body,'#365866',[0,-.22,.32],.16);box(body,accent,[.32,.70,.035],[0,-.69,.27]);
      for(const x of [-.08,.08])for(const y of [-.47,-.71,-.91]){disc(body,'#D7837B',.045,[x,y,.30]);disc(body,gold,.015,[x,y,.33]);}skirt('#B04449');
      break;
    case 'owl':
      hood(hair);triangle(head,hair,.39,.47,[-.5,.89,-.12]);triangle(head,hair,.39,.47,[.5,.89,-.12]);
      for(const x of [-.3,.3]){disc(head,gold,.27,[x,.69,.29]);disc(head,'#C3D7AF',.21,[x,.69,.33]);disc(head,ink,.085,[x,.69,.37]);disc(head,white,.025,[x-.02,.72,.4]);}triangle(head,'#D79B42',.17,.17,[0,.5,.39],true);
      for(let row=0;row<4;row++)for(let col=0;col<4;col++)poly(body,['#B85D60','#D7A451','#A2ACA1'][(row+col)%3],[[-.13,.07],[.13,.07],[.1,-.05],[0,-.14],[-.1,-.05]],.04,[-.33+col*.22,-.33-row*.18,.28+row*.005],0);
      shoulders.forEach(s=>{for(let i=0;i<3;i++)box(s,['#D2A34F','#B65A59','#B4B8A6'][i],[.245,.09,.03],[0,-.12-i*.14,.2]);});
      break;
    case 'mummy': {
      hood(outfit);box(head,'#A9A592',[.67,.22,.035],[0,.16,.39]);eyes.forEach((e,i)=>{disc(head,white,.12,[i===0?-.13:.13,.15,.42]);e.position.x=i===0?-.13:.13;e.position.z=.46;});
      const band=(p,y,w,a,z=.43)=>{box(p,'#E9E5D2',[w,.18,.035],[0,y,z]).rotation.z=a;};
      for(const [y,a]of[[.55,.13],[.36,-.11],[-.12,.1],[-.5,-.08],[-.66,.08]])band(head,y,1.26,a);
      mouth.visible=false;box(head,'#A94A43',[.35,.24,.04],[0,-.36,.45]);for(const x of [-.1,.09])box(head,white,[.09,.09,.025],[x,-.3,.49]);
      for(const [y,a]of[[-.3,.1],[-.52,-.08],[-.73,.11],[-.93,-.06]])band(body,y,.88,a,.27);shoulders.forEach(s=>{s.userData.forearm.material=mat(outfit);for(const y of [-.17,-.34,-.55])band(s,y,.24,.1,.2);});
      stroke(head,'#54816A',[[.17,.78,0],[.21,1.14,0]],.025);for(let i=0;i<6;i++)ball(head,'#59A06B',.1,[.21+Math.cos(i*Math.PI/3)*.12,1.22+Math.sin(i*Math.PI/3)*.12,0],[1,1,.4]);ball(head,gold,.08,[.21,1.22,.03],[1,1,.5]);
      break; }
    case 'sombrero':
      fringe();add(head,new THREE.CylinderGeometry(1.22,1.24,.08,10),gold,[0,.78,-.03]).scale.z=.58;add(head,new THREE.ConeGeometry(.56,.8,6),gold,[0,1.19,-.03]);
      for(let i=-4;i<=4;i++)triangle(head,i%2?'#4E9B78':'#C84C4A',.24,.16,[i*.24,.76,.49],i%2===0);
      poly(head,hair,[[-.05,-.28],[-.19,-.17],[-.35,-.23],[-.37,-.41],[-.23,-.38],[-.15,-.28],[0,-.43],[.15,-.28],[.23,-.38],[.37,-.41],[.35,-.23],[.19,-.17],[.05,-.28]],.05,[0,0,.43],.005);
      poly(body,outfit,[[-.49,-.21],[-.62,-.78],[0,-1.12],[.62,-.78],[.49,-.21]],.1,[0,0,.25],.01);for(const [y,c]of[[-.67,'#BE4C4D'],[-.78,'#ECE5CE'],[-.88,'#427E75']])box(body,c,[.86,.09,.04],[0,y,.34]);bow(body,'#365F76',[0,-.31,.38],.13);
      break;
    case 'rapper':
      fringe();slab(head,accent,1.35,.39,.72,[0,.66,-.02],.09);box(head,accent,[.92,.075,.4],[.38,.48,.34]);
      for(const x of [-.25,.25]){slab(head,'#E0D5B9',.43,.31,.045,[x,.13,.43],.03);slab(head,'#3A4B57',.35,.24,.04,[x,.13,.47],.02);}box(head,ink,[.15,.035,.025],[0,.16,.46]);poly(head,'#866349',[[-.18,-.51],[.18,-.51],[.13,-.34],[-.10,-.34]],.05,[0,0,.44],.005);
      stroke(body,gold,[[-.27,-.22,.29],[-.16,-.51,.32],[0,-.62,.33],[.16,-.51,.32],[.27,-.22,.29]],.025);badge(gold,[0,-.68,.34],.1);for(const x of [-.2,.2])box(body,'#D8DCD8',[.1,.24,.03],[x,-.68,.27]);belt('#414C59');
      break;
    case 'professor':
      slab(head,hair,1,.31,.48,[0,.57,-.08],.04);for(const side of [-1,1])poly(head,hair,[[side*.57,.54],[side*1.02,.06],[side*.62,-.12]],.37,[0,0,-.05],.015);
      for(const x of [-.25,.25]){disc(head,'#B95154',.23,[x,.14,.43]);disc(head,'#B8D0B7',.17,[x,.14,.47]);const points=[];for(let i=0;i<22;i++){const a=i*.6,r=.13*(1-i/25);points.push([x+Math.cos(a)*r,.14+Math.sin(a)*r,.5]);}stroke(head,'#4F7C73',points,.012);}
      eyes.forEach(e=>e.visible=false);mouth.material=mat(cream);mouth.scale.set(1.4,1.4,1);box(body,accent,[.4,.74,.055],[0,-.6,.26]);for(const side of [-1,1])poly(body,white,[[side*.43,-.2],[side*.14,-.2],[side*.2,-1],[side*.44,-1]],.035,[0,0,.31],0);bow(body,'#457391',[0,-.28,.36],.13);box(body,'#698C9B',[.1,.17,.02],[.32,-.59,.36]);
      break;
    case 'vampire':
      fringe(hair,true);eyebrows();poly(body,'#263343',[[-.44,-.17],[-.72,-1.1],[.72,-1.1],[.44,-.17]],.06,[0,0,-.3],.005);poly(body,accent,[[-.29,-.21],[.29,-.21],[.2,-1.01],[-.2,-1.01]],.035,[0,0,.27],0);bow(body,hair,[0,-.31,.33],.14);for(const y of [-.52,-.7,-.88])badge(hair,[0,y,.32],.026);for(const x of [-.1,.1])triangle(head,white,.07,.12,[x,-.37,.45],true);
      break;
    case 'pirate':
      longHair();poly(head,outfit,[[-1.02,.54],[-.9,1.03],[-.4,1.13],[0,.84],[.4,1.13],[.9,1.03],[1.02,.54]],.72,[0,0,-.06],.025);stroke(head,gold,[[-.96,.65,.35],[-.69,.94,.35],[-.35,1.03,.35],[0,.86,.35],[.35,1.03,.35],[.69,.94,.35],[.96,.65,.35]],.025);
      poly(head,cream,[[.04,.99],[.22,1.55],[.52,1.62],[.42,1.4],[.13,1.02]],.05,[0,0,-.02],.015);disc(head,ink,.12,[-.19,.12,.45]);stroke(head,ink,[[-.61,.36,.41],[.4,-.01,.44]],.018);stroke(head,hair,[[-.32,-.36,.44],[-.24,-.26,.46],[0,-.32,.46],[.24,-.26,.46],[.32,-.36,.44]],.035);
      box(body,'#A23B55',[.92,.19,.5],[0,-.9,.02]);box(body,gold,[.17,.14,.035],[0,-.9,.29]);for(const side of [-1,1])box(body,gold,[.04,.59,.035],[side*.3,-.54,.28]);shoulders[1].userData.hand.visible=false;stroke(shoulders[1],'#A3B6BC',[[0,-.72,0],[0,-.91,0],[.15,-.96,0],[.19,-.81,0]],.043);
      break;
    case 'gentleman':
      fringe();add(head,new THREE.CylinderGeometry(.88,.9,.08,10),'#31343E',[0,.69,-.04]).scale.z=.67;add(head,new THREE.CylinderGeometry(.53,.65,.41,8),'#31343E',[0,.91,-.04]);box(head,'#4A4C58',[1.2,.1,.73],[0,.73,-.04]);poly(head,hair,[[-.23,-.32],[-.13,-.25],[0,-.33],[.13,-.25],[.23,-.32],[.09,-.38],[-.09,-.38]],.04,[0,0,.44],.005);box(head,hair,[.21,.12,.045],[0,-.56,.43]);poly(body,'#565D63',[[-.29,-.2],[.29,-.2],[.18,-1],[-.18,-1]],.035,[0,0,.27],0);triangle(body,accent,.18,.25,[0,-.37,.33],true);stroke(body,gold,[[.05,-.62,.32],[.18,-.79,.32],[.3,-.68,.32]],.014);belt();
      break;
    case 'tiara':
      longHair(hair,-.32);ball(head,hair,.36,[.04,1.04,-.04],[.8,1.1,.8]);fringe(hair);poly(head,accent,[[-.35,.7],[-.27,.91],[-.1,.8],[0,1.05],[.11,.8],[.27,.91],[.35,.7]],.08,[0,0,.33],.008);disc(head,'#93BCD0',.065,[0,.87,.39]);skirt(outfit);for(const x of [-.67,.67])disc(head,accent,.055,[x,-.28,.18]);shoulders.forEach(s=>s.userData.sleeve.visible=false);stroke(body,cream,[[-.23,-.18,.27],[0,-.27,.3],[.23,-.18,.27]],.02);
      break;
    case 'emperor':
      longHair(hair,-.65);poly(head,hair,[[-.48,-.2],[-.44,-.57],[-.25,-.84],[0,-1],[.29,-.81],[.48,-.45],[.45,-.2],[.15,-.3],[-.12,-.3]],.25,[0,0,.4],.018);for(const x of [-.27,-.11,.12,.28])stroke(head,'#627586',[[x,-.35,.56],[x*.47,-.79,.56]],.015);poly(head,'#3E5268',[[-.69,.59],[-.5,1.02],[-.22,.93],[0,1.08],[.22,.93],[.5,1.02],[.69,.59]],.56,[0,0,-.04],.015);box(head,'#7297A6',[1.08,.09,.6],[0,.77,-.03]);eyebrows(hair);
      for(const side of [-1,1]){box(body,gold,[.13,.76,.045],[side*.34,-.57,.28]);box(shoulders[side===-1?0:1],gold,[.26,.09,.37],[0,-.24,.01]);}badge('#A6B4BA',[0,-.81,.37],.15);triangle(body,'#5A6E7B',.17,.18,[0,-.8,.4],true);
      break;
    case 'witch':
      longHair(hair,-.79);poly(head,accent,[[-.71,.68],[-.43,1.2],[-.51,1.55],[-.13,1.89],[.35,1.65],[.07,1.56],[.45,.69]],.68,[0,0,-.04],.015);add(head,new THREE.CylinderGeometry(.99,1.02,.08,8),'#4A4867',[0,.66,-.04]).scale.z=.62;box(head,'#6A91A4',[1.06,.1,.69],[0,.8,-.01]);box(head,'#B4B4A5',[.18,.16,.035],[.19,.8,.38]);bow(body,'#B77F9E',[0,-.42,.34],.2);
      for(const x of [-.21,.21])poly(body,'#504D73',[[x-.11,-.43],[x+.11,-.43],[x+.1,-.8],[x-.1,-.8]],.035,[0,0,.30],0);hips.forEach(h=>{h.userData.foot.material=mat('#607A89');box(h,cream,[.25,.11,.03],[0,-.26,.16]);});
      break;
    default:fringe();
  }
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(.67,24),new THREE.MeshBasicMaterial({color:'#647582',transparent:true,opacity:.10,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.scale.y=.65;shadow.position.set(0,-1.64,.02);model.add(shadow);
  model.userData={isCostumeAvatar:true,kind,body,head,shoulders,hips,eyes,mouth,shadow,motion:0};return model;
}

export function animateCostumeAvatar(model,time,delta=1/60,interaction={}){
  const r=model.userData;if(!r?.isCostumeAvatar)return;
  const t=Math.max(0,Number.isFinite(time)?time:0),dt=Math.min(.1,Math.max(0,delta)),target=interaction.active?1:0;
  r.motion=THREE.MathUtils.damp(r.motion,target,7,dt);const active=r.motion,cycle=t%10;
  const env=(s,a,b,c,d)=>THREE.MathUtils.smoothstep(s,a,b)*(1-THREE.MathUtils.smoothstep(s,c,d));
  const hello=env(cycle,.1,.45,1.8,2.3),walk=env(cycle,3,3.5,5.2,5.9)*(1-active*.75),hop=env(cycle,6.4,6.8,7.9,8.4),step=Math.sin(t*9),greet=Math.max(hello,active);
  const bounce=Math.max(0,Math.sin(t*(active>.2?7.5:6)))*(hop*.14+active*.11);
  r.body.position.set(Math.sin((cycle-3)*2)*walk*.16,Math.abs(step)*walk*.035+bounce,0);
  r.body.rotation.set(0,-.1+Math.sin(t*.65)*.1+(interaction.lookX||0)*active*.09,Math.sin(t*2.2)*.025+Math.sin(t*6)*active*.035);
  const squash=1+Math.sin(t*12)*(.02*hop+.013*active);r.body.scale.set(1/Math.sqrt(squash),squash,1/Math.sqrt(squash));
  r.head.rotation.set((interaction.lookY||0)*-.055+Math.sin(t*7)*active*.035,(interaction.lookX||0)*.085,Math.sin(t*1.7)*.025+Math.sin(t*3)*active*.045);
  r.shoulders[0].rotation.set(step*walk*.34,0,-.61-Math.sin(t*5.8)*active*.10);r.shoulders[1].rotation.set(-step*walk*.34,0,.61+greet*(1.5+Math.sin(t*10)*.28));
  r.hips.forEach((h,i)=>{const d=i===0?1:-1;h.rotation.set(d*step*walk*.44,0,d*Math.sin(t*5.2)*active*.035);h.position.y=-1.04+Math.max(0,d*step)*walk*.04;});
  const blink=t%4.5>4.18&&t%4.5<4.34;r.eyes.forEach(e=>{e.scale.y=blink?.15:1;});r.mouth.scale.x=1+active*.15;r.shadow.scale.set(1-bounce*.6,.65-bounce*.15,1);r.shadow.material.opacity=.1-bounce*.13;
}

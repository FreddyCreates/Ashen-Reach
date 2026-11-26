import * as T from './three.module.js';
const $=id=>document.getElementById(id), scene=new T.Scene(), camera=new T.PerspectiveCamera(44,innerWidth/innerHeight,.1,180);
let renderer;
try{renderer=new T.WebGLRenderer({antialias:true})}catch{ renderer=createCanvasRenderer()}
// Software projection keeps the same simulation playable when WebGL is unavailable.
function createCanvasRenderer(){
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
 const world=new T.Vector3(),point=new T.Vector3(),matrix=new T.Matrix4(),instances=new T.Matrix4();
 return {domElement:canvas,shadowMap:{},setPixelRatio(){},setSize(w,h){canvas.width=w;canvas.height=h},
 render(scene,camera){
 scene.updateMatrixWorld();camera.updateMatrixWorld();const w=canvas.width,h=canvas.height;
 ctx.fillStyle='#d0bfa2';ctx.fillRect(0,0,w,h);ctx.fillStyle='#a38c69';ctx.fillRect(0,h*.32,w,h);
 const list=[];
 function project(o,m){
 world.setFromMatrixPosition(m);point.copy(world).project(camera);
 if(Math.abs(point.x)>1.3||Math.abs(point.y)>1.3||point.z>1||point.z<0)return;
 const depth=-world.applyMatrix4(camera.matrixWorldInverse).z,scale=h/(2*Math.tan(camera.fov*Math.PI/360)*depth);
 const size=new T.Vector3().setFromMatrixScale(m);if(size.x>50||size.y<.15)return;
 list.push({x:(1+point.x)*w/2,y:(1-point.y)*h/2,depth,width:Math.max(1,size.x*scale),height:Math.max(2,Math.max(size.y,size.z*.38)*scale),color:o.material.color.getStyle(),rect:o.geometry.type==='BoxGeometry'||o.geometry.type==='CylinderGeometry'});
 }
 scene.traverseVisible(o=>{if(o.isInstancedMesh){for(let i=0;i<o.count;i++){o.getMatrixAt(i,instances);project(o,matrix.multiplyMatrices(o.matrixWorld,instances))}}else if(o.isMesh)project(o,o.matrixWorld)});
 list.sort((a,b)=>b.depth-a.depth);for(const q of list){ctx.fillStyle=q.color;if(q.rect)ctx.fillRect(q.x-q.width/2,q.y-q.height/2,q.width,q.height);else{ctx.beginPath();ctx.ellipse(q.x,q.y,q.width/2,q.height/2,0,0,Math.PI*2);ctx.fill()}}
 }};
}
document.body.prepend(renderer.domElement);renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
scene.background=new T.Color(0xc6b392);scene.fog=new T.FogExp2(0xc6b392,.014);
scene.add(new T.HemisphereLight(0xffead0,0x756754,2));const sun=new T.DirectionalLight(0xffdfa9,2.8);sun.position.set(-18,32,15);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-42,right:42,top:42,bottom:-42,far:110});sun.shadow.normalBias=.035;scene.add(sun,sun.target);
let seed=917;const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
const materials=new Map(), shapes=new Map();function mesh(parent,type,c,x,y,z,w,h,d){if(!materials.has(c))materials.set(c,new T.MeshStandardMaterial({color:c,roughness:.8}));if(!shapes.has(type))shapes.set(type,type==='box'?new T.BoxGeometry():type==='round'?new T.SphereGeometry(.5,12,10):type==='rock'?new T.DodecahedronGeometry(.56):new T.CylinderGeometry(.49,.53,1,12));const m=new T.Mesh(shapes.get(type),materials.get(c));m.scale.set(w,h,d);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m}
const box=(...a)=>mesh(scene,'box',...a);box(0xa48a63,0,-.45,-15,140,.8,150);
for(let i=0;i<110;i++){let z=rand()*100-60,x=(12+rand()*32)*(rand()<.5?-1:1),s=2+rand()*10;let m=mesh(scene,'rock',i%2?0x847962:0x746b59,x,s*.14,z,s,s*.8,s);m.rotation.y=rand()*6}
for(let i=0;i<160;i++){let m=box(i%2?0xa99879:0xb3a184,(rand()-.5)*11,-.035,rand()*66-45,1+rand(),.13,1+rand());m.rotation.y=rand()*.25}
function pillar(x,z,h){box(0xa89a7c,x,.22,z,2,.44,2);mesh(scene,'cyl',0xb6a98a,x,h/2+.4,z,1.3,h,1.3);box(0xb9ac90,x,h+.55,z,1.8,.38,1.8)}
for(let z=16;z>=-40;z-=8)for(const x of [-9,9]){pillar(x,z,4.8);if(z%16===0)box(0xa69878,x,5.55,z-4,1.55,.75,9);box(x<0?0x6d2730:0x264e53,x*.97,3.85,z,1,.85,.13)}
box(0x706c5e,0,.35,-40,6,.7,5);const relic=mesh(scene,'rock',0x70ead4,0,2,-40,1.1,2,1.1);materials.get(0x70ead4).emissive.setHex(0x269981);
// Batch the stationary scenery so tile and rubble count do not dictate draw calls.
const batches=new Map();
for(const m of scene.children.filter(o=>o.isMesh && o!==relic)){
  const key=m.geometry.uuid+m.material.uuid;
  if(!batches.has(key)) batches.set(key,[]);
  batches.get(key).push(m);
}
for(const objects of batches.values()){
  const first=objects[0], group=new T.InstancedMesh(first.geometry,first.material,objects.length);
  objects.forEach((o,i)=>{o.updateMatrix();group.setMatrixAt(i,o.matrix);scene.remove(o)});
  group.castShadow=group.receiveShadow=true;scene.add(group);
}
const touch=matchMedia('(any-pointer:coarse)').matches;
if(touch){renderer.setPixelRatio(Math.min(devicePixelRatio,1.35));sun.shadow.mapSize.set(1024,1024)}
const stick=$('stick'), knob=stick.firstElementChild;
let axisX=0,axisZ=0,stickPointer=null,rallyUntil=0,rallyReady=0;
function releaseStick(){axisX=axisZ=0;stickPointer=null;knob.style.transform=''}
function aimStick(e){
  if(e.pointerId!==stickPointer)return;
  const r=stick.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,z=e.clientY-r.top-r.height/2;
  const scale=Math.max(34,Math.hypot(x,z));axisX=x/scale;axisZ=z/scale;
  knob.style.transform='translate('+axisX*32+'px,'+axisZ*32+'px)';
}
stick.onpointerdown=e=>{if(stickPointer!==null)return;stickPointer=e.pointerId;stick.setPointerCapture(e.pointerId);aimStick(e)};
stick.onpointermove=aimStick;stick.onlostpointercapture=releaseStick;
document.addEventListener('visibilitychange',()=>{if(document.hidden && mode==='play')$('pause').click()});
let fighters=[],player,stage=0,mode='intro',clock=0,spiritReady=0,keys=new Set(),spiritExpiry=0;
function fighter(team,x,z,role='guard'){const g=new T.Group();scene.add(g);g.position.set(x,0,z);const add=(t,c,a,b,e,w,h,d)=>mesh(g,t,c,a,b,e,w,h,d),cloth=role==='spirit'?0x70ead4:team?0x873a35:0x275e62,metal=team?0x70675b:0xa78249;
let legs=[-.21,.21].map(v=>add('cyl',0x56483a,v,.50,0,.29,.96,.31));add('cyl',cloth,0,1,0,.94,.48,.7);add('round',metal,0,1.57,0,1.12,1.13,.72);add('round',0xb38b68,0,2.26,0,.57,.62,.55);add('round',metal,0,2.48,0,.68,.51,.66);add('box',cloth,0,2.74,0,.13,.24,.62);add('box',metal,0,2.25,.26,.11,.35,.1);
let arm=new T.Group();g.add(arm);arm.position.set(-.58,1.84,0);mesh(arm,'cyl',0xb18b69,0,-.23,0,.27,.59,.27);let spear=team&&stage%2;mesh(arm,'box',spear?0x775234:0xd0d2c9,0,-.32,spear?.86:.55,.13,.09,spear?2.15:1.14);mesh(arm,'rock',0xcfd2cc,0,-.32,spear?1.99:1.15,.14,.09,.32);mesh(arm,'box',metal,0,-.32,.13,.37,.13,.1);const shield=add('round',cloth,.53,1.45,.30,.85,1.16,.24);add('round',metal,.53,1.46,.44,.27,.28,.12);
let f={g,legs,arm,shield,team,role,hp:role==='player'?140:65,cd:0,swing:0,phase:rand()*6};fighters.push(f);return f}
function wave(){for(let i=0;i<3+stage;i++)fighter(1,(i-(2+stage)/2)*1.75,5-stage*15)}
function reset(){for(const f of fighters)scene.remove(f.g);fighters=[];stage=0;clock=0;rallyReady=rallyUntil=0;spiritReady=0;player=fighter(0,0,14,'player');fighter(0,-2,13);fighter(0,2,13);wave()}
function panel(m,title,body,label){mode=m;$('menu').hidden=false;$('pad').hidden=true;$('pause').hidden=true;$('titleText').textContent=title;$('desc').textContent=body;$('start').textContent=label;keys.clear();releaseStick()}
function play(){if(mode==='end')reset();mode='play';$('menu').hidden=true;$('pad').hidden=false;$('pause').hidden=false}
$('start').onclick=play;$('pause').onclick=()=>panel('pause','Battle paused','Your guard awaits your command.','Resume battle');
function down(k){keys.add(k);if(k==='r'&&mode==='play'&&clock>=rallyReady){rallyUntil=clock+4;rallyReady=clock+10}
if(k==='e'&&mode==='play'&&clock>=spiritReady){fighter(0,player.g.position.x+1,player.g.position.z,'spirit');spiritReady=clock+18;spiritExpiry=clock+9}}
onkeydown=e=>{let k=e.key.toLowerCase();if(k.startsWith('arrow'))e.preventDefault();if(k==='escape'&&!e.repeat){if(mode==='play')$('pause').click();else if(mode==='pause')play()}else down(k)};onkeyup=e=>keys.delete(e.key.toLowerCase());onblur=()=>{if(mode==='play')$('pause').click()};document.querySelectorAll('[data-k]').forEach(b=>{b.onpointerdown=e=>{b.setPointerCapture(e.pointerId);down(b.dataset.k)};b.onlostpointercapture=()=>keys.delete(b.dataset.k)});
function strike(f,t){if(f.cd>clock)return;f.swing=.34;f.cd=clock+(f===player?.56:1.4);if(!t)return;const a=f.g.position,b=t.g.position;if(a.distanceTo(b)>2.35)return;f.g.rotation.y=Math.atan2(b.x-a.x,b.z-a.z);t.hp-=t===player&&keys.has('k')?2:f===player?28:f.role==='spirit'?25:10;if(t.hp<=0){t.g.rotation.z=1.52;t.g.position.y=.23}}
function step(dt){clock+=dt;let p=player.g.position;for(const f of fighters){if(f.hp<=0)continue;let a=f.g.position,dx=0,dz=0,t=null,min=Infinity;for(const o of fighters){if(o.team===f.team||o.hp<=0)continue;let d=a.distanceToSquared(o.g.position);if(d<min){min=d;t=o}}
if(f===player){dx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));dz=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));dx+=axisX;dz+=axisZ;if(keys.has('j')&&!keys.has('k'))strike(f,t);f.shield.position.z=keys.has('k')?.62:.30}
else{if(f.role==='spirit'&&clock>spiritExpiry){f.hp=0;f.g.visible=false;continue}let chase=(f.team||clock>=rallyUntil)&&t&&min<(f.team?110:72);let b=chase?t.g.position:f.team?a:p;let distance=a.distanceTo(b);if(chase&&distance<1.8)strike(f,t);else if(distance>(chase?1.55:2)){dx=b.x-a.x;dz=b.z-a.z}}
let len=Math.hypot(dx,dz);if(len){let speed=f===player?(keys.has('k')?2:5)*Math.min(1,len):3.1;a.x=T.MathUtils.clamp(a.x+dx/len*dt*speed,-7.8,7.8);a.z=T.MathUtils.clamp(a.z+dz/len*dt*speed,-42,20);f.g.rotation.y=Math.atan2(dx,dz)}
for(const other of fighters){if(other===f||other.hp<=0)continue;let ox=a.x-other.g.position.x,oz=a.z-other.g.position.z,d=Math.hypot(ox,oz);if(d>.001&&d<.92){a.x+=ox/d*(.92-d)*.4;a.z+=oz/d*(.92-d)*.4}}
f.swing=Math.max(0,f.swing-dt);f.arm.rotation.x=-Math.sin(f.swing/.34*Math.PI)*1.5;f.legs.forEach((l,i)=>l.rotation.x=len?Math.sin(clock*11+f.phase+i*Math.PI)*.38:0)}
let alive=fighters.filter(f=>f.team&&f.hp>0).length;if(player.hp<=0)panel('end','The guard has fallen','Rally your house and return to the valley.','Fight again');else if(!alive&&stage<2){stage++;wave()}else if(!alive&&p.distanceTo(relic.position)<3.5)panel('end','Standard reclaimed','The valley belongs to your house. The spirits return to the altar.','Replay campaign');
$('status').textContent='Health '+Math.max(0,player.hp)+' / 140 · '+(alive?'House '+(stage+1)+' of 3':'Reach the altar')+' · Spirit '+(clock>=spiritReady?'ready':Math.ceil(spiritReady-clock)+'s')+' · '+(clock<rallyUntil?'Regrouping':clock<rallyReady?'Rally '+Math.ceil(rallyReady-clock)+'s':'Rally ready')}
reset();camera.position.set(9,7,21);camera.lookAt(0,1.4,9);let last=performance.now();function frame(now){requestAnimationFrame(frame);let dt=Math.min(.05,(now-last)/1000);last=now;if(mode==='play'){step(dt);let p=player.g.position;camera.position.lerp(new T.Vector3(p.x,camera.aspect<1?11:8.3,p.z+(camera.aspect<1?14:10.8)),1-Math.exp(-6*dt));camera.lookAt(p.x,1,p.z-2.4);sun.position.set(p.x-18,32,p.z+15);sun.target.position.copy(p)}relic.rotation.y=now*.001;renderer.render(scene,camera)}requestAnimationFrame(frame);onresize=()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)};

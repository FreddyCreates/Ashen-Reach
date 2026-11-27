import {renderSurvey} from './survey-view.mjs';
import * as T from './three.module.js';
import {random} from './universe.mjs';
import {shipModel,deckModel,surfaces} from './fleet-models.mjs';
import {applyLighting} from './mesh-light.mjs';
import {drawFallback} from './software-view.mjs';
let canvas=document.getElementById('view'),gl,ctx;
try{gl=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'})}catch{ctx=canvas.getContext('2d')}
const scene=new T.Scene(),camera=new T.PerspectiveCamera(54,1,.08,320),sky=new T.Group(),deck=new T.Group(),fleet=new T.Group(),vessel=new T.Group(),patrol=new T.Group(),fire=new T.Group();scene.add(sky,deck,fleet);fleet.add(vessel,patrol,fire);
const fleetAssets=new Map(),deckAssets=new Map();
const assets=new T.TextureLoader(),textures=new Map();
function texture(name){if(!textures.has(name)){const tex=assets.load('./art/'+name+'.webp');tex.colorSpace=T.SRGBColorSpace;textures.set(name,tex)}return textures.get(name)}
function procedural(width,height,paint){const c=document.createElement('canvas');c.width=width;c.height=height;paint(c.getContext('2d'),width,height);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return tex}
const key=new T.DirectionalLight(0xffe8cd,3.5);key.position.set(-9,5,3);scene.add(key,new T.HemisphereLight(0xc5dbed,0x3c4958,1.25));const rim=new T.DirectionalLight(0x8ad7ee,2.1);rim.position.set(6,3,-8);scene.add(rim);
const orb=new T.Mesh(new T.SphereGeometry(14,80,48),new T.MeshStandardMaterial({roughness:1}));orb.position.set(12,7,-53);sky.add(orb);
const atmosphere=new T.Mesh(orb.geometry,new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.BackSide,blending:T.AdditiveBlending,vertexShader:'varying vec3 normalV; varying vec3 eyeV; void main(){vec4 p=modelViewMatrix*vec4(position,1.);normalV=normalize(normalMatrix*normal);eyeV=-p.xyz;gl_Position=projectionMatrix*p;}',fragmentShader:'varying vec3 normalV; varying vec3 eyeV; void main(){float k=pow(max(0.,1.-abs(dot(normalize(normalV),normalize(eyeV)))),8.);gl_FragColor=vec4(.28,.56,.79,k*.65);}' }));
atmosphere.position.copy(orb.position);atmosphere.scale.setScalar(1.015);sky.add(atmosphere);
const weather=new T.Mesh(orb.geometry,new T.MeshStandardMaterial({transparent:true,depthWrite:false,roughness:1}));
weather.position.copy(orb.position);weather.scale.setScalar(1.008);sky.add(weather);
const moon=new T.Mesh(new T.IcosahedronGeometry(1.25,3),new T.MeshStandardMaterial({color:0xbdb6a6,roughness:1}));sky.add(moon);
const rings=new T.Group();rings.position.copy(orb.position);rings.rotation.set(1.21,.16,-.29);sky.add(rings);
for(const [inner,outer,opacity] of [[17.1,18.05,.12],[18.1,19.9,.39],[20.05,20.26,.53],[20.6,22.3,.24],[22.4,23,.12]]){
 rings.add(new T.Mesh(new T.RingGeometry(inner,outer,120),new T.MeshBasicMaterial({color:0xc7b9a5,side:T.DoubleSide,transparent:true,opacity,depthWrite:false})))
}
const belt=new T.InstancedMesh(new T.IcosahedronGeometry(.17,0),new T.MeshStandardMaterial({color:0x817d79,roughness:.93}),80);sky.add(belt);
const stationMat=new T.MeshStandardMaterial({color:0xbcc0b8,metalness:.45,roughness:.5}),station=new T.InstancedMesh(new T.BoxGeometry(),stationMat,144);sky.add(station);
let worldStamp='',chosen=-1,deckChoice=-1;
function orbit(w){const stamp=w.id+'/'+w.age;if(stamp===worldStamp)return;worldStamp=stamp;orb.material.map=texture('world-'+w.id%4);orb.material.bumpMap=texture('relief-'+w.id%4);orb.material.bumpMap.colorSpace=T.NoColorSpace;orb.material.bumpScale=w.id%4===2?.018:.11;
 weather.material.map=texture('weather-'+w.id%4);weather.material.needsUpdate=true;
 moon.material.bumpMap=texture('relief-0');moon.material.bumpMap.colorSpace=T.NoColorSpace;moon.material.bumpScale=.09;
 rings.visible=w.id%4===2;orb.material.needsUpdate=true;const r=random(w.id+440),o=new T.Object3D();let n=0;
 for(let k=0;k<3;k++)for(let i=0;i<Math.min(16,w.buildings[k]);i++){const a=r()*6.283,rad=16+r()*4;o.position.set(orb.position.x+Math.cos(a)*rad,7+Math.sin(a)*rad*.31,-53+Math.sin(a)*rad);o.rotation.set(.13,a,.08);for(const [x,y,z] of [[.56,.61,.52],[2.3,.08,.48],[.11,1.22,.14]]){o.scale.set(x,y,z);o.updateMatrix();station.setMatrixAt(n++,o.matrix)}}
 for(let i=0;i<belt.count;i++){const angle=r()*Math.PI*2,dist=23+r()*7,sz=.4+r()*1.33;
 o.position.set(orb.position.x+Math.cos(angle)*dist,7+Math.cos(angle)*3+r()*1.4,-53+Math.sin(angle)*dist);
 o.rotation.set(r()*6,r()*6,r()*6);o.scale.set(sz,sz*(.42+r()*.7),sz*.7);o.updateMatrix();belt.setMatrixAt(i,o.matrix)}
 belt.instanceMatrix.needsUpdate=true;belt.computeBoundingSphere();
 station.count=n;station.instanceMatrix.needsUpdate=true;station.computeBoundingSphere()
}
const coreMap=procedural(80,80,(b,w)=>{const grad=b.createRadialGradient(w/2,w/2,0,w/2,w/2,w/2);for(const [p,c] of [[0,'white'],[.18,'#d5ffe8'],[.4,'rgba(92,236,220,.45)'],[1,'transparent']])grad.addColorStop(p,c);b.fillStyle=grad;b.fillRect(0,0,w,w)});
const spirit=new T.Group();const sprite=new T.Sprite(new T.SpriteMaterial({map:coreMap,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));sprite.scale.setScalar(1.25);spirit.add(sprite);
for(let i=0;i<2;i++){const ring=new T.Mesh(new T.TorusGeometry(.3+i*.08,.014,6,44),new T.MeshBasicMaterial({color:0x9bf5e3}));ring.rotation.x=.65+i;spirit.add(ring)}fleet.add(spirit);
const laserGeo=new T.CylinderGeometry(.036,.036,1.3,6);laserGeo.rotateX(Math.PI/2);const beams=[0xb1efff,0xff9072].map(color=>new T.MeshBasicMaterial({color}));
let coating;
function coat(){
 if(!coating){const rand=random(712);
 coating=procedural(192,192,(b,w,h)=>{b.fillStyle='#c6c6c6';b.fillRect(0,0,w,h);for(let i=0;i<8500;i++){const c=Math.round(160+rand()*85);b.fillStyle='rgb('+c+','+c+','+c+')';b.fillRect(rand()*w,rand()*h,rand()*5+.3,.55)}});coating.colorSpace=T.NoColorSpace;coating.wrapS=coating.wrapT=T.RepeatWrapping}
 for(const m of surfaces.values())if(m.name.startsWith('plate')&&!m.roughnessMap){m.roughnessMap=coating;m.bumpMap=coating;m.bumpScale=.007;m.needsUpdate=true}
}
function asset(id){if(!fleetAssets.has(id)){fleetAssets.set(id,shipModel(id));coat();applyLighting(fleetAssets.get(id),'ships',id)}return fleetAssets.get(id)}
function instrumentation(ship){
 const root=deckModel(ship);coat();applyLighting(root,'decks',ship);const map=procedural(512,256,(b,w,h)=>{
 b.fillStyle='#061a21';b.fillRect(0,0,w,h);b.strokeStyle='#163744';for(let i=0;i<w;i+=22){b.beginPath();b.moveTo(i,0);b.lineTo(i,h);b.stroke()}b.fillStyle='#9ddbd1';b.font='bold 25px monospace';b.fillText('ORBITAL NAV',17,36);b.font='15px monospace';b.fillText('VECTOR / TRACK',240,74);b.strokeStyle='#91c3bc';for(let i=1;i<4;i++){b.beginPath();b.ellipse(116,148,i*29,i*16,-.37,0,6.29);b.stroke()}for(let i=0;i<8;i++){b.fillStyle=i%3?'#537b7f':'#cbab7c';b.fillRect(240,90+i*15,43+(i*43)%167,4)}});
 const geometry=new T.PlaneGeometry(1.22,.68),mat=new T.MeshBasicMaterial({map});for(const s of [-1,1]){const screen=new T.Mesh(geometry,mat);screen.position.set(s*2.37,1.99,-6.997);screen.rotation.x=-.18;root.add(screen)}return root
}
const impacts=new T.Group();fleet.add(impacts);
const engines=new T.Group();vessel.add(engines);
const exhaustMaterial=new T.MeshBasicMaterial({color:0x65cfe1,transparent:true,opacity:.35,blending:T.AdditiveBlending,depthWrite:false});
const plumeGeometry=new T.ConeGeometry(.17,.91,18);plumeGeometry.rotateX(Math.PI/2);
for(const side of [-1,1]){const plume=new T.Mesh(plumeGeometry,exhaustMaterial);engines.add(plume)}
const impactMaterials=Array.from({length:12},(_,i)=>new T.SpriteMaterial({map:coreMap,color:0xffbb89,blending:T.AdditiveBlending,opacity:(i+1)/12,depthWrite:false,transparent:true}));
let ratio=1,last=0,frames=0,elapsed=0;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
if(gl){
 gl.toneMapping=T.ACESFilmicToneMapping;gl.toneMappingExposure=1.12;scene.background=texture('dust-lane');
 const env=procedural(512,256,(b,w,h)=>{const grad=b.createLinearGradient(0,0,0,h);grad.addColorStop(0,'#adbbc4');grad.addColorStop(.45,'#4a5761');grad.addColorStop(.61,'#14202a');grad.addColorStop(1,'#484d4c');b.fillStyle=grad;b.fillRect(0,0,w,h);b.fillStyle='#f8e2cb';b.fillRect(42,40,90,20);b.fillStyle='#b3d8e7';b.fillRect(320,78,115,9)});env.mapping=T.EquirectangularReflectionMapping;scene.environment=env;scene.environmentIntensity=.85;
}
function resize(){const w=innerWidth,h=innerHeight;ratio=Math.min(devicePixelRatio,1.65,Math.sqrt(1900000/(w*h)));if(gl){gl.setPixelRatio(ratio);gl.setSize(w,h,false)}else{canvas.width=w;canvas.height=h}camera.aspect=w/h;camera.updateProjectionMatrix()}resize();addEventListener('resize',resize);
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();const replacement=canvas.cloneNode(false);canvas.replaceWith(replacement);canvas=replacement;gl=null;ctx=canvas.getContext('2d');bindLook(canvas);resize()});
let heroAngle=.73,drag=null,activeGame=null;
function stopLook(){drag=null}
function bindLook(surface){
 surface.onpointerdown=e=>{
  if(!activeGame?.canLook || !['hangar','deck'].includes(activeGame.mode) || drag)return;
  drag={x:e.clientX,y:e.clientY,id:e.pointerId};surface.setPointerCapture(e.pointerId)
 };
 surface.onpointermove=e=>{
  if(!drag || drag.id!==e.pointerId || !activeGame?.canLook)return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;
  if(activeGame.mode==='hangar')heroAngle+=dx*.008;
  else{activeGame.yaw-=dx*.005;activeGame.pitch=T.MathUtils.clamp(activeGame.pitch+dy*.004,-.7,.7)}
 };
 surface.onlostpointercapture=stopLook
}
bindLook(canvas);
function sync(group,data,create,adjust){while(group.children.length<data.length)group.add(create());while(group.children.length>data.length)group.remove(group.children[group.children.length-1]);data.forEach((p,i)=>{const o=group.children[i];o.position.set(p.x,p.y||0,p.z);adjust?.(o,p)})}
export function render(g,t){
 activeGame=g;if(g.mode==='survey'){renderSurvey(g.survey,gl,ctx,t);return}const hangar=g.mode==='hangar';if(!gl){drawFallback(ctx,g,t,heroAngle);return}
 const now=performance.now();if(last&&now-last<180){elapsed+=now-last;frames++}last=now;if(frames>=100){if(elapsed/frames>30&&ratio>.8){ratio=Math.max(.8,ratio*.86);gl.setPixelRatio(ratio)}frames=0;elapsed=0}
 orbit(g.world);deck.visible=g.mode==='deck';fleet.visible=!deck.visible;
 if(chosen!==g.ship){vessel.clear();vessel.add(asset(g.ship).clone(),engines);chosen=g.ship}
 if(deck.visible&&deckChoice!==g.ship){if(!deckAssets.has(g.ship))deckAssets.set(g.ship,instrumentation(g.ship));deck.clear();deck.add(deckAssets.get(g.ship));deckChoice=g.ship}
 orb.rotation.y=.8+g.world.id*.53+(reduced?0:t*.006);weather.rotation.y=orb.rotation.y+(reduced?0:t*.0015);moon.position.set(12+Math.cos(t*.008+.4)*26,14,-54+Math.sin(t*.008+.4)*26);camera.clearViewOffset();
 sky.position.y=hangar?0:deck.visible?0:-17;sky.rotation.y=hangar?Math.PI-heroAngle:0;
 if(hangar){const portrait=innerWidth/innerHeight<.94,angle=heroAngle+(reduced?0:Math.sin(t*.085)*.15);vessel.position.set(0,0,0);vessel.rotation.set(0,0,0);
 const d=portrait?Math.max(6.65,4.9/camera.aspect):7.9;camera.position.set(Math.sin(angle)*d,d*.57,-Math.cos(angle)*d);camera.lookAt(0,.10,0);camera.setViewOffset(innerWidth,innerHeight,portrait?0:-innerWidth*.16,innerHeight*(portrait?.15:.015),innerWidth,innerHeight);
 }else if(deck.visible){camera.position.set(g.x,1.65,g.z);camera.rotation.order='YXZ';camera.rotation.set(g.pitch,g.yaw,0)}
 else{vessel.position.set(g.x,0,g.z);vessel.rotation.set(0,0,-g.bank*.21);camera.position.set(g.x,7.0,g.z+8.7);camera.lookAt(g.x,.15,g.z-4.1)}
 patrol.visible=fire.visible=!hangar;if(!hangar&&!deck.visible){sync(patrol,g.enemies,()=>{const o=asset(3).clone();o.scale.setScalar(.68);o.rotation.y=Math.PI;return o});sync(fire,g.shots,()=>new T.Mesh(laserGeo,beams[0]),(o,p)=>{o.material=beams[Number(p.enemy)];o.rotation.y=Math.atan2(p.dx,p.dz)})}
 engines.visible=!hangar&&!deck.visible;
 engines.children.forEach((o,i)=>{o.position.set((i?1:-1)*[.91,1.49,1.2][g.ship],.038,2.50);o.scale.z=.85+.19*Math.sin(t*23+i)});
 impacts.visible=engines.visible;
 if(impacts.visible)sync(impacts,g.impacts,()=>new T.Sprite(impactMaterials[0]),(o,p)=>{const age=1-p.life/p.duration;o.material=impactMaterials[Math.min(11,Math.floor((1-age)*12))];o.scale.setScalar(.45+age*(p.duration>.3?3:1.15))});
 spirit.visible=g.spirit>0&&!hangar;spirit.position.set(g.x+1.9,1+Math.sin(t*4)*.25,g.z);spirit.rotation.y=t*2;
 if(deck.visible){spirit.parent!==scene&&scene.add(spirit);spirit.visible=true;spirit.position.set(-1.65,1.55,-5.35);spirit.rotation.y=t*.7}
 else if(spirit.parent!==fleet)fleet.add(spirit);
 gl.render(scene,camera)
}

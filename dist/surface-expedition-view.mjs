import * as T from './three.module.js';
import {localHeight} from './planet-geography.mjs';
import {TerrainStream} from './terrain-stream.mjs';
import {sentinelMesh,surveyCacheMesh} from './forge-mesh.mjs';
import {shipModel,shipDetailModel,shipLandingLegs,shipLandingModel,surfaces} from './fleet-models.mjs';
import {makeCoastalWater,surfaceLightFor} from './surface-lighting.mjs';
let active=null;
function dispose(){if(!active)return;active.canvas.remove();active.stream?.dispose();active.scene?.traverse(o=>{o.geometry?.dispose();if(o.material&&!Array.isArray(o.material)&&![...surfaces.values()].includes(o.material))o.material.dispose()});active.mats?.forEach(m=>m.dispose());active.renderer?.dispose();active.renderer?.forceContextLoss();active=null}
export function closeSurface(){dispose()}
function create(s,hull){
 const canvas=document.createElement('canvas');canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none';document.body.append(canvas);canvas.style.zIndex='1';
 let renderer;try{renderer=new T.WebGLRenderer({canvas,antialias:true})}catch{}
 if(!renderer){const fallback=document.createElement('canvas');fallback.style.cssText=canvas.style.cssText;fallback.style.zIndex='1';canvas.replaceWith(fallback);return {canvas:fallback,ctx:fallback.getContext('2d'),s}}
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=T.ACESFilmicToneMapping;
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(67,1,.1,1800),family=s.frame.body.id%4;
 const light=surfaceLightFor(family);scene.background=new T.Color(light.haze);scene.fog=new T.FogExp2(scene.background,light.density);
 scene.add(new T.HemisphereLight(light.sky,light.ground,1.65));const sun=new T.DirectionalLight(light.sun,2.5);sun.position.set(-80,100,30);scene.add(sun);
 const stream=new TerrainStream(scene,s.frame);stream.update(s.x,s.z);
 const water=makeCoastalWater(family,light);if(water)scene.add(water);
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-65,right:65,top:65,bottom:-65,near:1,far:280});sun.shadow.bias=-.0003;scene.add(sun.target);
 const mats=[new T.MeshStandardMaterial({color:0x444b52,metalness:.65,roughness:.42}),new T.MeshStandardMaterial({color:0xd2bda2,metalness:.25,roughness:.55}),new T.MeshStandardMaterial({color:0x66c8e5,emissive:0x2085aa,emissiveIntensity:1.7}),new T.MeshStandardMaterial({color:0x14191f,roughness:.8})];
 const model=data=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(data.positions,3));g.setAttribute('normal',new T.BufferAttribute(data.normals,3));g.setAttribute('uv',new T.BufferAttribute(data.uvs,2));g.setIndex(new T.BufferAttribute(data.indices,1));for(const a of data.groups)g.addGroup(a.start,a.count,a.material);const m=new T.Mesh(g,mats);m.castShadow=true;m.receiveShadow=true;return m};
 const ship=s.online?null:shipModel(hull),shipDetail=ship?shipDetailModel(hull):null;
 if(ship){
  const scale=2,base=localHeight(s.frame,0,0)+1.2;
  const groundY=shipLandingLegs(hull).map(([x,z])=>(localHeight(s.frame,x*scale,z*scale)-base)/scale);
  ship.add(shipDetail,shipLandingModel(hull,groundY));
  ship.position.y=base;ship.scale.setScalar(scale);scene.add(ship);
 }
 ship?.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
 const markers=s.sites.map(t=>{const root=new T.Group();root.add(model(t.kind==='sample'?surveyCacheMesh():sentinelMesh()));root.position.set(t.x,localHeight(s.frame,t.x,t.z)+1.4,t.z);scene.add(root);return {root,t}});
 return {canvas,renderer,scene,camera,markers,s,stream,water,sun,mats,shipDetail,remote:new Map(),w:0,h:0};
}
export function drawSurface(s,hull){
 if(!s){if(active)dispose();return}if(!active||active.s!==s){dispose();active=create(s,hull)}
 const a=active,w=innerWidth,h=innerHeight;
 if(a.renderer){if(a.w!==w||a.h!==h){a.w=w;a.h=h;a.renderer.setSize(w,h,false);a.camera.aspect=w/h;a.camera.updateProjectionMatrix()}
 a.stream.update(s.x,s.z);if(a.water){a.water.position.x=s.x;a.water.position.z=s.z;a.water.userData.time.value=s.clock||0;}
 if(a.shipDetail){const d2=s.x*s.x+s.z*s.z;a.shipDetail.visible=d2<(a.shipDetail.visible?46:38)**2;}
 const y=Math.max(s.frame.body.id%4===0?-Infinity:0,localHeight(s.frame,s.x,s.z))+1.8;
 a.sun.position.set(s.x-80,y+100,s.z+30);a.sun.target.position.set(s.x,y,s.z);
 a.camera.position.set(s.x,y,s.z);a.camera.lookAt(s.x+Math.sin(s.yaw)*12,y-.4,s.z-Math.cos(s.yaw)*12);
 for(const {root,t} of a.markers){root.visible=t.kind==='sample'?!t.taken:t.hp>0;root.rotation.y=t.kind==='drone'?Math.atan2(s.x-t.x,s.z-t.z):0}
 if(s.online&&s.remote){
  const list=[...s.remote.players.filter(p=>p.hp>0).map(p=>({...p,kind:'player'})),...s.remote.loot.map(l=>({...l,kind:'loot'})),...s.remote.control.map(c=>({...c,kind:'control',faction:s.remote.territory[c.id]}))];
  const keys=new Set(list.map(p=>p.id));
  for(const [id,o] of a.remote)if(!keys.has(id)){a.scene.remove(o);o.traverse(m=>{m.geometry?.dispose();m.material?.dispose()});a.remote.delete(id)}
  for(const p of list){
   let o=a.remote.get(p.id);const color=p.kind==='loot'?0xe9bc62:p.kind==='control'?0x98adc2:p.faction===s.remote.self.faction?0x49c8ed:0xee7b4e;
   if(!o){o=new T.Group();const mat=new T.MeshStandardMaterial({color,metalness:.35,roughness:.65});
    const part=(geo,x,y,z)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;o.add(m)};
    if(p.kind==='player'){part(new T.CapsuleGeometry(.32,.65,5,10),0,1.1,0);part(new T.SphereGeometry(.24,12,8),0,1.86,0);for(const x of [-.25,.25])part(new T.BoxGeometry(.24,.65,.25),x,.35,0);part(new T.BoxGeometry(.18,.19,.65),.42,1.15,-.26)}
    else if(p.kind==='loot')part(new T.BoxGeometry(.8,.45,.65),0,.24,0);
    else{part(new T.CylinderGeometry(.18,.3,5,12),0,2.5,0);part(new T.BoxGeometry(2,.6,.25),0,5,0)}
    a.scene.add(o);a.remote.set(p.id,o);o.position.set(p.x,localHeight(s.frame,p.x,p.z),p.z);
   }
   o.position.lerp(new T.Vector3(p.x,localHeight(s.frame,p.x,p.z),p.z),.25);o.rotation.y=p.yaw||0;
   o.traverse(m=>{if(m.isMesh)m.material.color.set(p.kind==='control'?(p.faction===s.remote.self.faction?0x49c8ed:p.faction?0xee7b4e:color):color)});
  }
 }
 a.renderer.render(a.scene,a.camera);return}
 const b=a.ctx;if(!b)return;a.canvas.width=w;a.canvas.height=h;b.fillStyle='#14232b';b.fillRect(0,0,w,h);
 const scale=Math.min(w,h)/550,project=t=>[w/2+(t.x-s.x)*scale,h/2+(t.z-s.z)*scale];
 b.strokeStyle='#76999e';b.beginPath();b.arc(w/2,h/2,12000*scale,0,Math.PI*2);b.stroke();
 for(const t of (s.online?[...(s.remote?.players||[]).map(p=>({...p,kind:'drone'})),...(s.remote?.loot||[]),...(s.remote?.control||[])]:[s.ship,...s.sites])){if(t.taken||t.hp===0)continue;const [x,z]=project(t);b.fillStyle=t.kind==='drone'?'#db8959':'#8adbe0';b.fillRect(x-4,z-4,8,8)}
 b.fillStyle='#fff';b.fillRect(w/2-3,h/2-3,6,6);b.beginPath();b.moveTo(w/2,h/2);b.lineTo(w/2+Math.sin(s.yaw)*20,h/2-Math.cos(s.yaw)*20);b.stroke();
}

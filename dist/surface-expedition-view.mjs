import * as T from './three.module.js';
import {localHeight} from './planet-geography.mjs';
import {TerrainStream} from './terrain-stream.mjs';
import {sentinelMesh,surveyCacheMesh} from './forge-mesh.mjs';
import {shipModel,surfaces} from './fleet-models.mjs';
let active=null;
function dispose(){if(!active)return;active.canvas.remove();active.stream?.dispose();active.scene?.traverse(o=>{o.geometry?.dispose();if(o.material&&!Array.isArray(o.material)&&![...surfaces.values()].includes(o.material))o.material.dispose()});active.mats?.forEach(m=>m.dispose());active.renderer?.dispose();active.renderer?.forceContextLoss();active=null}
export function closeSurface(){dispose()}
function create(s,hull){
 const canvas=document.createElement('canvas');canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none';document.body.append(canvas);canvas.style.zIndex='1';
 let renderer;try{renderer=new T.WebGLRenderer({canvas,antialias:true})}catch{}
 if(!renderer){const fallback=document.createElement('canvas');fallback.style.cssText=canvas.style.cssText;canvas.replaceWith(fallback);return {canvas:fallback,ctx:fallback.getContext('2d'),s}}
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=T.ACESFilmicToneMapping;
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(67,1,.1,1800),family=s.frame.body.id%4;
 const palette=[0xb88459,0x729582,0x999999,0x52545a];scene.background=new T.Color(family===0?0xb6a18f:0x9cb6c1);scene.fog=new T.FogExp2(scene.background,.0025);
 scene.add(new T.HemisphereLight(0xcceaff,0x3a302b,2));const sun=new T.DirectionalLight(0xffd6a4,3);sun.position.set(-80,100,30);scene.add(sun);
 const stream=new TerrainStream(scene,s.frame);stream.update(s.x,s.z);
 const water=family!==0?new T.Mesh(new T.PlaneGeometry(1100,1100),new T.MeshPhysicalMaterial({color:0x225d70,roughness:.23,metalness:.18})):null;
 if(water){water.rotation.x=-Math.PI/2;scene.add(water)}
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-65,right:65,top:65,bottom:-65,near:1,far:280});sun.shadow.bias=-.0003;scene.add(sun.target);
 const mats=[new T.MeshStandardMaterial({color:0x444b52,metalness:.65,roughness:.42}),new T.MeshStandardMaterial({color:0xd2bda2,metalness:.25,roughness:.55}),new T.MeshStandardMaterial({color:0x66c8e5,emissive:0x2085aa,emissiveIntensity:1.7}),new T.MeshStandardMaterial({color:0x14191f,roughness:.8})];
 const model=data=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(data.positions,3));g.setAttribute('normal',new T.BufferAttribute(data.normals,3));g.setAttribute('uv',new T.BufferAttribute(data.uvs,2));g.setIndex(new T.BufferAttribute(data.indices,1));for(const a of data.groups)g.addGroup(a.start,a.count,a.material);const m=new T.Mesh(g,mats);m.castShadow=true;m.receiveShadow=true;return m};
 const ship=shipModel(hull);ship.position.y=localHeight(s.frame,0,0)+2;ship.scale.setScalar(2);scene.add(ship);
 ship.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
 const markers=s.sites.map(t=>{const root=new T.Group();root.add(model(t.kind==='sample'?surveyCacheMesh():sentinelMesh()));root.position.set(t.x,localHeight(s.frame,t.x,t.z)+1.4,t.z);scene.add(root);return {root,t}});
 return {canvas,renderer,scene,camera,markers,s,stream,water,sun,mats,w:0,h:0};
}
export function drawSurface(s,hull){
 if(!s){if(active)dispose();return}if(!active||active.s!==s){dispose();active=create(s,hull)}
 const a=active,w=innerWidth,h=innerHeight;
 if(a.renderer){if(a.w!==w||a.h!==h){a.w=w;a.h=h;a.renderer.setSize(w,h,false);a.camera.aspect=w/h;a.camera.updateProjectionMatrix()}
 a.stream.update(s.x,s.z);if(a.water){a.water.position.x=s.x;a.water.position.z=s.z;}
 const y=Math.max(s.frame.body.id%4===0?-Infinity:0,localHeight(s.frame,s.x,s.z))+1.8;
 a.sun.position.set(s.x-80,y+100,s.z+30);a.sun.target.position.set(s.x,y,s.z);
 a.camera.position.set(s.x,y,s.z);a.camera.lookAt(s.x+Math.sin(s.yaw)*12,y-.4,s.z-Math.cos(s.yaw)*12);
 for(const {root,t} of a.markers){root.visible=t.kind==='sample'?!t.taken:t.hp>0;root.rotation.y=t.kind==='drone'?Math.atan2(s.x-t.x,s.z-t.z):0}
 a.renderer.render(a.scene,a.camera);return}
 const b=a.ctx;if(!b)return;a.canvas.width=w;a.canvas.height=h;b.fillStyle='#14232b';b.fillRect(0,0,w,h);
 const scale=Math.min(w,h)/550,project=t=>[w/2+(t.x-s.x)*scale,h/2+(t.z-s.z)*scale];
 b.strokeStyle='#76999e';b.beginPath();b.arc(w/2,h/2,250*scale,0,Math.PI*2);b.stroke();
 for(const t of [s.ship,...s.sites]){if(t.taken||t.hp===0)continue;const [x,z]=project(t);b.fillStyle=t.kind==='drone'?'#db8959':'#8adbe0';b.fillRect(x-4,z-4,8,8)}
 b.fillStyle='#fff';b.fillRect(w/2-3,h/2-3,6,6);b.beginPath();b.moveTo(w/2,h/2);b.lineTo(w/2+Math.sin(s.yaw)*20,h/2-Math.cos(s.yaw)*20);b.stroke();
}

import * as T from './three.module.js';
import {localHeight} from './planet-geography.mjs';
import {shipModel} from './fleet-models.mjs';
let active=null;
function dispose(){if(!active)return;active.canvas.remove();active.scene?.traverse(o=>{o.geometry?.dispose();if(o.material&&!Array.isArray(o.material))o.material.dispose()});active.renderer?.dispose();active.renderer?.forceContextLoss();active=null}
export function closeSurface(){dispose()}
function create(s,hull){
 const canvas=document.createElement('canvas');canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none';document.body.prepend(canvas);
 let renderer;try{renderer=new T.WebGLRenderer({canvas,antialias:true})}catch{}
 if(!renderer){const fallback=document.createElement('canvas');fallback.style.cssText=canvas.style.cssText;canvas.replaceWith(fallback);return {canvas:fallback,ctx:fallback.getContext('2d'),s}}
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=T.ACESFilmicToneMapping;
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(67,1,.1,1800),family=s.frame.body.id%4;
 const palette=[0xb88459,0x729582,0x999999,0x52545a];scene.background=new T.Color(family===0?0xb6a18f:0x9cb6c1);scene.fog=new T.FogExp2(scene.background,.0025);
 scene.add(new T.HemisphereLight(0xcceaff,0x3a302b,2));const sun=new T.DirectionalLight(0xffd6a4,3);sun.position.set(-80,100,30);scene.add(sun);
 const geo=new T.PlaneGeometry(1200,1200,128,128);geo.rotateX(-Math.PI/2);
 const pos=geo.attributes.position,colors=[];
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),h=localHeight(s.frame,x,z);pos.setY(i,h);const c=new T.Color(palette[family]);c.multiplyScalar(.85+.15*Math.sin(x*.17+z*.11));colors.push(c.r,c.g,c.b)}
 geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();scene.add(new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,roughness:.95})));
 if(family!==0){const ocean=new T.Mesh(new T.PlaneGeometry(1200,1200),new T.MeshPhysicalMaterial({color:0x225d70,roughness:.25,metalness:.2}));ocean.rotation.x=-Math.PI/2;scene.add(ocean)}
 const ship=shipModel(hull);ship.position.y=localHeight(s.frame,0,0)+2;ship.scale.setScalar(2);scene.add(ship);
 const markers=s.sites.map(t=>{const root=new T.Group(),mat=new T.MeshStandardMaterial({color:t.kind==='sample'?0x43d8e8:0xd07835,emissive:t.kind==='sample'?0x166777:0x421d0c,roughness:.35,metalness:.5});const m=new T.Mesh(t.kind==='sample'?new T.IcosahedronGeometry(.8,1):new T.SphereGeometry(.9,20,12),mat);root.add(m);root.position.set(t.x,localHeight(s.frame,t.x,t.z)+1.4,t.z);scene.add(root);return {root,t}});
 return {canvas,renderer,scene,camera,markers,s,w:0,h:0};
}
export function drawSurface(s,hull){
 if(!s){if(active)dispose();return}if(!active||active.s!==s){dispose();active=create(s,hull)}
 const a=active,w=innerWidth,h=innerHeight;
 if(a.renderer){if(a.w!==w||a.h!==h){a.w=w;a.h=h;a.renderer.setSize(w,h,false);a.camera.aspect=w/h;a.camera.updateProjectionMatrix()}
 const y=Math.max(s.frame.body.id%4===0?-Infinity:0,localHeight(s.frame,s.x,s.z))+1.8;
 a.camera.position.set(s.x,y,s.z);a.camera.lookAt(s.x+Math.sin(s.yaw)*12,y-.4,s.z-Math.cos(s.yaw)*12);
 for(const {root,t} of a.markers){root.visible=t.kind==='sample'?!t.taken:t.hp>0;root.rotation.y=s.clock*.6}
 a.renderer.render(a.scene,a.camera);return}
 const b=a.ctx;if(!b)return;a.canvas.width=w;a.canvas.height=h;b.fillStyle='#14232b';b.fillRect(0,0,w,h);
 const scale=Math.min(w,h)/550,project=t=>[w/2+(t.x-s.x)*scale,h/2+(t.z-s.z)*scale];
 b.strokeStyle='#76999e';b.beginPath();b.arc(w/2,h/2,250*scale,0,Math.PI*2);b.stroke();
 for(const t of [s.ship,...s.sites]){if(t.taken||t.hp===0)continue;const [x,z]=project(t);b.fillStyle=t.kind==='drone'?'#db8959':'#8adbe0';b.fillRect(x-4,z-4,8,8)}
 b.fillStyle='#fff';b.fillRect(w/2-3,h/2-3,6,6);b.beginPath();b.moveTo(w/2,h/2);b.lineTo(w/2+Math.sin(s.yaw)*20,h/2-Math.cos(s.yaw)*20);b.stroke();
}

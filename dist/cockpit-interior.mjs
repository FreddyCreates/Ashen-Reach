import * as T from './three.module.js';

// Meter-scale cockpit, rendered from the pilot's eye. The transparent background
// preserves the live planetary renderer; no concept image is used as a backdrop.
let rig=null,unavailable=false;
function create(){
 const canvas=document.createElement('canvas');
 canvas.id='pilot-interior';canvas.setAttribute('aria-hidden','true');
 canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:1;pointer-events:none';
 let renderer;
 try{renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'})}catch{return null}
 document.body.append(canvas);
 renderer.setClearColor(0,0);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(62.13,1,.05,20),root=new T.Group();
 scene.add(root);camera.position.set(0,0,0);
 scene.add(new T.HemisphereLight(0xd3e6f7,0x251b14,1.6));
 const key=new T.DirectionalLight(0xffd4a2,3.3);key.position.set(-3,4,1);scene.add(key);
 const fill=new T.DirectionalLight(0x73ccff,1.2);fill.position.set(3,-1,-2);scene.add(fill);
 const steel=new T.MeshStandardMaterial({color:0x353f47,metalness:.72,roughness:.35});
 const ceramic=new T.MeshStandardMaterial({color:0xbcb6a7,metalness:.35,roughness:.48});
 const rubber=new T.MeshStandardMaterial({color:0x141c22,metalness:.1,roughness:.82});
 const amber=new T.MeshStandardMaterial({color:0xffb347,emissive:0xff7622,emissiveIntensity:2.4});
 const cyan=new T.MeshStandardMaterial({color:0x5ccad8,emissive:0x42b8cb,emissiveIntensity:1.4});
 const boxGeo=new T.BoxGeometry(1,1,1);
 const box=(parent,material,x,y,z,w,h,d)=>{const m=new T.Mesh(boxGeo,material);m.position.set(x,y,z);m.scale.set(w,h,d);parent.add(m);return m};
 const strut=(a,b,w,d,mat)=>{const m=new T.Mesh(boxGeo,mat);const dir=new T.Vector3().subVectors(b,a);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.clone().normalize());m.scale.set(w,dir.length(),d);root.add(m)};
 for(const side of [-1,1]){
  const a=new T.Vector3(side*1.55,-1.3,-2.5),b=new T.Vector3(side*1.04,1.4,-2.1);
  strut(a,b,.22,.27,steel);strut(a.clone().add(new T.Vector3(side*.11,0,.12)),b.clone().add(new T.Vector3(side*.11,0,.12)),.09,.13,ceramic);
  strut(new T.Vector3(side*1.45,-.98,-2.32),new T.Vector3(side*1.18,.38,-2.15),.028,.04,amber);
  box(root,rubber,side*1.3,-1.02,-1.85,.72,.3,.75);
  for(let k=0;k<6;k++)box(root,steel,side*1.3,-.86,-2.1+k*.065,.52,.025,.02);
  box(root,ceramic,side*1.18,-1.01,-1.52,.12,.2,.28);
 }
 // Layered panels, seams, fasteners and physical illuminated controls.
 box(root,rubber,0,-1.05,-2.12,3.2,.39,.72);
 box(root,steel,0,-.89,-2.48,3.08,.18,.25);
 box(root,ceramic,0,-1.17,-1.77,3.2,.12,.12);
 const screens=[];
 for(let i=0;i<3;i++){
  const x=(i-1)*.98, panel=new T.Group();panel.position.set(x,-.88,-2.18);panel.rotation.x=-.16;panel.rotation.y=(1-i)*.09;root.add(panel);
  box(panel,steel,0,0,0,.94,.54,.105);
  box(panel,rubber,0,0,.059,.87,.47,.03);
  const texCanvas=document.createElement('canvas');texCanvas.width=512;texCanvas.height=288;
  const tex=new T.CanvasTexture(texCanvas);tex.colorSpace=T.SRGBColorSpace;
  const display=new T.Mesh(new T.PlaneGeometry(.79,.4),new T.MeshBasicMaterial({map:tex,toneMapped:false}));
  display.position.z=.078;panel.add(display);
  screens.push({ctx:texCanvas.getContext('2d'),tex});
  for(const sx of [-1,1])for(const sy of [-1,1])box(panel,ceramic,sx*.44,sy*.245,.062,.025,.025,.014);
  for(let k=0;k<6;k++)box(panel,k===0?amber:cyan,-.34+k*.135,-.29,.07,.08,.025,.045);
 }
 const controls=[];
 for(const side of [-1,1]){
  const base=new T.Group();base.position.set(side*.92,-1.17,-1.58);root.add(base);
  const stick=new T.Mesh(new T.CylinderGeometry(.055,.075,.37,16),rubber);stick.position.y=.18;base.add(stick);
  box(base,steel,0,.38,0,.17,.09,.19);box(base,amber,0,.43,.035,.06,.02,.05);controls.push(base);
 }
 return {canvas,renderer,scene,camera,root,screens,controls,width:0,height:0,last:-Infinity,drawn:-Infinity};
}
function screen(s,title,rows){
 const b=s.ctx;b.fillStyle='#07141c';b.fillRect(0,0,512,288);
 b.strokeStyle='#1c4350';b.lineWidth=1;
 for(let x=0;x<512;x+=32){b.beginPath();b.moveTo(x,0);b.lineTo(x,288);b.stroke()}
 for(let y=0;y<288;y+=32){b.beginPath();b.moveTo(0,y);b.lineTo(512,y);b.stroke()}
 b.fillStyle='#ffc27a';b.font='bold 19px monospace';b.fillText(title,24,32);
 b.strokeStyle='#4b8b98';b.beginPath();b.moveTo(24,46);b.lineTo(488,46);b.stroke();
 rows.forEach(([name,value],i)=>{const y=85+i*62;b.font='16px monospace';b.fillStyle='#8fb9c4';b.fillText(name,24,y);b.font='bold 24px monospace';b.fillStyle='#d7f6f8';b.fillText(String(value),24,y+27)});
 s.tex.needsUpdate=true;
}
export function renderCockpit(active,data,now){
 if(!active){if(rig)rig.canvas.hidden=true;return}
 if(unavailable)return;
 if(!rig){rig=create();if(!rig){unavailable=true;return}}
 const r=rig;r.canvas.hidden=false;
 const w=innerWidth,h=innerHeight;if(!w||!h)return;
 if(w!==r.width||h!==r.height){r.width=w;r.height=h;r.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));r.renderer.setSize(w,h,false);r.camera.aspect=w/h;r.camera.updateProjectionMatrix();r.root.scale.x=Math.min(1,w/h/1.3)}
 if(now-r.last>120){
  r.last=now;const fmt=n=>Math.round(n).toLocaleString('en-US');
  screen(r.screens[0],'VESSEL SYSTEMS',[['HULL',fmt(data.hull)+'%'],['VELOCITY',fmt(data.speed)+' M/S'],['DRIVE',data.drive]]);
  screen(r.screens[1],'NAVIGATION',[['DESTINATION',data.target],['RANGE',fmt(data.range)+' M'],['CLEARANCE',fmt(data.alt)+' M']]);
  screen(r.screens[2],'FLIGHT TELEMETRY',[['VERTICAL',fmt(data.vertical)+' M/S'],['MODE',data.approach?'N-04 APPROACH':'MANUAL'],['HEADING',fmt(data.heading)+' DEG']]);
 }
 if(now-r.drawn>25){r.drawn=now;r.renderer.render(r.scene,r.camera)}
}

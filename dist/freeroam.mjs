// Freeport uses metres, seconds and planar local-frame velocities.
import {ships, world, cycle, random} from './universe.mjs';
import * as T from './three.module.js';
import {shipModel} from './fleet-models.mjs';

const STEP=1/60, DOCK_RADIUS=13, DOCK_SPEED=9;
const stations=[
  {name:'Hearth Exchange',color:'#e4b779',role:'Exchange'},
  {name:'Relay Nine',color:'#8acdd3',role:'Power relay'},
  {name:'Morrow Works',color:'#bfa4cc',role:'Fabrication yard'},
  {name:'Glass Hospice',color:'#90c899',role:'Medical station'}
];
const profiles=[
  {mass:8200,force:246000,speed:58},{mass:19400,force:380000,speed:47},
  {mass:10400,force:273000,speed:54}
];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const speed=a=>Math.hypot(a.vx,a.vz);
const bound=(v,min,max)=>Math.min(max,Math.max(min,v));
const validInt=(v,lo,hi)=>Number.isSafeInteger(v)&&v>=lo&&v<=hi;
const yard=id=>validInt(id,0,3);
const finite=(v,fallback=0)=>Number.isFinite(v)?v:fallback;
function getPorts(worldId){
  const r=random(worldId*739+411);return stations.map((s,i)=>{
    const angle=i*Math.PI/2+.48+r()*.35, radius=91+r()*24;
    return {...s,id:i,x:Math.cos(angle)*radius,z:Math.sin(angle)*radius};
  });
}
function validJob(job){
  return job && yard(job.origin)&&yard(job.dest)&&job.origin!==job.dest&&
    ['sealed','medical'].includes(job.kind)&&['pickup','delivery'].includes(job.stage)&&validInt(job.reward,1,1000);
}
export function createDistrict(worldId=0,shipId=0,record={}){
  record=record&&typeof record==='object'?record:{};
  const ports=getPorts(worldId),dock=ports[yard(record.dock)?record.dock:0];
  const player={x:dock.x,z:dock.z,vx:0,vz:0,angle:0};
  if(record.state?.every?.(Number.isFinite)&&record.state.length===4){
    [player.x,player.z,player.vx,player.vz]=record.state.map(v=>bound(v,-420,420));
  }
  const agents=Array.from({length:5},(_,i)=>{
    const p=ports[i%4],q=ports[(i+1)%4],f=(i+.7)/6;
    return {kind:i===4?'customs':'carrier',x:p.x*(1-f)+q.x*f,z:p.z*(1-f)+q.z*f,vx:0,vz:0,
      port:(i+1)%4,wait:0,angle:0,scan:0,runs:0};
  });
  return {worldId,shipId:validInt(shipId,0,2)?shipId:0,ports,player,agents,dock:dock.id,
    credits:validInt(record.credits,0,1e9)?record.credits:0,
    completed:validInt(record.completed,0,1e8)?record.completed:0,
    tuning:validInt(record.tuning,0,3)?record.tuning:0,
    heat:bound(finite(record.heat),0,60), veil:bound(finite(record.veil),0,6),
    cooldown:bound(finite(record.cooldown),0,21), job:validJob(record.job)?{...record.job}:null,
    freight:ports.map((_,i)=>validInt(record.freight?.[i],0,250)?record.freight[i]:5),
    course:null,clock:0,event:'',revision:0};
}
export function serializeDistrict(s){
  const {credits,completed,tuning,dock,heat,veil,cooldown,job,freight,player:p}=s;
  return {version:1,credits,completed,tuning,dock,heat,veil,cooldown,job:job?{...job}:null,
    freight:[...freight],state:[p.x,p.z,p.vx,p.vz]};
}
function announce(s,msg){s.event=msg;s.revision++;return msg}
export function contractOffers(s){
  const origin=s.dock;
  return ['medical','sealed'].map((kind,i)=>{
    const offset=1+((s.completed+i+s.worldId)%3);
    const dest=(origin+offset)%4;
    const base=Math.round(distance(s.ports[origin],s.ports[dest])*.48)+60;
    return {kind,stage:'pickup',origin,dest,reward:base+(kind==='sealed'?100:0)+Math.max(0,8-s.freight[dest])*3};
  });
}
export function acceptContract(s,kind){
  if(s.job)return 'Complete the active run first.';
  const offer=contractOffers(s).find(o=>o.kind===kind);
  if(!offer)return 'Contract unavailable.';
  s.job=offer;
  return announce(s,'Manifest accepted. Dock at '+s.ports[offer.origin].name+' to load.');
}
export function destination(s){return s.job?s.ports[s.job.stage==='pickup'?s.job.origin:s.job.dest]:s.ports[s.dock]}
export function dockShip(s){
  const p=s.player,port=s.ports.reduce((a,b)=>distance(a,p)<distance(b,p)?a:b);
  if(distance(p,port)>DOCK_RADIUS)return 'Approach within '+DOCK_RADIUS+' m of a dock.';
  if(speed(p)>DOCK_SPEED)return 'Brake below '+DOCK_SPEED+' m/s to dock.';
  s.dock=port.id;p.x=port.x;p.z=port.z;p.vx=p.vz=0;s.course=null;
  if(!s.job)return announce(s,'Docked at '+port.name+'. Contracts and refits available.');
  if(s.job.stage==='pickup'&&port.id===s.job.origin){
    s.job.stage='delivery';s.freight[port.id]=Math.max(0,s.freight[port.id]-1);
    if(s.job.kind==='sealed')s.heat=60;
    return announce(s,'Hold loaded. Deliver to '+s.ports[s.job.dest].name+'.');
  }
  if(s.job.stage==='delivery'&&port.id===s.job.dest){
    const payment=s.job.reward;
    s.credits+=payment;s.completed++;s.freight[port.id]=Math.min(250,s.freight[port.id]+1);
    s.job=null;s.heat=0;
    return announce(s,'Consignment delivered. Earned '+payment+' credits.');
  }
  return announce(s,'Docked at '+port.name+'. Manifest points to '+destination(s).name+'.');
}
export function refit(s){
  if(distance(s.player,s.ports[s.dock])>DOCK_RADIUS||speed(s.player)>DOCK_SPEED)return 'Dock at a station for refit.';
  if(s.tuning===3)return 'All three thruster stages installed.';
  const cost=100*(s.tuning+1);if(s.credits<cost)return 'Refit requires '+cost+' credits.';
  s.credits-=cost;s.tuning++;
  return announce(s,'Thruster stage '+s.tuning+' installed.');
}
export function phaseVeil(s){
  if(s.cooldown>0)return 'Spirit returns in '+Math.ceil(s.cooldown)+' s.';
  s.veil=6;s.cooldown=s.shipId===2?13:21;return announce(s,'Spirit veil engaged. Customs lock interrupted.');
}
function pursuitAxis(body,target,limit,accel){
  const dx=target.x-body.x,dz=target.z-body.z,d=Math.hypot(dx,dz);
  const wanted=Math.min(limit,d*1.5,Math.sqrt(1.45*accel*d));
  const vx=(d?dx/d:0)*wanted, vz=(d?dz/d:0)*wanted;
  const ax=(vx-body.vx)*2.9/accel,az=(vz-body.vz)*2.9/accel;
  const norm=Math.max(1,Math.hypot(ax,az));return [ax/norm,az/norm];
}
function advance(body,ax,az,limit,dt){
  body.vx+=ax*dt;body.vz+=az*dt;
  const k=Math.min(1,limit/(speed(body)||1));body.vx*=k;body.vz*=k;
  const x=body.x+body.vx*dt,z=body.z+body.vz*dt;
  body.x=bound(x,-420,420);body.z=bound(z,-420,420);
  if(x!==body.x)body.vx=0;if(z!==body.z)body.vz=0;
  if(speed(body)>.7)body.angle=Math.atan2(-body.vx,-body.vz);
}
export function tickDistrict(s,controls={},dt=STEP){
  s.clock+=dt;s.veil=Math.max(0,s.veil-dt);s.cooldown=Math.max(0,s.cooldown-dt);
  const p=s.player,ship=profiles[s.shipId];
  const accel=ship.force/(ship.mass+(s.job?.stage==='delivery'?2200:0))*(1+.13*s.tuning);
  const cap=ship.speed*(1+.045*s.tuning);
  let x=finite(controls.x),z=finite(controls.z);
  if(Math.hypot(x,z)>.08||controls.brake)s.course=null;
  if(s.course!==null){[x,z]=pursuitAxis(p,s.ports[s.course],cap*.9,accel);
    if(distance(p,s.ports[s.course])<3&&speed(p)<3){p.vx=p.vz=0;s.course=null;x=z=0;announce(s,'Docking range. Use Dock to transfer cargo.')}
  }
  if(controls.brake){const scale=Math.min(speed(p)/dt,accel*1.2)/(speed(p)||1);advance(p,-p.vx*scale,-p.vz*scale,cap,dt)}
  else{const norm=Math.max(1,Math.hypot(x,z));advance(p,x/norm*accel,z/norm*accel,cap,dt)}
  for(const [i,a] of s.agents.entries()){
    const wanted=s.job?.kind==='sealed'&&s.job.stage==='delivery'&&s.heat>0&&s.veil===0;
    const chase=a.kind==='customs'&&wanted;
    if(chase)a.wait=0;
    if(a.wait>0){a.wait=Math.max(0,a.wait-dt);continue}
    const target=chase?p:s.ports[a.port],max=chase?42:a.kind==='customs'?26:16+i*1.4;
    const [ax,az]=pursuitAxis(a,target,max,24);advance(a,ax*24,az*24,max,dt);
    if(chase){a.scan=distance(a,p)<20?a.scan+dt:Math.max(0,a.scan-2*dt);
      if(a.scan>3.2){
        const fine=Math.min(s.credits,45);s.credits-=fine;s.job=null;s.heat=0;s.course=null;a.scan=0;a.wait=2;
        announce(s,'Customs confiscated the sealed hold.'+(fine?' Fine: '+fine+' credits.':''));
      }
    }else{a.scan=0;if(distance(a,target)<3&&speed(a)<4){a.vx=a.vz=0;a.wait=1.8+i*.37;
      if(a.kind==='carrier'){s.freight[a.port]=Math.min(250,s.freight[a.port]+1);s.freight[(a.port+3)%4]=Math.max(0,s.freight[(a.port+3)%4]-1)}
      a.port=(a.port+1)%4;a.runs++;
    }}
  }
}

function makePortView(canvas,s){
  let renderer;
  try{renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false})}catch{}
  if(!renderer)return flatPortView(canvas,s);
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.4));renderer.toneMapping=T.ACESFilmicToneMapping;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(54,1,.2,640);
  scene.background=new T.Color('#08131e');scene.fog=new T.FogExp2(0x101e29,.004);
  scene.add(new T.HemisphereLight(0xc1e5ff,0x27343b,1.8));const sun=new T.DirectionalLight(0xffe0bb,3.1);
  sun.position.set(-44,70,35);scene.add(sun);
  const textures=[];const stars=random(s.worldId+52),sky=new Float32Array(1800);
  for(let i=0;i<sky.length;i+=3){sky[i]=(stars()-.5)*800;sky[i+1]=stars()*180-95;sky[i+2]=(stars()-.5)*800}
  const sg=new T.BufferGeometry();sg.setAttribute('position',new T.BufferAttribute(sky,3));scene.add(new T.Points(sg,new T.PointsMaterial({color:0xb6d3db,size:.38})));
  const map=new T.TextureLoader().load(new URL('./art/world-'+s.worldId%4+'.webp',import.meta.url).href);
  map.colorSpace=T.SRGBColorSpace;textures.push(map);
  const globe=new T.Mesh(new T.SphereGeometry(54,40,24),new T.MeshStandardMaterial({map,roughness:1}));
  globe.position.set(90,-29,-214);scene.add(globe);
  const metal=new T.MeshStandardMaterial({color:0x566672,metalness:.45,roughness:.61});
  const ivory=new T.MeshStandardMaterial({color:0xb2b6ae,metalness:.35,roughness:.6});
  const beam=new T.BoxGeometry(),hub=new T.CylinderGeometry(5.1,4.7,3,12);
  const ring=new T.TorusGeometry(8.4,.46,6,36);
  const place=(parent,geo,mat,x,y,z,sx=1,sy=1,sz=1)=>{
    const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m};
  const signs=[];
  for(const p of s.ports){
    const tower=new T.Group();tower.position.set(p.x,-4,p.z);scene.add(tower);
    const light=new T.MeshStandardMaterial({color:p.color,emissive:p.color,emissiveIntensity:.74});
    place(tower,hub,ivory,0,0,0);const dockRing=place(tower,ring,light,0,1.2,0);dockRing.rotation.x=Math.PI/2;
    for(let i=0;i<4;i++){
      const a=i*Math.PI/2,branch=new T.Group();branch.rotation.y=a;tower.add(branch);
      place(branch,beam,metal,0,0,6,1.1,1,8);place(branch,beam,ivory,0,0,9,4.8,1.3,2.3);
      place(branch,beam,light,0,1,8.9,3.5,.18,.45);
    }
    if(p.id===1){for(let j=0;j<2;j++)place(tower,beam,ivory,3*j-1.5,4,0,.4,8,.4)}
    const label=document.createElement('canvas');label.width=384;label.height=64;const b=label.getContext('2d');b.fillStyle=p.color;
    b.font='600 27px system-ui';b.textAlign='center';b.fillText(p.name,192,44);
    const tex=new T.CanvasTexture(label);textures.push(tex);const sign=new T.Sprite(new T.SpriteMaterial({map:tex,depthTest:false}));sign.scale.set(18,3,1);sign.position.set(p.x,4.5,p.z);scene.add(sign);signs.push(sign);
  }
  const source=[0,1,2,3].map(id=>shipModel(id));
  const actor=(body,id,size)=>{const model=source[id].clone(true);model.scale.setScalar(size);scene.add(model);return {body,model}};
  const actors=[actor(s.player,s.shipId,1.35),...s.agents.map(a=>actor(a,a.kind==='customs'?3:1,a.kind==='customs'?1.3:1.55))];
  const guide=new T.Line(new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(new Float32Array(6),3)),new T.LineBasicMaterial({color:0xc7b587,opacity:.42,transparent:true}));guide.frustumCulled=false;scene.add(guide);
  const spirit=new T.Mesh(new T.OctahedronGeometry(.72),new T.MeshBasicMaterial({color:0x83ffe2}));scene.add(spirit);
  return {
    resize(w,h){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()},
    draw(){for(const {model,body} of actors){model.position.set(body.x,0,body.z);model.rotation.y=body.angle}
      const p=s.player;camera.position.set(p.x,32,p.z+25);camera.lookAt(p.x,0,p.z-5);
      const target=s.ports[s.course]??(s.job?destination(s):null);guide.visible=!!target;
      if(target){const pos=guide.geometry.attributes.position;pos.setXYZ(0,p.x,-1,p.z);pos.setXYZ(1,target.x,-1,target.z);pos.needsUpdate=true}
      spirit.visible=s.veil>0;spirit.position.set(p.x+2.5*Math.cos(s.clock*2),1,p.z+2.5*Math.sin(s.clock*2));
      renderer.render(scene,camera)
    },
    dispose(){const geometry=new Set(),materials=new Set();scene.traverse(o=>{if(o.geometry)geometry.add(o.geometry);if(o.material)materials.add(o.material)});
      for(const g of geometry)g.dispose();
      for(const m of materials)if(!source.some(root=>root.children.some(child=>child.material===m)))m.dispose();
      for(const t of textures)t.dispose();renderer.dispose();renderer.forceContextLoss()
    }
  }
}
function flatPortView(canvas,s){
  const b=canvas.getContext('2d'),images={};for(const name of ['dust-lane','disc-'+s.worldId%4,...[0,1,2,3].map(i=>'flight-'+i)]){
    const im=new Image();im.src=new URL('./art/'+name+'.webp',import.meta.url);images[name]=im;
  }
  const loaded=im=>im.complete&&im.naturalWidth>0;
  return {resize(w,h){canvas.width=w;canvas.height=h},dispose(){},draw(){
    const w=canvas.width,h=canvas.height,scale=Math.max(2.5,Math.min(w,h)/94),p=s.player;
    const sx=x=>w*.5+(x-p.x)*scale,sz=z=>h*.51+(z-p.z)*scale;
    b.fillStyle='#09141d';b.fillRect(0,0,w,h);if(loaded(images['dust-lane']))b.drawImage(images['dust-lane'],0,0,w,h);
    const disc=images['disc-'+s.worldId%4],r=Math.min(w,h)*.3;if(loaded(disc))b.drawImage(disc,w*.88-r-p.x*.16,h*.21-r-p.z*.13,r*2,r*2);
    const target=s.ports[s.course]??(s.job?destination(s):null);
    if(target){b.strokeStyle='#cfc09a88';b.setLineDash([6,10]);b.beginPath();b.moveTo(sx(p.x),sz(p.z));b.lineTo(sx(target.x),sz(target.z));b.stroke();b.setLineDash([])}
    for(const port of s.ports){
      const x=sx(port.x),y=sz(port.z);b.lineWidth=2;b.strokeStyle=port.color;b.beginPath();b.ellipse(x,y,scale*8,scale*5,0,0,Math.PI*2);b.stroke();
      b.fillStyle='#465b65';b.fillRect(x-8*scale,y-1.2*scale,16*scale,2.4*scale);b.fillStyle=port.color;b.fillRect(x-2.5*scale,y-2*scale,5*scale,4*scale);
      b.font='600 12px system-ui';b.textAlign='center';b.fillText(port.name,x,y-6.5*scale);
    }
    const craft=(a,id,width)=>{const im=images['flight-'+id];b.save();b.translate(sx(a.x),sz(a.z));b.rotate(-a.angle);
      if(loaded(im))b.drawImage(im,-width/2,-width/2,width,width);else{b.fillStyle=id===3?'#ea8d79':'#accdd7';b.beginPath();b.moveTo(0,-9);b.lineTo(7,7);b.lineTo(-7,7);b.closePath();b.fill()}b.restore()};
    for(const a of s.agents)craft(a,a.kind==='customs'?3:1,scale*7);craft(p,s.shipId,scale*7.6);
    if(s.veil>0){b.fillStyle='#8fffe2';b.beginPath();b.arc(sx(p.x+2.5*Math.cos(s.clock*2)),sz(p.z+2.5*Math.sin(s.clock*2)),4,0,Math.PI*2);b.fill()}
  }};
}
const portStyles=`
:host{position:fixed;inset:0;z-index:20;font:15px/1.4 system-ui;color:#e4edeb;background:#0c151e;color-scheme:dark}
*{box-sizing:border-box}canvas{position:absolute;inset:0;width:100%;height:100%}
button{background:#10232cec;border:1px solid #739196aa;color:#e5edeb;border-radius:5px;font:600 14px system-ui;padding:10px 12px;min-height:44px;touch-action:none;cursor:pointer}
button:focus-visible{outline:2px solid #e8cb96}button:disabled{opacity:.5}button[aria-pressed=true]{background:#395347}
header{position:absolute;inset:0 0 auto;padding:max(12px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) 10px max(16px,env(safe-area-inset-left));display:flex;align-items:center;justify-content:space-between;gap:10px;background:linear-gradient(#08121bf0,#08121bb0,transparent)}
h1{font:400 clamp(21px,3vw,34px) Georgia;margin:0}p{margin:3px 0}.ledger{font-size:13px;color:#c2d4cc}main{position:absolute;top:90px;left:16px;max-width:min(450px,67%);text-shadow:0 1px 4px #000;pointer-events:none}.job{font-weight:650}.notice{color:#efc990;font-size:14px}
nav{position:absolute;bottom:max(12px,env(safe-area-inset-bottom));left:max(12px,env(safe-area-inset-left));right:max(12px,env(safe-area-inset-right));display:flex;align-items:end;justify-content:space-between;gap:10px;pointer-events:none}nav>*{pointer-events:auto}.controls{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;max-width:265px}.stick{position:relative;width:90px;height:90px;border-radius:100%;background:#1c3339ac;border:1px solid #94a5a3;touch-action:none;flex:none}.thumb{position:absolute;left:30px;top:30px;border-radius:100%;width:28px;height:28px;background:#b6cabb}
dialog{color:#e6eae4;background:#11212cf5;border:1px solid #698886;border-radius:7px;width:min(420px,90vw);max-height:68dvh;overflow:auto;padding:18px;box-shadow:0 15px 45px #040a10cc}dialog::backdrop{background:#07101a88}dialog h2{font:30px Georgia;margin:0 0 10px}.items{display:grid;gap:7px;margin:12px 0}.items button{text-align:left}.items button span{display:block;color:#a9c2c4;font-weight:400;margin-top:4px;font-size:13px}.radar{position:absolute;right:16px;top:86px;width:100px;height:100px;inset:auto;right:16px;top:86px;background:#0a1821be;border:1px solid #668281;border-radius:50%;pointer-events:none}
@media(max-width:520px){main{max-width:60%;top:max(92px,calc(env(safe-area-inset-top) + 73px))}.radar{width:75px;height:75px;top:max(92px,calc(env(safe-area-inset-top) + 73px))}.controls{max-width:217px}.controls button{font-size:12px;padding:6px 8px}.stick{width:80px;height:80px}.thumb{left:25px;top:25px}}
@media(max-height:470px){main,.radar{top:65px}.radar{width:65px;height:65px}dialog{max-height:82dvh}}
`;
let active=null;
export function openFreeport({worldId=0,shipId=0,onExchange=null,onExit=()=>{}}={}){
  if(active)return active;
  const storageKey='ashen-reach.freeport.v1.'+worldId;
  let record;
  try{record=JSON.parse(localStorage.getItem(storageKey))}catch{}
  const s=createDistrict(worldId,shipId,record),host=document.createElement('div');
  host.setAttribute('role','region');host.setAttribute('aria-label','Orbital freeport');
  document.body.append(host);const root=host.attachShadow({mode:'open'});
  root.innerHTML='<style>'+portStyles+'</style><canvas class="view" aria-label="Orbital flight view"></canvas><header><div><h1></h1><p class="ledger"></p></div><button class="exit">Return to ship</button></header><main><p class="job"></p><p class="notice" role="status"></p></main><canvas class="radar" width="172" height="172" aria-label="Traffic radar"></canvas><nav><div class="stick" aria-label="Thrust joystick"><i class="thumb"></i></div><div class="controls"></div></nav><dialog><h2></h2><p class="details"></p><div class="items"></div><button class="close">Return to flight</button></dialog>';
  const $=q=>root.querySelector(q),view=makePortView($('.view'),s),modal=$('dialog'),controls=$('.controls'),keys=new Set(),abort=new AbortController();
  const opts={signal:abort.signal},notice=$('.notice'),stick=$('.stick'),thumb=$('.thumb');
  let ax=0,az=0,touch=null,raf=0,last=0,debt=0,stamp=0,revision=s.revision,closed=false,heldBrake=false;
  let saving=true;
  function save(){try{localStorage.setItem(storageKey,JSON.stringify(serializeDistrict(s)))}catch{saving=false}}
  function resetInput(){keys.clear();ax=az=0;touch=null;heldBrake=false;thumb.style.transform=''}
  function message(value){notice.textContent=value;stamp=s.clock}
  function act(fn){message(fn());save();hud()}
  function exit(next){if(closed)return;closed=true;save();cancelAnimationFrame(raf);abort.abort();obs.disconnect();view.dispose();modal.close();host.remove();active=null;if(next===onExchange&&onExchange)onExchange();else onExit()}
  $('.exit').onclick=exit;$('.close').onclick=()=>modal.close();
  $('h1').textContent=world(worldId,cycle()).name+' Freeport';
  const obs=new ResizeObserver(()=>view.resize(host.clientWidth,host.clientHeight));obs.observe(host);view.resize(host.clientWidth,host.clientHeight);
  function add(parent,label,action,subtitle){const b=document.createElement('button');b.textContent=label;b.type='button';if(subtitle){const d=document.createElement('span');d.textContent=subtitle;b.append(d)}b.onclick=action;parent.append(b);return b}
  function sheet(title,subtitle){resetInput();modal.querySelector('h2').textContent=title;$('.details').textContent=subtitle;
    $('.items').replaceChildren();modal.showModal();return $('.items')}
  function contracts(){const p=s.ports[s.dock],near=distance(s.player,p)<DOCK_RADIUS&&speed(s.player)<DOCK_SPEED;
    const list=sheet('Dispatch board',s.job?'One active manifest. Deliver the hold to receive payment.':near?p.name+' dispatch': 'Dock at a station to accept freight or fit thrusters.');
    if(near&&onExchange)add(list,'Mineral exchange',()=>exit(onExchange),'Sell extracted resources or install a cargo rack.');
    if(near&&!s.job){for(const offer of contractOffers(s))add(list,(offer.kind==='medical'?'Medical supplies':'Sealed salvage')+' · '+offer.reward+' cr',()=>{
      modal.close();act(()=>acceptContract(s,offer.kind))},p.name+' → '+s.ports[offer.dest].name+(offer.kind==='sealed'?' · customs may impound this hold':' · licensed freight'))}
    if(near&&s.tuning<3)add(list,'Install thruster stage '+(s.tuning+1)+' · '+100*(s.tuning+1)+' cr',()=>{modal.close();act(()=>refit(s))},'Raises thrust and cruise limit in this district.');
    if(s.job)add(list,'Plot active manifest',()=>{modal.close();s.course=destination(s).id;message('Flight computer steering to '+destination(s).name+'.')});
  }
  function course(){const list=sheet('Navigation','Set a flight-computer course. Manual thrust takes control.');
    for(const p of s.ports)add(list,p.name+' · '+Math.round(distance(s.player,p))+' m',()=>{
      s.course=p.id;modal.close();message('Steering to '+p.name+'.')},p.role+(s.job&&destination(s).id===p.id?' · manifest waypoint':''));
  }
  const brake=add(controls,'Brake',()=>{});
  brake.onpointerdown=e=>{brake.setPointerCapture(e.pointerId);heldBrake=true};brake.onlostpointercapture=()=>heldBrake=false;
  const dock=()=>act(()=>dockShip(s));add(controls,'Dock',dock);add(controls,'Veil',()=>act(()=>phaseVeil(s)));add(controls,'Course',course);add(controls,'Dispatch',contracts);
  const steer=e=>{const r=stick.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,z=e.clientY-r.top-r.height/2,mag=Math.max(27,Math.hypot(x,z));ax=x/mag;az=z/mag;thumb.style.transform='translate('+ax*24+'px,'+az*24+'px)'};
  stick.onpointerdown=e=>{if(touch!==null)return;touch=e.pointerId;stick.setPointerCapture(touch);steer(e)};
  stick.onpointermove=e=>{if(e.pointerId===touch)steer(e)};stick.onlostpointercapture=()=>{touch=null;ax=az=0;thumb.style.transform=''};
  function keyboard(e,down){const k=e.key.toLowerCase();
    if(modal.open){if(k==='escape')e.stopImmediatePropagation();return}
    if(!['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','e','f','c','b','escape'].includes(k))return;
    e.stopImmediatePropagation();e.preventDefault();
    if(!down){keys.delete(k);return}keys.add(k);
    if(e.repeat)return;if(k==='f')dock();if(k==='e')act(()=>phaseVeil(s));if(k==='b')contracts();if(k==='c')course();if(k==='escape')exit();
  }
  window.addEventListener('keydown',e=>keyboard(e,true),{...opts,capture:true});window.addEventListener('keyup',e=>keyboard(e,false),{...opts,capture:true});
  window.addEventListener('blur',()=>{resetInput();save() },opts);document.addEventListener('visibilitychange',()=>{resetInput();save();last=0;debt=0},opts);
  const radar=$('.radar').getContext('2d');
  function hud(){const inspection=s.agents[s.agents.length-1].scan,heat=s.heat>0?' · CUSTOMS '+(inspection?'scan '+Math.floor(inspection/3.2*100)+'%':'alert'):'';
    const text=ships[s.shipId].name+' · '+Math.round(speed(s.player))+' m/s · '+s.credits+' cr'+heat+(saving?'':' · session save only');
    if($('.ledger').textContent!==text)$('.ledger').textContent=text;
    const target=destination(s),order=s.job?(s.job.stage==='pickup'?'Load at ':'Deliver to ')+target.name+' · '+Math.round(distance(s.player,target))+' m':s.course!==null?'Course · '+s.ports[s.course].name:'Open Dispatch to take a contract.';
    if($('.job').textContent!==order)$('.job').textContent=order;
    const mark=(x,z,r,color)=>{radar.fillStyle=color;radar.beginPath();radar.arc(86+x*.49,86+z*.49,r,0,Math.PI*2);radar.fill()};
    radar.clearRect(0,0,172,172);radar.strokeStyle='#40555c';radar.beginPath();radar.moveTo(86,12);radar.lineTo(86,160);radar.moveTo(12,86);radar.lineTo(160,86);radar.stroke();
    for(const p of s.ports)mark(p.x,p.z,4,p.color);for(const a of s.agents)mark(a.x,a.z,2.5,a.kind==='customs'?'#fd947a':'#a0c9c8');mark(bound(s.player.x,-145,145),bound(s.player.z,-145,145),4.5,'#fff8cc');
  }
  function frame(now){if(closed)return;const delta=last?Math.min((now-last)/1000,.15):0;last=now;
    if(!modal.open&&!document.hidden){debt+=delta;while(debt>=STEP){tickDistrict(s,{x:ax+Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),
      z:az+Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup')),brake:heldBrake||keys.has(' ')},STEP);debt-=STEP}}
    if(revision!==s.revision){revision=s.revision;message(s.event);save()}
    if(s.clock-stamp>6)notice.textContent=s.veil>0?'Spirit veil · '+Math.ceil(s.veil)+' s':s.course!==null?'Course engaged · manual thrust overrides':'WASD / joystick · Space to brake';
    hud();view.draw();raf=requestAnimationFrame(frame)
  }
  message('At '+s.ports[s.dock].name+'. Dispatch offers medical freight and sealed salvage.');active={close:exit};raf=requestAnimationFrame(frame);return active
}

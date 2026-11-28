import {Vector3} from './three.module.js';
const V=(x=0,y=0,z=0)=>new Vector3(x,y,z);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const ports=new Map(),meshes=new WeakMap();
export function harborFor(body,relief){
 if(body?.id!==1)return null;
 if(ports.has(body))return ports.get(body);
 // Select a high, relatively flat site on the hemisphere facing the initial orbit.
 let best=null;
 for(let i=0;i<128;i++){
  const a=i*2.39996323,z=.65+.34*(i+.5)/128,r=Math.sqrt(1-z*z);
  const n=V(r*Math.cos(a),r*Math.sin(a),z),h=relief(body,n);
  const east=V().crossVectors(V(0,1,0),n).normalize(),north=V().crossVectors(n,east).normalize();
  const samples=[east,north,east.clone().negate(),north.clone().negate()].map(d=>relief(body,n.clone().addScaledVector(d,160/body.r).normalize()));
  const score=h-8*Math.max(...samples.map(q=>Math.abs(q-h)));
  if(!best||score>best.score)best={n,h,east,north,score,deck:Math.max(h,...samples)+12};
 }
 const p={id:'N-04',body:1,name:'Hearth Exchange',up:best.n,right:best.east,forward:best.north,position:body.center.clone().addScaledVector(best.n,body.r+best.deck),radius:34};
 ports.set(body,p);return p;
}
export function harborStatus(p,s){
 if(!p||s?.body?.id!==p.body)return null;
 const delta=s.p.clone().sub(p.position),height=delta.dot(p.up);
 const range=Math.hypot(delta.dot(p.right),delta.dot(p.forward));
 const speed=s.v.length();
 return {range,height,speed,ready:range<=p.radius&&height>=0&&height<=6&&speed<=3};
}
export function requestApproach(s,p){
 if(!p||s.body.id!==p.body)return false;
 s.harborApproach=true;s.aim=false;s.cruise=true;return true;
}
// Bounded assisted flight: move through the existing physical pose, never jump to a berth.
// High-altitude route climbs above terrain before traversing the spherical surface.
export function advanceApproach(s,p,dt,relief){
 if(!s.harborApproach||!p||s.body.id!==p.body)return false;
 dt=clamp(dt,0,.05);
 const b=s.body,n=s.p.clone().sub(b.center).normalize(),radial=s.p.distanceTo(b.center)-b.r;
 const angle=n.angleTo(p.up),surfaceDistance=angle*b.r;
 const deck=p.position.distanceTo(b.center)-b.r;
 const high=Math.max(deck+4000,7000);
 let target;
 if(radial>Math.max(20_000,high*2.5)){
  // Bleed orbital altitude radially before any long traverse; near terrain use the existing slow profile.
  target=b.center.clone().addScaledVector(n,b.r+high);
 }else if(surfaceDistance>110){
  if(radial<high-100)target=b.center.clone().addScaledVector(n,b.r+high);
  else{
   let tangent=p.up.clone().addScaledVector(n,-p.up.dot(n));
   if(tangent.lengthSq()<1e-12)tangent=p.right.clone();
   target=s.p.clone().addScaledVector(tangent.normalize(),Math.min(surfaceDistance,30000));
   target.addScaledVector(n,clamp(high-radial,-3000,3000));
  }
 }else target=p.position.clone().addScaledVector(p.up,3);
 const d=target.clone().sub(s.p),distance=d.length();
 const limit=radial>Math.max(20_000,high*2.5)?Math.min(2e7,Math.max(1000,(radial-high)*.62)):surfaceDistance>110?Math.min(60000,Math.max(25,radial*.65)):Math.min(1000,Math.max(1,distance*.55));
 const desired=d.clone().normalize().multiplyScalar(Math.min(limit,distance*1.4));
 s.v.lerp(desired,1-Math.exp(-4*dt));s.p.addScaledVector(s.v,dt);
 const local=s.p.clone().sub(b.center).normalize(),floor=b.r+relief(b,local)+3;
 if(s.p.distanceTo(b.center)<floor){s.p.copy(b.center).addScaledVector(local,floor);s.v.addScaledVector(local,-Math.min(0,s.v.dot(local)))}
 s.alt=s.p.distanceTo(b.center)-b.r-relief(b,local);
 const look=p.position.clone().sub(s.p);
 if(look.lengthSq()>1){
  // Keep the horizon visible on final descent; the marker is below the nose.
  if(surfaceDistance<500)look.addScaledVector(p.forward,Math.max(10,look.length()*.45));
  s.forward.lerp(look.normalize(),1-Math.exp(-3*dt)).normalize();
  const right=s.forward.clone().cross(local);if(right.lengthSq()>1e-8)s.right.copy(right.normalize());
 }
 const state=harborStatus(p,s);
 if(state?.ready){s.harborApproach=false;s.v.set(0,0,0);return true}
 return false;
}
export function dockHarbor(s,p,ledger,hull){
 if(!harborStatus(p,s)?.ready)return false;
 s.harborApproach=false;s.v.set(0,0,0);
 ledger.harbor={body:1,pad:p.id,hull,position:s.p.toArray(),forward:s.forward.toArray(),right:s.right.toArray()};
 return true;
}
export function restoreHarbor(s,p,record,hull){
 if(!p||record?.body!==1||record.pad!==p.id||record.hull!==hull)return false;
 for(const key of ['position','forward','right'])if(!Array.isArray(record[key])||record[key].length!==3||!record[key].every(Number.isFinite))return false;
 const pose={...s,p:V().fromArray(record.position),v:V()};
 if(!harborStatus(p,pose)?.ready)return false;
 const f=V().fromArray(record.forward),r=V().fromArray(record.right);
 if(f.lengthSq()<.5||r.lengthSq()<.5||Math.abs(f.clone().normalize().dot(r.clone().normalize()))>.15)return false;
 s.p.copy(pose.p);s.v.set(0,0,0);s.forward.copy(f.normalize());s.right.copy(r.normalize());s.alt=s.p.distanceTo(s.body.center)-s.body.r;return true;
}
export function harborMesh(p){
 if(meshes.has(p))return meshes.get(p);
 const faces=[],point=(x,y,z)=>p.position.clone().addScaledVector(p.right,x).addScaledVector(p.up,y).addScaledVector(p.forward,z);
 const quad=(a,b,c,d,color)=>{for(const t of [[a,b,c],[a,c,d]])faces.push(t.map(q=>({p:q,c:color})))};
 const box=(x,y,z,w,h,d,col)=>{
  const a=[];for(let j=0;j<2;j++)for(let k=0;k<2;k++)for(let i=0;i<2;i++)a.push(point(x+(i-.5)*w,y+j*h,z+(k-.5)*d));
  [[0,1,5,4],[1,3,7,5],[3,2,6,7],[2,0,4,6],[4,5,7,6],[0,2,3,1]].forEach((q,i)=>quad(...q.map(k=>a[k]),col.map(v=>Math.round(v*[.69,.83,.58,.76,1,.43][i]))));
 };
 const ivory=[211,205,188],basalt=[70,79,85],amber=[255,182,69],blue=[115,223,247];
 box(0,-18,0,150,18,180,basalt);box(0,-.1,0,78,.1,78,[101,112,119]);
 for(let i=0;i<48;i++){const a=i*Math.PI/24,b=a+Math.PI/24;
  quad(point(32*Math.cos(a),.08,32*Math.sin(a)),point(34*Math.cos(a),.08,34*Math.sin(a)),point(34*Math.cos(b),.08,34*Math.sin(b)),point(32*Math.cos(b),.08,32*Math.sin(b)),amber)}
 for(const side of [-1,1]){
  for(let j=0;j<3;j++){box(side*(57+j*9),0,40+j*12,15,62-j*12,18,ivory);box(side*(57+j*9),20,30+j*12,1.5,18,1.5,amber)}
  box(side*57,0,-30,20,8,55,basalt);
  for(let i=0;i<9;i++){box(side*40,0,-80+i*9,.65,.35,1.5,blue);box(side*57,8,-52+i*5,12,.35,.6,ivory)}
  box(side*64,8,-30,2,30,2,amber);box(side*52,36,-30,26,2,2,amber);
 }
 // Segmental gateway arch and inset illuminated facade.
 for(let i=0;i<16;i++){const a=i*Math.PI/16,b=(i+1)*Math.PI/16;
  for(const z of [55,67])quad(point(57*Math.cos(a),8+57*Math.sin(a),z),point(66*Math.cos(a),8+66*Math.sin(a),z),point(66*Math.cos(b),8+66*Math.sin(b),z),point(57*Math.cos(b),8+57*Math.sin(b),z),ivory);
  quad(point(57*Math.cos(a),8+57*Math.sin(a),55),point(57*Math.cos(b),8+57*Math.sin(b),55),point(57*Math.cos(b),8+57*Math.sin(b),67),point(57*Math.cos(a),8+57*Math.sin(a),67),amber)}
 for(let i=0;i<12;i++)box(-44+i*8,0,78,6,7,9,i%3?basalt:ivory);
 meshes.set(p,faces);return faces;
}

// Metres in a double-precision reference frame. Project only camera-relative differences.
import {stationMesh,stationDistance} from './field-station.mjs';
import {Vector3} from './three.module.js';
import {ImprovedNoise} from './ImprovedNoise.mjs';
import {surveyProfile} from './survey.mjs';
import {world,cycle} from './universe.mjs';
const noise=new ImprovedNoise(),V=(x=0,y=0,z=0)=>new Vector3(x,y,z);
export function bodies(id){
 const first=id-id%4;
 return Array.from({length:4},(_,k)=>({id:first+k,name:world(first+k,cycle()).name,r:surveyProfile(first+k).radius,
 center:V([0,1.4e8,3.3e8,-1.2e8][k],[0,1e7,-4e7,6e7][k],[0,-1e8,-2e8,-2.7e8][k])}))
}
export function relief(body,n){
 const id=body.id, f=id%4;if(f===2)return 0;
 const h=(freq)=>noise.noise(n.x*freq+id*.71,n.y*freq+3,n.z*freq);
 const raw=2700*h(3)+890*h(17)+210*h(81)+43*h(390)+11*h(2000)+2*h(9700)+.36*h(46000);
 return f===0?raw:Math.max(0,raw)
}
export function newJourney(id){
 const system=bodies(id),home=system[id%4];
 return {system,body:home,p:home.center.clone().add(V(0,0,home.r*2.9)),v:V(),forward:V(0,0,-1),right:V(1,0,0),target:home,cruise:true,aim:true,alt:home.r*1.9}
}
function nearest(s){let best=Infinity;for(const b of s.system){const d=s.p.distanceTo(b.center)-b.r;if(d<best){best=d;s.body=b}}}
export function travel(s,dt,input={}){
 nearest(s);const b=s.body,normal=s.p.clone().sub(b.center).normalize();let altitude=s.p.distanceTo(b.center)-b.r-relief(b,normal);
 const near=altitude<10000,up=near?normal:s.right.clone().cross(s.forward).normalize();
 if(near){s.forward.addScaledVector(normal,-s.forward.dot(normal));if(s.forward.lengthSq()<1e-7)s.forward.copy(normal).cross(Math.abs(normal.y)<.9?V(0,1,0):V(1,0,0));s.forward.normalize()}
 if(s.aim&&!near){
  const bearing=s.target.center.clone().sub(s.p).normalize();
  if(s.target!==b&&bearing.dot(normal)<0&&altitude<b.r){
   bearing.addScaledVector(normal,-bearing.dot(normal));
   if(bearing.lengthSq()<1e-8)bearing.copy(s.right);
   bearing.normalize().addScaledVector(normal,.22).normalize()
  }
  s.forward.lerp(bearing,1-Math.exp(-5*dt)).normalize()
 }
 s.forward.applyAxisAngle(up,-(input.turn||0)*dt*1.3);const r=s.forward.clone().cross(up);if(r.lengthSq()>1e-8)s.right.copy(r.normalize());
 if(!near)s.forward.applyAxisAngle(s.right,(input.pitch||0)*dt);
 const speed=s.cruise?Math.min(2e7,Math.max(16,Math.max(0,altitude)*.65)):120;
 const drive=input.drive||0,vertical=input.lift||(near&&s.aim?(s.target===b?-1:1)*Math.max(0,drive):0);
 const wanted=s.forward.clone().multiplyScalar(drive*speed).addScaledVector(near?normal:up,vertical*speed);
 // Flight assist applies a finite velocity response; cruise rate compresses travel time.
 if(s.cruise)s.v.lerp(wanted,1-Math.exp(-4*dt));
 else {
  for(const body of s.system){
   const to=body.center.clone().sub(s.p),distance=Math.max(body.r,to.length());
   s.v.addScaledVector(to.normalize(),surveyProfile(body.id).gravity*(body.r/distance)**2*dt)
  }
  s.v.addScaledVector(s.forward,drive*28*dt).addScaledVector(near?normal:up,vertical*28*dt)
 }
 s.p.addScaledVector(s.v,dt);
 nearest(s);const n=s.p.clone().sub(s.body.center).normalize(),floor=s.body.r+relief(s.body,n)+3;
 s.alt=s.p.distanceTo(s.body.center)-floor+3;
 if(s.alt<3){s.p.copy(s.body.center).addScaledVector(n,floor);s.v.addScaledVector(n,-Math.min(0,s.v.dot(n)));s.alt=3}
}
const faces=[(u,v)=>V(1,v,-u),(u,v)=>V(-1,v,u),(u,v)=>V(u,1,-v),(u,v)=>V(u,-1,v),(u,v)=>V(u,v,1),(u,v)=>V(-u,v,-1)];
const cache=new Map();
const stars=Array.from({length:1100},(_,i)=>{
 const y=1-2*(i+.5)/1100,r=Math.sqrt(1-y*y),angle=i*2.3999632297;
 return V(r*Math.cos(angle),y,r*Math.sin(angle))
});

function tile(b,f,u,v,w){
 const key=[b.id,f,u,v,w].join(':');if(cache.has(key))return cache.get(key);
 const a=[];for(let j=0;j<=4;j++)for(let i=0;i<=4;i++){const n=faces[f](u+w*i/4,v+w*j/4).normalize(),h=relief(b,n);
 const band=noise.noise(n.x*12+b.id,n.y*12,n.z*12);let color=b.id%4===2?[163+31*Math.sin(n.y*36+band*3),127+25*band,141+18*band]:h===0?[34,91,105]:b.id%4===0?[170+h*.018,115+h*.016,79+h*.014]:[98+h*.04,123+h*.017,82+h*.027];
 const sun=V(-.55,.44,.69).normalize(),tangent=sun.clone().addScaledVector(n,-sun.dot(n));
 const step=Math.max(8,b.r*w/8),sample=n.clone().addScaledVector(tangent,step/b.r).normalize();
 const slope=(relief(b,sample)-h)/step;
 const grain=noise.noise(n.x*59000,n.y*59000,n.z*59000);
 const light=.35+.74*Math.max(0,Math.min(1,n.dot(sun)-slope))+(w<.004?.07*grain:0);a.push({p:n.multiplyScalar(b.r+h).add(b.center),c:color.map(k=>Math.min(255,Math.max(0,k*light+band*15))|0)})}
 if(cache.size>5200)cache.clear();cache.set(key,a);return a
}
let canvas,ctx,last=0,gl,buffer;
function initRenderer(){
 canvas=document.createElement('canvas');canvas.className='navigation-display';document.body.prepend(canvas);
 gl=canvas.getContext('webgl',{antialias:true,alpha:false});
 if(!gl){ctx=canvas.getContext('2d');return}
 const program=gl.createProgram();
 for(const [kind,source] of [[gl.VERTEX_SHADER,'attribute vec3 vertex;attribute vec3 tint;varying vec3 color;void main(){gl_Position=vec4(vertex.xy,0.,vertex.z);gl_PointSize=1.5;color=tint;}'],[gl.FRAGMENT_SHADER,'precision mediump float;varying vec3 color;void main(){gl_FragColor=vec4(color,1.);}']]){
  const shader=gl.createShader(kind);gl.shaderSource(shader,source);gl.compileShader(shader);gl.attachShader(program,shader)
 }
 gl.linkProgram(program);gl.useProgram(program);buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
 for(const [name,offset] of [['vertex',0],['tint',12]]){
  const index=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(index);gl.vertexAttribPointer(index,3,gl.FLOAT,false,24,offset)
 }
}

export function drawJourney(s,now,station=null){
 if(!canvas&&!s)return;if(!canvas)initRenderer()
 canvas.hidden=!s;if(!s||now-last<40)return;last=now;
 const w=innerWidth,h=innerHeight;if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
 const sky=Math.max(0,1-s.alt/85000);const background=[5+sky*59,10+sky*84,24+sky*91];
 if(gl){gl.viewport(0,0,w,h);gl.clearColor(...background.map(x=>x/255),1);gl.clear(gl.COLOR_BUFFER_BIT)}
 else{ctx.fillStyle='rgb('+background.map(Math.floor)+')';ctx.fillRect(0,0,w,h)}
 if(!gl&&sky<.85){ctx.fillStyle='#b0b9c4';for(let i=0;i<115;i++)ctx.fillRect((i*7919)%w,(i*3571)%h,1.2,1.2)}
 const up=s.right.clone().cross(s.forward).normalize(),focal=h*.83,tri=[];
 if(gl&&sky<.88){
 const dots=[];
 for(const star of stars){
  const z=star.dot(s.forward);if(z<=0)continue;
  dots.push(star.dot(s.right)*2*focal/w,star.dot(up)*2*focal/h,z,.62*(1-sky),.71*(1-sky),.81*(1-sky))
 }
 gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(dots),gl.DYNAMIC_DRAW);gl.drawArrays(gl.POINTS,0,dots.length/6)
 }
 function visit(b,f,u,v,size,lvl){
 const n=faces[f](u+size/2,v+size/2).normalize(),cam=s.p.clone().sub(b.center),mid=n.clone().multiplyScalar(b.r+(lvl>7?relief(b,n):0)).sub(cam),dist=mid.length(),span=size*b.r;
 if(cam.length()>b.r&&n.dot(cam.clone().normalize())+size*1.5<b.r/cam.length()-.002)return;
 const z=mid.dot(s.forward);if(z+span*1.6<0||Math.abs(mid.dot(s.right))>Math.max(0,z)*w/(2*focal)+span*1.6||Math.abs(mid.dot(up))>Math.max(0,z)*h/(2*focal)+span*1.6)return;
 if(lvl<23&&span>Math.max(2,dist*.48)){const d=size/2;for(let j=0;j<2;j++)for(let i=0;i<2;i++)visit(b,f,u+i*d,v+j*d,d,lvl+1);return}
 const points=tile(b,f,u,v,size).map(q=>{const p=q.p.clone().sub(s.p),z=p.dot(s.forward);return {x:w/2+p.dot(s.right)*focal/z,y:h/2-p.dot(up)*focal/z,z,c:q.c}});
 for(let j=0;j<4;j++)for(let i=0;i<4;i++){const k=j*5+i;for(const ids of [[k,k+1,k+6],[k,k+6,k+5]]){const [a,b,c]=ids.map(i=>points[i]);if(Math.min(a.z,b.z,c.z)<.15)continue;tri.push([a,b,c,a.z+b.z+c.z])}}
 }
 for(const b of s.system)for(let f=0;f<6;f++)visit(b,f,-1,-1,2,0);
 if(stationDistance(station,s)<16000){
  for(const face of stationMesh(station,s.body)){
   const vertices=face.map(q=>{const p=q.p.clone().sub(s.p),z=p.dot(s.forward);
    return {x:w/2+p.dot(s.right)*focal/z,y:h/2-p.dot(up)*focal/z,z,c:q.c}});
   if(vertices.every(q=>q.z>.15))tri.push([...vertices,vertices.reduce((sum,q)=>sum+q.z,0)])
  }
 }
 tri.sort((a,b)=>b[3]-a[3]);if(gl){
  const data=new Float32Array(tri.length*18);let k=0;
  for(const [a,b,c] of tri)for(const p of [a,b,c]){
   data[k++]=(2*p.x/w-1)*p.z;data[k++]=(1-2*p.y/h)*p.z;data[k++]=p.z;
   for(const channel of p.c)data[k++]=channel/255
  }
  gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,tri.length*3);return
 }
 for(const [a,b,c] of tri){ctx.fillStyle='rgb('+a.c.join(',')+')';ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.closePath();ctx.fill();ctx.stroke()}
 ctx.strokeStyle='#d4e6da';ctx.strokeRect(w/2-4,h/2-4,8,8)
}

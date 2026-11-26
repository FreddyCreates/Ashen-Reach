import * as T from './three.module.js';
import {surveyHeight,surveyProfile,terrainContact} from './survey.mjs';

const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const lerp=(a,b,f)=>a+(b-a)*f;
const palettes=new Map();
function palette(id){
 const family=id%4;if(!palettes.has(family)){
 const p=surveyProfile(id),rgb=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16));
 palettes.set(family,Object.fromEntries(['dark','light','rock','water','haze','zenith'].map(n=>[n,rgb(p[n])])))}
 return palettes.get(family)
}
function random(x,z,id){
 let u=Math.imul(x+241,92837111)^Math.imul(z+181,689287499)^Math.imul(id+31,283923481);
 u=Math.imul(u^(u>>>17),2246822519);return ((u^(u>>>13))>>>0)/4294967296
}
function groundColor(id,x,z,h,slope,near){
 const p=surveyProfile(id),pal=palette(id);
 const water=p.sea&&h<1;
 const band=.5+.5*Math.sin(h*(p.gas?.041:.18)+x*.00075);
 const factor=water?.36:p.gas?clamp(.13+.56*band+.20*Math.sin(z*.0025),0,1):
 clamp(.16+(p.sea?Math.max(0,1-Math.abs(h-4)/13)*.64:.29*band)+Math.min(.29,slope*.23)+(near?.11*random(Math.floor(x/6),Math.floor(z/6),id):0),0,1);
 const base=water?pal.water:pal.rock, light=water?pal.dark:pal.light;
 return base.map((c,i)=>lerp(c,light[i],factor))
}
// Nested detail levels share one snapped origin and use coarse edge interpolation
// where a finer boundary meets its neighbour. Geometry changes only on grid crossings.
const levels=[{step:12,extent:192,cut:0},{step:48,extent:768,cut:192},{step:192,extent:3072,cut:768}];
function buildLandscape(s,cx,cz){
 const vals=[],cols=[],indices=[],colors=[],profile=surveyProfile(s.id);
 const sum=(x,z)=>surveyHeight(s.id,cx+x,cz+z);
 for(let level=0;level<levels.length;level++){
 const {step,extent,cut}=levels[level],base=vals.length/3,n=2*extent/step+1,ys=[];
 for(let row=0;row<n;row++)for(let col=0;col<n;col++){
  const x=col*step-extent,z=row*step-extent;let height=sum(x,z);
  const isVerticalEdge=Math.abs(x)===extent,isHorizontalEdge=Math.abs(z)===extent;
  if(level<levels.length-1&&(isVerticalEdge||isHorizontalEdge)){
   const along=isVerticalEdge?z:x,coarse=levels[level+1].step,first=Math.floor(along/coarse)*coarse,t=(along-first)/coarse;
   if(t>0)height=isVerticalEdge?lerp(sum(x,first),sum(x,first+coarse),t):lerp(sum(first,z),sum(first+coarse,z),t)
  }
  ys.push(height);
  const y=profile.sea?Math.max(.1,height):height;vals.push(x+cx,y,z+cz)
 }
 for(let row=0;row<n;row++)for(let col=0;col<n;col++){
  const k=row*n+col, h=ys[k], gx=(ys[row*n+Math.min(n-1,col+1)]-ys[row*n+Math.max(0,col-1)])/(2*step),gz=(ys[Math.min(n-1,row+1)*n+col]-ys[Math.max(0,row-1)*n+col])/(2*step);
  const shade=profile.sea&&h<0?1:clamp(.86+(-gx*.63+gz*.41)/Math.sqrt(1+gx*gx+gz*gz),.46,1.25);
  const color=groundColor(s.id,cx+col*step-extent,cz+row*step-extent,h,Math.hypot(gx,gz),!level).map(c=>clamp(Math.round(c*shade),0,255));colors.push(color);
  const rgb=new T.Color().setRGB(color[0]/255,color[1]/255,color[2]/255,T.SRGBColorSpace);cols.push(rgb.r,rgb.g,rgb.b);
  if(row===n-1||col===n-1)continue;
  const x=(col+.5)*step-extent,z=(row+.5)*step-extent;
  if(Math.abs(x)<cut&&Math.abs(z)<cut)continue;
  const a=base+k,b=a+1,d=a+n,c=d+1;indices.push(a,d,b,b,d,c)
 }
 }
 const geom=new T.BufferGeometry();geom.setAttribute('position',new T.Float32BufferAttribute(vals,3));geom.setAttribute('color',new T.Float32BufferAttribute(cols,3));geom.setIndex(indices);
 const debris=[];
 if(!profile.gas){
 for(let z=cz-240;z<=cz+240;z+=12)for(let x=cx-240;x<=cx+240;x+=12){
  const r=random(x,z,s.id);if(r<.65)continue;
  const xx=x+(r-.5)*10,zz=z+(random(z,x,s.id+1)-.5)*10,y=surveyHeight(s.id,xx,zz);
  if(profile.sea&&y<1.3)continue;
  const size=.45+Math.pow(random(x,z,s.id+2),4)*5.9;
  debris.push({x:xx,y:y+.12*size,z:zz,size,angle:r*6.28})
 }}
 return {geom,colors,debris}
}
// When the ship is low, replace complete cells of the 12 m grid with a
// 1.5 m patch. Sample both sides of the seam from the coarse grid.
const patchRadius=36;
let patch=null;
function nearField(s){
 if(s.clearance>38||surveyProfile(s.id).gas)return null;
 const cx=Math.round(s.x/12)*12,cz=Math.round(s.z/12)*12;
 if(patch?.cx===cx&&patch?.cz===cz&&patch?.id===s.id)return patch;
 const p=surveyProfile(s.id),n=49,v=[],c=[],rgb=[],idx=[];
 const grade=(x,z)=>surveyHeight(s.id,x,z);
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){
  const x=cx-patchRadius+1.5*i,z=cz-patchRadius+1.5*j;
  let y=grade(x,z);
  const side=i===0||i===n-1;
  if(side||j===0||j===n-1){
   const along=side?z:x,base=Math.floor(along/12)*12,t=(along-base)/12;
   if(t>0)y=side?lerp(grade(x,base),grade(x,base+12),t):lerp(grade(base,z),grade(base+12,z),t)
  }
  const gx=(grade(x+1,z)-grade(x-1,z))*.5,gz=(grade(x,z+1)-grade(x,z-1))*.5;
  const shade=p.sea&&y<=0?1:clamp(.86+(-gx*.63+gz*.41)/Math.sqrt(1+gx*gx+gz*gz),.46,1.25);
  const color=groundColor(s.id,x,z,y,Math.hypot(gx,gz),true).map(a=>clamp(a*shade,0,255));
  v.push(x,p.sea?Math.max(.1,y):y,z);rgb.push(color);
  const m=new T.Color().setRGB(color[0]/255,color[1]/255,color[2]/255,T.SRGBColorSpace);c.push(m.r,m.g,m.b);
  if(i+1<n&&j+1<n){const k=j*n+i;idx.push(k,k+n,k+1,k+1,k+n,k+n+1)}
 }
 const geom=new T.BufferGeometry();geom.setAttribute('position',new T.Float32BufferAttribute(v,3));geom.setAttribute('color',new T.Float32BufferAttribute(c,3));geom.setIndex(idx);
 patch?.geom.dispose();patch={id:s.id,cx,cz,geom,colors:rgb};return patch
}
let active=null;
function landscape(s){
 const cx=Math.round(s.x/192)*192,cz=Math.round(s.z/192)*192;
 if(!active||active.id!==s.id||active.cx!==cx||active.cz!==cz){
  const previous=active;active={id:s.id,cx,cz,...buildLandscape(s,cx,cz)};previous?.geom.dispose()
 }
 return active
}
const scene=new T.Scene(),camera=new T.PerspectiveCamera(64,1,1.3,6500);
const mask={value:new T.Vector4(0,0,0,0)};
const shaderClock={value:0},biome={value:0};
function surfaceMaterial(withCut){
 const mat=new T.MeshBasicMaterial({vertexColors:true});
 mat.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,{cut:mask,uSurveyTime:shaderClock,uBiome:biome});
  shader.vertexShader='varying vec3 surfacePosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nsurfacePosition=position;');
  shader.fragmentShader='varying vec3 surfacePosition; uniform vec4 cut; uniform float uSurveyTime; uniform float uBiome;\n'+shader.fragmentShader;
  const cutCode=withCut?'if(cut.w>0.5 && max(abs(surfacePosition.x-cut.x),abs(surfacePosition.z-cut.y))<cut.z)discard;':'';
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    ${cutCode}
    vec2 g=surfacePosition.xz;
    float d=length(fwidth(g));float detail=1.-smoothstep(.7,4.,d);
    float grain=fract(sin(dot(floor(g*2.),vec2(12.9898,78.233)))*43758.5453);
    float bed=sin(surfacePosition.y*2.2 + g.x*.035 + sin(g.y*.15));
    bool wet=(uBiome==1. || uBiome==3.) && surfacePosition.y<.11;
    float ripple=sin(g.x*.22+sin(g.y*.12+uSurveyTime)+uSurveyTime*1.3);
    diffuseColor.rgb *= wet?1.+.085*ripple*detail:1.+detail*(.10*(grain-.5)+.052*bed);`);
 };
 mat.customProgramCacheKey=()=>withCut?'terrain-base':'terrain-near';
 return mat
}
const floor=new T.Mesh(new T.BufferGeometry(),surfaceMaterial(true)),micro=new T.Mesh(new T.BufferGeometry(),surfaceMaterial(false));scene.add(floor,micro);
const rockGeo=new T.IcosahedronGeometry(1,0),rocks=new T.InstancedMesh(rockGeo,new T.MeshStandardMaterial({color:0x85766b,flatShading:true,roughness:.95}),1700);
scene.add(rocks,new T.HemisphereLight(0xfff0db,0x5a6265,1.45));const sun=new T.DirectionalLight(0xffdfbb,2.8);sun.position.set(-1,1,-.5);scene.add(sun);
const sky=new T.Mesh(new T.SphereGeometry(4800,24,16),new T.ShaderMaterial({
 side:T.BackSide,depthWrite:false,uniforms:{zen:{value:new T.Color()},haze:{value:new T.Color()}},
 vertexShader:'varying vec3 ray;void main(){ray=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:'varying vec3 ray;uniform vec3 zen;uniform vec3 haze;void main(){vec3 v=normalize(ray);float h=clamp(v.y,0.,1.);vec3 c=mix(haze,zen,smoothstep(-.06,.68,h));float s=clamp(dot(v,normalize(vec3(-.55,.30,-.81))),0.,1.);c+=vec3(1.,.77,.45)*(.25*pow(s,22.)+.7*pow(s,240.)+1.1*smoothstep(.9992,.9997,s));gl_FragColor=vec4(c,1.);\n#include <colorspace_fragment>\n}'}));
sky.renderOrder=-10;scene.add(sky);
const beacon=new T.Group();const ring=new T.Mesh(new T.TorusGeometry(10,.45,6,48),new T.MeshBasicMaterial({color:0x8ff7d9}));
beacon.add(ring);const stalk=new T.Mesh(new T.CylinderGeometry(.24,.4,23,6),new T.MeshBasicMaterial({color:0xc2e4dd}));stalk.position.y=-21;beacon.add(stalk);scene.add(beacon);
let glLand=null;
function renderGL(s,gl,l){
 const p=surveyProfile(s.id),obj=new T.Object3D(),near=nearField(s);
 if(near){micro.geometry=near.geom;mask.value.set(near.cx,near.cz,patchRadius,1)}else mask.value.w=0;
 micro.visible=Boolean(near);shaderClock.value=s.clock;biome.value=s.id%4;
 if(glLand!==l){glLand=l;floor.geometry=l.geom;rocks.material.color.set(p.dark);rocks.count=l.debris.length;
 l.debris.forEach((d,i)=>{obj.position.set(d.x,d.y,d.z);obj.rotation.set(d.angle*.4,d.angle,0);obj.scale.set(d.size*1.28,d.size*.75,d.size*.94);obj.updateMatrix();rocks.setMatrixAt(i,obj.matrix)});
 rocks.instanceMatrix.needsUpdate=true;rocks.computeBoundingSphere();scene.fog=new T.FogExp2(p.haze,p.gas?.00065:.00035);
 sky.material.uniforms.zen.value.set(p.zenith);sky.material.uniforms.haze.value.set(p.haze)}
 if(p.gas)scene.fog.density=.00065+clamp((32-s.clearance)/120,0,1)*.014;
 camera.aspect=gl.domElement.clientWidth/gl.domElement.clientHeight;camera.updateProjectionMatrix();
 camera.position.set(s.x,s.y,s.z);camera.rotation.order='YXZ';camera.rotation.set(s.pitch,-s.yaw,s.bank);
 sky.position.copy(camera.position);beacon.position.set(s.site.x,terrainContact(s.id,s.site.x,s.site.z)+38,s.site.z);ring.rotation.y=-s.yaw;
 gl.render(scene,camera)
}
const css=(rgb)=>'rgb('+rgb.map(x=>Math.min(255,Math.max(0,Math.round(x)))).join(',')+')';
let buffer=null,lastFrame=-1,lastSurvey=null;
function drawSoftware(s,b,l){
 const screen=b.canvas,scale=Math.min(1,Math.sqrt(300000/(screen.width*screen.height)));
 const w=Math.max(1,Math.floor(screen.width*scale)),h=Math.max(1,Math.floor(screen.height*scale));
 if(!buffer)buffer=document.createElement('canvas');if(buffer.width!==w||buffer.height!==h){buffer.width=w;buffer.height=h;lastFrame=-1}
 // Sky and terrain rasterization are capped independently of input and physics.
 if(lastSurvey!==s||lastFrame<0||s.clock-lastFrame>=1/30-1e-6){
 lastFrame=s.clock;lastSurvey=s;const c=buffer.getContext('2d'),p=surveyProfile(s.id),pal=palette(s.id);
 const focal=h*.82,cs=Math.cos(s.yaw),sn=Math.sin(s.yaw),sp=Math.sin(s.pitch),cp=Math.cos(s.pitch),cr=Math.cos(s.bank),sr=Math.sin(s.bank);
 const project=(x,y,z)=>{
 const dx=x-s.x,dz=z-s.z,dy=y-s.y,right=dx*cs+dz*sn,forward=dx*sn-dz*cs,up=dy*cp-forward*sp,depth=dy*sp+forward*cp;
 return [right*cr+up*sr,up*cr-right*sr,depth]
 };
 const skyGrad=c.createLinearGradient(0,0,0,h*.68);skyGrad.addColorStop(0,p.zenith);skyGrad.addColorStop(.82,p.haze);skyGrad.addColorStop(1,p.haze);c.fillStyle=skyGrad;c.fillRect(0,0,w,h);
 const sunpos=project(s.x-2300,s.y+1250,s.z-3600);
 if(sunpos[2]>1){const x=w/2+sunpos[0]/sunpos[2]*focal,y=h/2-sunpos[1]/sunpos[2]*focal,r=Math.max(8,h*.21);const halo=c.createRadialGradient(x,y,0,x,y,r);halo.addColorStop(0,'#fff2bc');halo.addColorStop(.12,'#f9d79a');halo.addColorStop(.16,'rgba(245,205,132,.58)');halo.addColorStop(1,'rgba(250,220,160,0)');c.fillStyle=halo;c.fillRect(x-r,y-r,2*r,2*r)}
 const near=nearField(s);
 const queue=[];
 function enqueue(tri,col){
  const maxDepth=Math.max(tri[0][2],tri[1][2],tri[2][2]);if(maxDepth<=2)return;
  const poly=[];let prev=tri[2];
  for(const v of tri){if((prev[2]>2)!==(v[2]>2)){const t=(2-prev[2])/(v[2]-prev[2]);poly.push([lerp(prev[0],v[0],t),lerp(prev[1],v[1],t),2])}if(v[2]>2)poly.push(v);prev=v}
  const pix=poly.map(v=>[w*.5+v[0]*focal/v[2],h*.5-v[1]*focal/v[2]]);
  if(pix.every(v=>v[0]<0)||pix.every(v=>v[0]>w)||pix.every(v=>v[1]<0)||pix.every(v=>v[1]>h))return;
  const depth=tri.reduce((n,v)=>n+v[2],0)/3,fog=1-Math.exp(-Math.max(0,depth)*(p.gas?.0007+clamp((32-s.clearance)/120,0,1)*.014:.00042));
  queue.push({pix,col:css(col.map((k,i)=>lerp(k,pal.haze[i],fog))),depth})
 }
 for(const terrain of near?[l,near]:[l]){
  const a=terrain.geom.attributes.position.array,indices=terrain.geom.index.array,points=[],colors=terrain.colors;
  for(let i=0;i<a.length;i+=3)points.push(project(a[i],a[i+1],a[i+2]));
  for(let i=0;i<indices.length;i+=3){const u=indices[i],v=indices[i+1],q=indices[i+2];
   if(near&&terrain===l){const x=(a[3*u]+a[3*v]+a[3*q])/3,z=(a[3*u+2]+a[3*v+2]+a[3*q+2])/3;
    if(Math.max(Math.abs(x-near.cx),Math.abs(z-near.cz))<patchRadius)continue}
   enqueue([points[u],points[v],points[q]],colors[u].map((k,j)=>(k+colors[v][j]+colors[q][j])/3))
  }
 }
 const dark=pal.dark,rock=pal.rock;
 for(const d of l.debris){const v=project(d.x,d.y,d.z);if(v[2]<1||v[2]>220)continue;
 const size=d.size,A=project(d.x-size,d.y,d.z),B=project(d.x+size,d.y,d.z),C=project(d.x,d.y+size*.8,d.z),D=project(d.x,d.y,d.z+size*.8);enqueue([A,C,D],rock);enqueue([D,C,B],dark)}
 queue.sort((a,b)=>b.depth-a.depth);
 c.lineWidth=.7;c.lineJoin='round';for(const {pix,col} of queue){c.fillStyle=c.strokeStyle=col;c.beginPath();pix.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();c.stroke()}
 const mark=project(s.site.x,terrainContact(s.id,s.site.x,s.site.z)+38,s.site.z);
 if(mark[2]>2){const x=w/2+mark[0]*focal/mark[2],y=h/2-mark[1]*focal/mark[2],r=clamp(10*focal/mark[2],3,55);c.lineWidth=2;c.strokeStyle='#b6f2d8';c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(x,y+r);c.lineTo(x,y+r*2.3);c.stroke()}
 // A light flight-path reticle leaves the landscape unobstructed.
 c.strokeStyle='rgba(202,247,226,.78)';c.lineWidth=1;c.beginPath();c.moveTo(w*.5-19,h*.5);c.lineTo(w*.5-6,h*.5);c.lineTo(w*.5,h*.5+3);c.lineTo(w*.5+6,h*.5);c.lineTo(w*.5+19,h*.5);c.stroke()
 }
 b.drawImage(buffer,0,0,screen.width,screen.height)
}
export function renderSurvey(s,gl,ctx){
 const l=landscape(s);
 if(gl)renderGL(s,gl,l);
 else if(ctx)drawSoftware(s,ctx,l)
}

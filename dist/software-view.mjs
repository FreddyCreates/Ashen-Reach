// The unaccelerated flight and hangar views use offline renders of the same hulls.
// The deck remains a perspective view with real camera translation.
import {deckModel} from './fleet-models.mjs';
import {lighting} from './mesh-light.mjs';
const images=new Map();
function image(name){
 if(!images.has(name)){const im=new Image();im.src=new URL('./art/'+name+'.webp',import.meta.url);images.set(name,im)}
 const im=images.get(name);return im.complete&&im.naturalWidth?im:null
}
const decks=new Map();
function deckFaces(id){
 if(decks.has(id))return decks.get(id);
 const root=deckModel(id),faces=[];let offset=0;
 for(const mesh of root.children){const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal,idx=mesh.geometry.index.array;
 for(let j=0;j<idx.length;j+=3){
 const ids=[idx[j],idx[j+1],idx[j+2]],tri=ids.map(i=>[p.getX(i),p.getY(i),p.getZ(i)]);
 const i=ids[0],lit=mesh.material.name.startsWith('light'),factor=lit?1.35:.47+.68*Math.max(0,n.getY(i)*.76+n.getX(i)*-.37+n.getZ(i)*.51);
 const color=mesh.material.color.clone().multiplyScalar(factor);
 const rgb=color.convertLinearToSRGB();faces.push({tri,ids:ids.map(i=>i+offset),lit,r:Math.min(255,rgb.r*255)|0,g:Math.min(255,rgb.g*255)|0,b:Math.min(255,rgb.b*255)|0,nx:n.getX(i),ny:n.getY(i),nz:n.getZ(i),z:(tri[0][2]+tri[1][2]+tri[2][2])/3})}
 offset+=p.count;mesh.geometry.dispose()}
 faces.sort((a,b)=>a.z-b.z);decks.set(id,faces);lighting('decks',id).then(data=>{if(data?.length===offset){for(const f of faces)f.ambient=f.ids.map(i=>.31+.69*data[i]/255);deckKey=''}});return faces
}
let deckKey='',layer,depth,picture;
function drawTriangle(vertices,surface,pixels,w,h){
 const ordered=vertices.slice().sort((a,b)=>a.y-b.y),[top,mid,bottom]=ordered;
 const span=bottom.y-top.y;if(span<.001)return;
 const start=Math.max(0,Math.ceil(top.y-.5)),end=Math.min(h,Math.ceil(bottom.y-.5));
 const longX=(bottom.x-top.x)/span,longZ=(bottom.d-top.d)/span;
 for(let row=start;row<end;row++){
  const y=row+.5,low=y<mid.y?top:mid,high=y<mid.y?mid:bottom,dy=high.y-low.y;if(dy<.001)continue;
  const f=(y-low.y)/dy;
  let left=top.x+(y-top.y)*longX,right=low.x+f*(high.x-low.x);
  let shadeLeft=top.sh+(y-top.y)*(bottom.sh-top.sh)/span,shadeRight=low.sh+f*(high.sh-low.sh);
  let near=top.d+(y-top.y)*longZ,far=low.d+f*(high.d-low.d);
  if(left>right){[shadeLeft,shadeRight]=[shadeRight,shadeLeft];[left,right]=[right,left];[near,far]=[far,near]}
  const from=Math.max(0,Math.ceil(left-.5)),to=Math.min(w,Math.ceil(right-.5)),slope=(far-near)/(right-left||1);
  const shadeStep=(shadeRight-shadeLeft)/(right-left||1);let sh=shadeLeft+(from+.5-left)*shadeStep;
  let inv=near+(from+.5-left)*slope;
  for(let col=from;col<to;col++,inv+=slope,sh+=shadeStep){
   const i=row*w+col;if(inv<=depth[i])continue;depth[i]=inv;
   // Fine grain and distance fill keep seams and structural depth legible.
   const gain=surface.lit?1:(sh/inv)*(.83+Math.min(.24,inv*.42)+((col*13+row*17)%19)*.002);
   pixels[i*4]=surface.r*gain;pixels[i*4+1]=surface.g*gain;pixels[i*4+2]=surface.b*gain;pixels[i*4+3]=255
  }
 }
}
function drawDeck(ctx,g,width,height){
 const scale=Math.min(1,Math.sqrt(470000/(width*height))),w=Math.floor(width*scale),h=Math.floor(height*scale);
 const key=[g.ship,g.x.toFixed(2),g.z.toFixed(2),g.yaw.toFixed(3),g.pitch.toFixed(3),w,h].join('/');
 if(key!==deckKey){
 if(!layer)layer=document.createElement('canvas');
 const b=layer.getContext('2d');if(!picture||layer.width!==w||layer.height!==h){layer.width=w;layer.height=h;picture=b.createImageData(w,h);depth=new Float32Array(w*h)}
 depth.fill(0);picture.data.fill(0);const focal=h*.98,cs=Math.cos(g.yaw),sn=Math.sin(g.yaw),cp=Math.cos(g.pitch),sp=Math.sin(g.pitch);
 for(const face of deckFaces(g.ship)){
 const {tri,nx,ny,nz}=face,[x,y,z]=tri[0];if((g.x-x)*nx+(1.65-y)*ny+(g.z-z)*nz<0)continue;
 const view=tri.map(([x,y,z])=>{
 const dx=x-g.x,dy=y-1.65,dz=z-g.z,side=cs*dx-sn*dz,back=sn*dx+cs*dz;
 return [side,cp*dy+sp*back,sp*dy-cp*back]
 });
 const poly=[];let prev=view[2],ap=face.ambient?.[2]??1;for(const [vi,v] of view.entries()){const d0=prev[2],d1=v[2];if((d0>.08)!==(d1>.08)){
 const f=(d0-.08)/(d0-d1);poly.push([prev[0]+f*(v[0]-prev[0]),prev[1]+f*(v[1]-prev[1]),.08,ap+f*((face.ambient?.[vi]??1)-ap)])}if(d1>.08)poly.push([...v,face.ambient?.[vi]??1]);prev=v;ap=face.ambient?.[vi]??1}
 const projected=poly.map(([px,py,pz,shade])=>{const d=1/pz;return {x:w/2+px*focal*d,y:h*.5-py*focal*d,d,sh:shade*d}});
 for(let i=2;i<projected.length;i++)drawTriangle([projected[0],projected[i-1],projected[i]],face,picture.data,w,h)
 }b.putImageData(picture,0,0);deckKey=key}
 ctx.drawImage(layer,0,0,width,height)
}
function flare(b,x,y,r,color){
 const grad=b.createRadialGradient(x,y,0,x,y,r);grad.addColorStop(0,'white');grad.addColorStop(.12,color);grad.addColorStop(1,'transparent');b.fillStyle=grad;b.fillRect(x-r,y-r,r*2,r*2)
}
export function drawFallback(b,g,t,angle){
 const w=b.canvas.width,h=b.canvas.height,portrait=w/h<.94;
 const bg=image('dust-lane');b.fillStyle='#08131d';b.fillRect(0,0,w,h);if(bg){const scale=Math.max(w/bg.width,h/bg.height);const bw=bg.width*scale;let left=(w-bw)/2;
 if(g.mode==='deck'){left+=g.yaw*bw/(Math.PI*2);left=(left%bw+bw)%bw-bw}
 b.drawImage(bg,left,0,bw,bg.height*scale);if(left+bw<w)b.drawImage(bg,left+bw,0,bw,bg.height*scale)}
 const hang=g.mode==='hangar',disc=image('disc-'+g.world.id%4),radius=Math.min(w,h)*(hang?.36:.32);
 let px=w*(hang?.89:.69),py=h*(hang?.20:.23);
 if(g.mode==='deck'){const dx=12-g.x,dz=-53-g.z,back=Math.sin(g.yaw)*dx+Math.cos(g.yaw)*dz,side=Math.cos(g.yaw)*dx-Math.sin(g.yaw)*dz;
 const depth=Math.sin(g.pitch)*5.35-Math.cos(g.pitch)*back;px=depth>.1?w/2+side*h*.98/depth:-w*3;py=h/2-(Math.cos(g.pitch)*5.35+Math.sin(g.pitch)*back)*h*.98/Math.max(.1,depth)}
 const giant=g.world.id%4===2;
 function rings(start,end){
 b.save();b.translate(px,py);b.rotate(-.22);
 for(const [scale,line,a] of [[1.22,.017,.27],[1.32,.078,.37],[1.42,.015,.5],[1.49,.046,.25]]){
 b.strokeStyle='rgba(195,183,163,'+a+')';b.lineWidth=radius*line;b.beginPath();b.ellipse(0,0,radius*scale,radius*scale*.23,0,start,end);b.stroke()}b.restore()
 }
 if(giant)rings(Math.PI,Math.PI*2);
 if(disc)b.drawImage(disc,px-radius,py-radius,radius*2,radius*2);
 if(giant)rings(0,Math.PI);
 const moon=image('disc-0');if(moon){const size=radius*.20;b.drawImage(moon,px-radius*1.28-size*.5,py-radius*.41,size,size)}
 const count=Math.min(36,g.world.buildings.reduce((a,v)=>a+v,0));b.fillStyle='#b8b7a9';
 for(let i=0;i<count;i++){const a=i*2.39996+g.world.id;const x=px+Math.cos(a)*radius*1.12,y=py+Math.sin(a)*radius*.39;if(Math.sin(a)<0&&Math.hypot(px-x,py-y)<radius*.9)continue;b.fillRect(x-3,y-1,7,1.5);b.fillRect(x-1,y-2,2,3)}
 if(hang){const frame=((Math.round((angle-.73)*12/(Math.PI*2))%12)+12)%12;const im=(frame&&image('turn-'+g.ship+'-'+frame))||image('hero-'+g.ship);if(im){const width=Math.min(w*(portrait?1.04:.65),h*(portrait?.81:1.75));b.drawImage(im,w*(portrait?.50:.67)-width/2,h*(portrait?.34:.48)-width*.35,width,width*.7)}return}
 if(g.mode==='deck'){drawDeck(b,g,w,h);
 const dx=-1.65-g.x,dz=-5.35-g.z,depth=-Math.sin(g.yaw)*dx-Math.cos(g.yaw)*dz;
 if(depth>.45&&g.z>-5.35){const x=w*.5+(Math.cos(g.yaw)*dx-Math.sin(g.yaw)*dz)*h*.98/depth,y=h*.5+h*.98*(.10/depth+Math.tan(g.pitch));flare(b,x,y,Math.min(70,h*.29/depth),'#72e8db')}
 return}
 const scale=Math.min(w/21,h/23),cx=w*.5,cy=h*.69;
 const draw=(id,x,y,width,angle)=>{const im=image('flight-'+id);if(!im)return;b.save();b.translate(x,y);b.rotate(angle);b.drawImage(im,-width/2,-width/2,width,width);b.restore()};
 for(const e of g.enemies)draw(3,cx+(e.x-g.x)*scale,cy+(e.z-g.z)*scale,scale*4.2,Math.PI);
 for(const side of [-1,1])flare(b,cx+side*[.91,1.49,1.2][g.ship]*scale,cy+scale*1.48,scale*.43,'#6abfd0');
 draw(g.ship,cx,cy,scale*6.8,g.bank*.09);
 for(const hit of g.impacts){b.globalAlpha=Math.max(0,hit.life/hit.duration);flare(b,cx+(hit.x-g.x)*scale,cy+(hit.z-g.z)*scale,(1.35-hit.life/hit.duration)*scale*(hit.duration>.3?2:1),'#ffc17d')}b.globalAlpha=1;
 b.lineCap='round';for(const p of g.shots){const x=cx+(p.x-g.x)*scale,y=cy+(p.z-g.z)*scale;b.strokeStyle=p.enemy?'#ff9478':'#b8f8ff';b.lineWidth=3;b.beginPath();b.moveTo(x,y);b.lineTo(x+p.dx*.035*scale,y+p.dz*.035*scale);b.stroke()}
 if(g.spirit>0){const x=cx+1.9*scale,y=cy+Math.sin(t*3)*4;flare(b,x,y,16,'#65ffe2');b.strokeStyle='#79dacb';b.beginPath();b.ellipse(x,y,14,6,t*.7,0,Math.PI*2);b.stroke()}
}

// SI units in a primary-centred plane. Moons and the port follow prescribed circular
// ephemerides; the player is a test particle around the primary.
import {surveyProfile} from './survey.mjs';
import {random} from './universe.mjs';
const TAU=2*Math.PI;
const shipEngines=[
 {mass:9400,thrust:126000},{mass:21900,thrust:190000},{mass:12200,thrust:146000}
];
export function createTrajectory(world,ship){
 const p=surveyProfile(world.id),r=p.radius*1.36,mu=p.gravity*p.radius**2;
 return {world,ship,mu,radius:p.radius,x:r,y:0,vx:0,vy:Math.sqrt(mu/r),time:0,warp:20,
  asteroids:Array.from({length:48},(_,i)=>{const rng=random(world.id*1777+i*1327);return {phase:rng()*TAU,r:p.radius*(2.35+rng()*.4),size:.6+rng()*1.2}})}
}
function field(s,x,y,radial,tangent){
 const r=Math.hypot(x,y),rx=x/r,ry=y/r,p=shipEngines[s.ship];
 const thrust=p.thrust/p.mass/Math.max(1,Math.hypot(radial,tangent));
 const inward=-s.mu/(r*r)+radial*thrust;
 return [rx*inward-ry*tangent*thrust,ry*inward+rx*tangent*thrust]
}
export function stepTrajectory(s,seconds,radial=0,tangent=0){
 // Velocity Verlet bounds energy drift during long coasting arcs.
 for(let remaining=seconds;remaining>1e-9;){
  const h=Math.min(2,remaining);remaining-=h;
  const a=field(s,s.x,s.y,radial,tangent);
  s.x+=s.vx*h+.5*a[0]*h*h;s.y+=s.vy*h+.5*a[1]*h*h;
  const b=field(s,s.x,s.y,radial,tangent);
  s.vx+=(a[0]+b[0])*.5*h;s.vy+=(a[1]+b[1])*.5*h;s.time+=h;
  if(Math.hypot(s.x,s.y)<s.radius*1.011)return 'entry'
 }
 return 'space'
}
export function orbitReadout(s){
 const r=Math.hypot(s.x,s.y),v2=s.vx*s.vx+s.vy*s.vy,h=s.x*s.vy-s.y*s.vx;
 const energy=v2/2-s.mu/r,e=Math.sqrt(Math.max(0,1+2*energy*h*h/(s.mu*s.mu)));
 return {altitude:r-s.radius,speed:Math.sqrt(v2),energy,eccentricity:e,
   periapsis:h*h/(s.mu*(1+e))-s.radius,apoapsis:e<1?h*h/(s.mu*(1-e))-s.radius:Infinity}
}
export function track(s,r,phase=0){const a=phase+s.time*Math.sqrt(s.mu/r**3);return [r*Math.cos(a),r*Math.sin(a)]}
let panel,context,planetImages=new Map();
export function showTrajectory(s){
 if(!s&&!panel)return;
 if(!panel){panel=document.createElement('canvas');panel.className='navigation-display';panel.setAttribute('aria-label','Orbital navigation plot');document.body.prepend(panel);context=panel.getContext('2d')}
 panel.hidden=!s;if(!s)return;
 const now=performance.now();if(s.lastPaint&&now-s.lastPaint<65)return;s.lastPaint=now;
 const w=innerWidth,h=innerHeight;if(panel.width!==w||panel.height!==h){panel.width=w;panel.height=h}
 const b=context,cx=w*.5,cy=h*.47,extent=Math.max(s.radius*3.8,Math.hypot(s.x,s.y)*1.25);
 const scale=Math.min(w*.49,h*.38)/extent;
 const pt=(x,y)=>[cx+x*scale,cy-y*scale];
 b.fillStyle='#07111c';b.fillRect(0,0,w,h);
 const rnd=random(322);for(let i=0;i<210;i++){b.fillStyle=i%4?'#344c61':'#79959c';b.fillRect(rnd()*w,rnd()*h,1.3,1.3)}
 const ring=(r,color)=>{b.strokeStyle=color;b.beginPath();b.arc(cx,cy,r*scale,0,TAU);b.stroke()};
 for(const r of [1.75,2.55,3.2])ring(r*s.radius,'#28404b');
 function dot(x,y,r,c,label){const [u,v]=pt(x,y);b.fillStyle=c;b.beginPath();b.arc(u,v,r,0,TAU);b.fill();if(label){b.fillStyle='#d9e4df';b.font='12px system-ui';b.fillText(label,u+r+5,v+3)}}
 const family=s.world.id%4;if(!planetImages.has(family)){let im=new Image();im.src='./art/disc-'+family+'.webp';planetImages.set(family,im)}
 const im=planetImages.get(family),d=s.radius*scale/.46;if(im.complete&&im.naturalWidth)b.drawImage(im,cx-d/2,cy-d/2,d,d);else dot(0,0,s.radius*scale,s.world.color);
 s.asteroids.forEach(k=>dot(...track(s,k.r,k.phase),k.size,'#8c9190'));
 dot(...track(s,s.radius*3.2,1.25),6,'#cfc9b8','Outer moon');
 dot(...track(s,s.radius*1.75,2.5),3,'#92cfcc','Freeport beacon');
 const copy={...s};const period=TAU*Math.sqrt(Math.hypot(s.x,s.y)**3/s.mu),delta=Math.min(90,period/100);
 b.beginPath();b.moveTo(...pt(s.x,s.y));for(let i=0;i<100;i++){const result=stepTrajectory(copy,delta);b.lineTo(...pt(copy.x,copy.y));if(result==='entry'||Math.hypot(copy.x,copy.y)>extent*4)break}
 b.strokeStyle='#99b9ca';b.setLineDash([4,5]);b.stroke();b.setLineDash([]);
 dot(s.x,s.y,4.5,'#ffe0ac','Ship');const [u,v]=pt(s.x,s.y),speed=Math.hypot(s.vx,s.vy)||1;b.strokeStyle='#f7c682';b.beginPath();b.moveTo(u,v);b.lineTo(u+s.vx/speed*19,v-s.vy/speed*19);b.stroke();
}

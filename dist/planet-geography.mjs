// Canonical spherical surface: metres, stable body coordinates, no random per-session terrain.
import {Vector3} from './three.module.js';
import {ImprovedNoise} from './ImprovedNoise.mjs';
const noise=new ImprovedNoise(),V=(x=0,y=0,z=0)=>new Vector3(x,y,z);
export function bedrock(body,n){
 const id=body.id;if(id%4===2)return 0;
 const h=f=>noise.noise(n.x*f+id*.71,n.y*f+3,n.z*f);
 return 2700*h(3)+890*h(17)+210*h(81)+43*h(390)+11*h(2000)+2*h(9700)+.36*h(46000);
}
export function relief(body,n){
 const h=bedrock(body,n);return body.id%4===0?h:Math.max(0,h);
}
export function tangentFrame(body,position){
 const up=position.clone().sub(body.center).normalize();
 const east=V().crossVectors(V(0,1,0),up);
 if(east.lengthSq()<1e-12)east.set(1,0,0);east.normalize();
 const south=V().crossVectors(east,up).normalize();
 return {body,up,east,south};
}
export function directionAt(frame,x,z){
 return frame.up.clone().addScaledVector(frame.east,x/frame.body.r).addScaledVector(frame.south,z/frame.body.r).normalize();
}
export function localHeight(frame,x,z){
 return bedrock(frame.body,directionAt(frame,x,z));
}
export function localCoordinates(frame,x,z){
 const n=directionAt(frame,x,z);
 return {latitude:Math.asin(Math.max(-1,Math.min(1,n.y)))*180/Math.PI,longitude:Math.atan2(n.z,n.x)*180/Math.PI};
}
export function fromJourney(journey){
 const frame=tangentFrame(journey.body,journey.p),{up,east,south}=frame;
 const radial=journey.p.distanceTo(journey.body.center)-journey.body.r;
 return {frame,x:0,z:0,y:radial,vx:journey.v.dot(east),vy:journey.v.dot(up),vz:journey.v.dot(south),yaw:Math.atan2(journey.forward.dot(east),-journey.forward.dot(south))};
}
export function toJourney(s,journey){
 const frame=s.frame;if(!frame||frame.body.id!==journey.body.id)return false;
 const n=directionAt(frame,s.x,s.z),basis=tangentFrame(journey.body,journey.body.center.clone().addScaledVector(n,journey.body.r));
 journey.p.copy(journey.body.center).addScaledVector(n,journey.body.r+s.y);
 // Transport local survey basis onto the new tangent plane, preserving heading and velocity.
 const east=frame.east.clone().addScaledVector(n,-frame.east.dot(n)).normalize();
 const south=V().crossVectors(east,n).normalize();
 journey.v.copy(east).multiplyScalar(s.vx).addScaledVector(south,s.vz).addScaledVector(n,s.vy);
 journey.forward.copy(east).multiplyScalar(Math.sin(s.yaw)).addScaledVector(south,-Math.cos(s.yaw)).normalize();
 journey.right.crossVectors(journey.forward,n).normalize();
 journey.alt=s.y-relief(journey.body,n);journey.aim=false;journey.harborApproach=false;
 return true;
}
export function surfaceColor(body,n,h,theme){
 const family=body.id%4,sea=theme.sea;
 const moisture=Math.max(0,Math.min(1,.5+noise.noise(n.x*13+body.id,n.y*13,n.z*13)));
 const detail=noise.noise(n.x*1600+body.id,n.y*1600,n.z*1600);
 const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*Math.max(0,Math.min(1,t)));
 if(sea&&h<=0)return mix([14,44,68],[52,141,150],Math.exp(h/180));
 if(sea&&h<24)return mix([184,169,129],theme.rock,h/24);
 const temp=1-Math.abs(n.y)*.85-Math.max(0,h)/6500;
 if(temp<.16)return mix(theme.light,[229,237,240],(.16-temp)*5);
 const rock=family===3?mix([44,49,54],[111,108,96],moisture):family===1?mix([91,105,79],[47,91,70],moisture):mix(theme.rock,theme.light,moisture);
 return mix(rock,theme.light,Math.max(0,h)/3600).map(v=>v+detail*11);
}

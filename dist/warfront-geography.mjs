// Canonical Aurelia warfront, shared by client and server. No per-client terrain seed.
import {Vector3} from './three.module.js';
import {relief,tangentFrame,localHeight} from './planet-geography.mjs';
export const WAR_RADIUS=600;
export const FACTIONS=['Lantern Guild','Wakekeepers','Free Captains'];
export const CONTROL=[{id:'aurelia-control-0',name:'Relay Crown',x:0,z:0},{id:'aurelia-control-east',name:'East Depot',x:100,z:0},{id:'aurelia-control-west',name:'West Ridge',x:-100,z:0}];
const body={id:0,r:4.9e6,center:new Vector3()};
export const warFrame=tangentFrame(body,new Vector3(0,0,body.r));
export const ground=(x,z)=>localHeight(warFrame,x,z);
export function rallyFor(b){
 if(b?.id!==0)return null;
 const frame=tangentFrame(b,b.center.clone().add(new Vector3(0,0,b.r)));
 return {id:'A-01',name:'Relay Crown',body:0,up:frame.up,right:frame.east,forward:frame.south.clone().negate(),radius:12,position:b.center.clone().addScaledVector(frame.up,b.r+relief(b,frame.up))};
}
export function hasLine(a,b){
 const d=Math.hypot(b.x-a.x,b.z-a.z),start=ground(a.x,a.z)+1.6,end=ground(b.x,b.z)+1.2;
 for(let k=2;k<d;k+=2){const t=k/d;if(ground(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t)>start+(end-start)*t-.15)return false}
 return true;
}

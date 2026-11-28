import {localHeight,directionAt,tangentFrame} from './planet-geography.mjs';
import {groundWeapon,armorAbsorb} from './armory.mjs';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const familyNames=['Ferric expedition','Nacre coastal expedition','Cloud deck','Orison basalt expedition'];
export function expeditionKey(frame){
 const n=frame.up;return frame.body.id+'/'+[n.x,n.y,n.z].map(v=>Math.round(v*frame.body.r/250)).join('/');
}
export function canDisembark(s){
 if(!s||s.body.id%4===2||s.v.length()>2.5||s.alt>8||s.alt<0)return false;
 const f=tangentFrame(s.body,s.p);
 return s.body.id%4===0||localHeight(f,0,0)>1;
}
export function createExpedition(j,ledger){
 if(!canDisembark(j))return null;
 const frame=tangentFrame(j.body,j.p),key=expeditionKey(frame),done=ledger.expeditions?.[key]===true;
 const valid=(x,z)=>j.body.id%4===0||localHeight(frame,x,z)>2;
 const sites=[];
 for(let i=0;i<64&&sites.length<5;i++){const a=i*2.39996323,r=40+i*3,x=Math.sin(a)*r,z=Math.cos(a)*r;if(valid(x,z))sites.push({x,z,id:sites.length,kind:sites.length<3?'sample':'drone',taken:done,hp:done?0:3})}
 return {frame,key,name:familyNames[j.body.id%4],x:0,z:0,yaw:0,hp:100,clock:0,fire:0,sites,done,notice:'Explore the landing region.',ship:{x:0,z:0}};
}
export function stepExpedition(s,input,dt,ledger){
 dt=clamp(dt,0,.05);s.clock+=dt;s.fire=Math.max(0,s.fire-dt);
 if(s.hp<=0)return;
 s.yaw-=clamp(input.turn||0,-1,1)*dt*1.7;
 const move=clamp(input.drive||0,-1,1)*dt*6;
 const x=s.x+Math.sin(s.yaw)*move,z=s.z-Math.cos(s.yaw)*move;
 const height=localHeight(s.frame,x,z),prev=localHeight(s.frame,s.x,s.z);
 if(Math.hypot(x,z)<=12000&&(s.frame.body.id%4===0||height>1)&&Math.abs(height-prev)<Math.max(.35,Math.abs(move)*.85)){s.x=x;s.z=z}
 for(const target of s.sites)if(target.kind==='drone'&&target.hp>0&&dist(s,target)<13)s.hp=Math.max(0,s.hp-dt*(9-armorAbsorb(ledger)));
}
export function fireGround(s,ledger){
 if(s.hp<=0||s.fire>0)return false;const w=groundWeapon(ledger);s.fire=w.rate;
 let hit=null;
 for(const t of s.sites){if(t.kind!=='drone'||t.hp<=0)continue;const d=dist(s,t);if(d>w.range||d<.01)continue;
 const dot=((t.x-s.x)*Math.sin(s.yaw)-(t.z-s.z)*Math.cos(s.yaw))/d;
 if(dot>.965&&(!hit||dist(s,hit)>d))hit=t}
 if(!hit){s.notice='Pulse discharged.';return false}
 hit.hp=Math.max(0,hit.hp-w.damage);s.notice=hit.hp?'Sentinel hit.':'Sentinel disabled.';return true;
}
export function interactGround(s,ledger){
 if(s.hp<=0)return 'Return to ship for recovery.';
 const t=s.sites.find(t=>t.kind==='sample'&&!t.taken&&dist(s,t)<6);
 if(t){t.taken=true;s.notice='Geological sample secured.';return s.notice}
 return 'Approach a sample within 6 metres.';
}
export function settleExpedition(s,ledger){
 if(dist(s,s.ship)>8)return 'Return within 8 m of your vessel.';
 if(s.done||ledger.expeditions?.[s.key])return 'Expedition already recorded.';
 if(s.hp<=0||!s.sites.some(t=>t.kind==='sample')||s.sites.some(t=>t.kind==='sample'?!t.taken:t.hp>0))return 'Survey and sentinel objectives incomplete.';
 if(!Number.isSafeInteger(ledger.credits)||ledger.credits<0||!Number.isSafeInteger(ledger.credits+90))return 'Invalid balance.';
 ledger.expeditions??={};ledger.expeditions[s.key]=true;ledger.credits+=90;s.done=true;return 'Expedition completed. 90 trade credits received.';
}

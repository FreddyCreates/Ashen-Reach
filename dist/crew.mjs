import {weights} from './pilot-weights.mjs';
const slot='ashen-reach.navigator.v1';
export function loadCrew(storage){try{const c=JSON.parse(storage.getItem(slot));if(c&&typeof c.id==='string'&&Array.isArray(c.log))return c}catch{}
 return {id:crypto.randomUUID?.()||'navigator-'+Date.now().toString(36),name:'Astra',duty:'standby',log:[],visits:0}
}
export function recordCrew(c,storage,event,world,ship){
 c.log.push({event,world,ship,at:new Date().toISOString()});c.log=c.log.slice(-48);
 try{storage.setItem(slot,JSON.stringify(c))}catch{}
}
export function pilot(s){
 const dx=s.site.x-s.x,dz=s.site.z-s.z,dist=Math.hypot(dx,dz);
 const error=Math.atan2(Math.sin(Math.atan2(dx,-dz)-s.yaw),Math.cos(Math.atan2(dx,-dz)-s.yaw));
 const forward=s.vx*Math.sin(s.yaw)-s.vz*Math.cos(s.yaw);
 const clamp=v=>Math.max(-1,Math.min(1,v));
 const inputs=[error/Math.PI,(Math.min(43,dist*.18)*Math.max(0,Math.cos(error))-forward)/46,(43-s.clearance)/78].map(clamp);
 const [w,bias,output]=weights,command=[...output[0]];
 for(let j=0;j<bias.length;j++){
   const h=Math.tanh(bias[j]+inputs.reduce((sum,v,k)=>sum+v*w[k][j],0));
   for(let k=0;k<3;k++)command[k]+=h*output[j+1][k]
 }
 return {turn:clamp(command[0]),throttle:clamp(command[1]),lift:clamp(command[2])}
}

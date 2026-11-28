// Authoritative fictional combat and loot rules. No client supplied damage or rewards.
import {randomUUID} from 'node:crypto';
const factions=['Lantern Guild','Wakekeepers','Free Captains'];
const weapons={pulse:{damage:18,range:24,cooldown:480},carbine:{damage:26,range:42,cooldown:400}};
export function newUniverse(){return {schema:1,players:{},loot:{},territory:{},revision:0}}
const own=(o,k)=>Object.hasOwn(o,k);
export function enlist(s,id,faction){
 if(!/^[a-zA-Z0-9_-]{1,64}$/.test(id)||!factions.includes(faction)||own(s.players,id))return false;
 s.players[id]={id,faction,body:0,x:0,z:0,hp:100,inventory:{pulse:1,salvage:3},weapon:'pulse',lastFire:0,lastMove:0,seq:0};s.revision++;return true;
}
const range=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function command(s,id,cmd,now=Date.now()){
 const p=own(s.players,id)?s.players[id]:null;
 if(!p||!Number.isSafeInteger(cmd?.seq)||cmd.seq!==p.seq+1)return {ok:false,error:'Invalid sequence or player'};
 if(!Number.isFinite(now)||p.hp<=0)return {ok:false,error:'Player unavailable'};
 const reject=error=>({ok:false,error});
 let event;
 if(cmd.type==='move'){
  if(!Number.isFinite(cmd.x)||!Number.isFinite(cmd.z))return reject('Invalid coordinates');
  const dt=Math.min(1,Math.max(0,(now-p.lastMove)/1000));
  if(range(p,cmd)>6*dt+.05||Math.abs(cmd.x)>100000||Math.abs(cmd.z)>100000)return reject('Movement outside envelope');
  p.x=cmd.x;p.z=cmd.z;p.lastMove=now;event='Moved';
 }else if(cmd.type==='attack'){
  const q=own(s.players,cmd.target)?s.players[cmd.target]:null,w=weapons[p.weapon];
  if(!q||q===p||q.hp<=0||q.body!==p.body||q.faction===p.faction||range(p,q)>w.range||now-p.lastFire<w.cooldown)return reject('Target or cooldown invalid');
  p.lastFire=now;q.hp=Math.max(0,q.hp-w.damage);event='Hit';
  if(q.hp===0){const lootId=randomUUID();s.loot[lootId]={id:lootId,body:q.body,x:q.x,z:q.z,items:{...q.inventory},owner:q.id};q.inventory={};event='Defeated';}
 }else if(cmd.type==='loot'){
  const l=own(s.loot,cmd.id)?s.loot[cmd.id]:null;
  if(!l||l.body!==p.body||range(l,p)>4)return reject('Loot unavailable');
  for(const [k,v] of Object.entries(l.items))if(!Number.isSafeInteger(v)||v<0||!Number.isSafeInteger((p.inventory[k]||0)+v))return reject('Inventory invalid');
  for(const [k,v] of Object.entries(l.items))p.inventory[k]=(p.inventory[k]||0)+v;
  delete s.loot[cmd.id];event='Loot recovered';
 }else if(cmd.type==='capture'){
  // Fixed control point; uncontested occupation required.
  if(p.body!==0||Math.hypot(p.x,p.z)>8)return reject('Outside control point');
  if(Object.values(s.players).some(q=>q.body===p.body&&q.hp>0&&q.faction!==p.faction&&range(q,p)<24))return reject('Territory contested');
  s.territory['aurelia-control-0']=p.faction;event='Territory captured';
 }else return reject('Unknown command');
 p.seq++;s.revision++;return {ok:true,event,revision:s.revision};
}

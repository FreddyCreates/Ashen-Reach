import {warFrame} from './warfront-geography.mjs';
const KEY='ashen.war.session.v1';
export class WarClient{
 constructor(){this.token=null;this.snapshot=null;this.busy=false;this.active=false;this.next=0;this.pending=null;this.notice='';this.failure=false}
 async request(path,method='GET',data){
  const headers={};if(this.token)headers.Authorization='Bearer '+this.token;if(data)headers['Content-Type']='application/json';
  const response=await fetch('/api/war/'+path,{method,headers,body:data?JSON.stringify(data):undefined,cache:'no-store',signal:AbortSignal.timeout(5000)});
  const result=await response.json();if(result.self)this.snapshot=result;
  if(!response.ok)throw Error(result.error||'Network request rejected');return result;
 }
 async connect(faction){
  if(location.protocol!=='http:'&&location.protocol!=='https:')throw Error('Launch the network server, not the offline HTML file.');
  try{this.token=sessionStorage.getItem(KEY)}catch{}
  if(this.token){try{await this.request('state');this.active=true;return}catch{this.token=null}}
  if(!faction)throw Error('Choose a faction.');
  const result=await this.request('join','POST',{faction});this.token=result.token;
  try{sessionStorage.setItem(KEY,this.token)}catch{}
  this.active=true;
 }
 makeSurface(){const p=this.snapshot.self;return {frame:warFrame,x:p.x,z:p.z,yaw:p.yaw,hp:p.hp,clock:0,sites:[],ship:{x:0,z:0},online:true,remote:this.snapshot,name:'Aurelia / Relay Crown'}}
 enqueue(type,extra={}){if(!this.pending)this.pending={type,...extra}}
 step(s,input,now,dt){
  if(!this.active)return;s.clock+=dt;
  if(this.snapshot){const p=this.snapshot.self;s.remote=this.snapshot;s.hp=p.hp;
   const k=1-Math.exp(-dt*18);s.x+=(p.x-s.x)*k;s.z+=(p.z-s.z)*k;s.yaw+=Math.atan2(Math.sin(p.yaw-s.yaw),Math.cos(p.yaw-s.yaw))*k;
  }
  if(this.busy||now<this.next)return;this.next=now+125;this.busy=true;
  const p=this.snapshot.self;
  let cmd=this.pending;this.pending=null;
  if(!cmd&&p.hp>0&&input.fire&&now>=(this.fireAt||0)){cmd={type:'fire'};this.fireAt=now+500}
  if(!cmd&&p.hp>0&&(input.drive||input.turn))cmd={type:'input',drive:input.drive,turn:input.turn};
  if(cmd?.type==='fire')this.fireAt=now+500;
  (cmd?this.request('command','POST',{...cmd,seq:p.seq+1}):this.request('state')).then(r=>{this.failure=false;if(cmd&&cmd.type!=='input')this.notice=r.event||'Confirmed';}).catch(e=>{this.notice=e.message;this.failure=!this.snapshot||!['Weapon cooling','Recovery not ready','Territory contested','Outside control point','Loot unavailable','Player unavailable','Command rate limited'].includes(e.message)}).finally(()=>{this.busy=false});
 }
 close(){this.active=false;this.pending=null}
}

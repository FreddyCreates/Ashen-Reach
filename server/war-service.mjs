import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {newUniverse,enlist,command} from './shared-universe.mjs';
import {FACTIONS,CONTROL} from '../dist/warfront-geography.mjs';
const hash=t=>createHash('sha256').update(t).digest('hex');
const allowed=new Set(['input','fire','loot','capture','respawn']);
const sessionName='ashen_war_v1';
const reply=(res,status,data,headers={})=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});res.end(JSON.stringify(data))};
function browserCookie(origin,token){
 if(!origin)return {};
 const secure=origin.protocol==='https:';
 const local=origin.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(origin.hostname);
 if(!secure&&!local)return null;
 return {'Set-Cookie':sessionName+'='+token+'; Max-Age=2592000; Path=/api/war/; HttpOnly; SameSite=Strict'+(secure?'; Secure':'')};
}
function cookieToken(req){
 const cookies=(req.headers.cookie||'').split(';').map(x=>x.trim()).filter(x=>x.startsWith(sessionName+'='));
 return cookies.length===1?new RegExp('^'+sessionName+'=([a-f0-9]{64})$').exec(cookies[0])?.[1]:undefined;
}
async function body(req){let raw='',size=0;for await(const chunk of req){size+=chunk.length;if(size>4096)throw Error('Request too large');raw+=chunk}return JSON.parse(raw||'{}')}
export async function createWarService({dir,clock=Date.now}={}){
 if(dir)await mkdir(dir,{recursive:true});
 const file=dir&&join(dir,'warfront.json');let state={universe:newUniverse(),sessions:{}};
 if(file){try{state=JSON.parse(await readFile(file,'utf8'));if(state.universe?.schema!==1||!state.sessions)throw Error('Invalid war save')}catch(e){if(e.code!=='ENOENT')throw e}}
 let queue=Promise.resolve();const rates=new Map(),presence=new Map();
 const serial=fn=>{const task=queue.then(fn);queue=task.catch(()=>{});return task};
 async function commit(next){if(file){await writeFile(file+'.tmp',JSON.stringify(next),{mode:0o600});await rename(file+'.tmp',file)}state=next}
 function snapshot(id){const u=state.universe,now=clock(),p=u.players[id];return {revision:u.revision,serverTime:now,self:{...p},players:Object.values(u.players).filter(q=>q.id!==id&&q.body===p.body&&now-(presence.get(q.id)??q.seen??0)<=30000&&Math.hypot(q.x-p.x,q.z-p.z)<180).map(({id,faction,x,z,hp,yaw,score})=>({id,faction,x,z,hp,yaw,score})),loot:Object.values(u.loot).filter(l=>l.body===p.body&&Math.hypot(l.x-p.x,l.z-p.z)<180),territory:u.territory,control:CONTROL}}
 return async (req,res)=>{
  const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith('/api/war/'))return false;
  try{
   // Same-origin browser requests; no cross-origin token transport.
   const origin=req.headers.origin?new URL(req.headers.origin):null;
   if(origin&&(!['http:','https:'].includes(origin.protocol)||origin.host!==req.headers.host||
     (req.headers['sec-fetch-site']&&req.headers['sec-fetch-site']!=='same-origin')))
    return reply(res,403,{error:'Origin denied'}),true;
   const bearer=/^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization||'')?.[1];
   const cookie=cookieToken(req),token=bearer||cookie;
   const id=token&&state.sessions[hash(token)];
   const authenticated=!!id&&Object.hasOwn(state.universe.players,id);
   if(req.method==='GET'&&url.pathname==='/api/war/health'){reply(res,200,{online:true,region:'Aurelia / Relay Crown',protocol:1});return true}
   if(req.method==='POST'&&url.pathname==='/api/war/join'){
    if(origin&&browserCookie(origin,'')===null){reply(res,403,{error:'Secure connection required'});return true}
    if(authenticated){presence.set(id,clock());reply(res,200,snapshot(id));return true}
    const data=await body(req);
    await serial(async()=>{
     if(!FACTIONS.includes(data.faction))return reply(res,400,{error:'Choose a faction'});
     if(Object.keys(state.sessions).length>=256)return reply(res,503,{error:'World at account capacity'});
     const key='join:'+req.socket.remoteAddress,now=clock();if(now-(rates.get(key)??-Infinity)<1000)return reply(res,429,{error:'Join rate limited'});rates.set(key,now);
     const next=structuredClone(state),id=randomUUID(),token=randomBytes(32).toString('hex');
     enlist(next.universe,id,data.faction);const p=next.universe.players[id];p.seen=now;p.lastMove=now;p.lastFire=now;
     p.x=data.faction==='Lantern Guild'?-15:data.faction==='Wakekeepers'?15:0;p.z=20;p.yaw=0;
     next.sessions[hash(token)]=id;await commit(next);presence.set(id,now);reply(res,201,origin?snapshot(id):{token,...snapshot(id)},browserCookie(origin,token));
    });return true;
   }
   if(!authenticated){reply(res,401,{error:'Invalid session'});return true}
   if(req.method==='POST'&&url.pathname==='/api/war/resume'){
    const headers=origin&&bearer&&browserCookie(origin,bearer);
    if(!headers){reply(res,403,{error:'Secure same-origin session required'});return true}
    presence.set(id,clock());reply(res,200,snapshot(id),headers);return true
   }
   if(req.method==='GET'&&url.pathname==='/api/war/state'){presence.set(id,clock());reply(res,200,snapshot(id));return true}
   if(req.method==='POST'&&url.pathname==='/api/war/command'){
    if(!bearer&&!origin){reply(res,403,{error:'Same-origin command required'});return true}
    const data=await body(req);
    await serial(async()=>{
     if(!allowed.has(data.type))return reply(res,400,{error:'Command not allowed'});
     const now=clock(),key='cmd:'+id;
     if(now-(rates.get(key)??-Infinity)<65)return reply(res,429,{error:'Command rate limited',...snapshot(id)});
     rates.set(key,now);presence.set(id,now);
     const next=structuredClone(state);
     for(const q of Object.values(next.universe.players))q.seen=presence.get(q.id)??q.seen??0;
     const result=command(next.universe,id,data,now);
     if(!result.ok)return reply(res,409,{...result,...snapshot(id)});
     await commit(next);reply(res,200,{...result,...snapshot(id)});
    });return true;
   }
   reply(res,404,{error:'Unknown war endpoint'});
  }catch(e){reply(res,400,{error:'Request rejected'});console.error('War service:',e.message)}
  return true;
 };
}

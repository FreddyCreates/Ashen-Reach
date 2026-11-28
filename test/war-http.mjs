import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createWarService} from '../server/war-service.mjs';
import {ground} from '../dist/warfront-geography.mjs';
test('two HTTP clients share combat, loot, territory and durable sessions',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'ashen-war-'));let now=100000,server;
 const start=async()=>{
  const service=await createWarService({dir,clock:()=>now});
  server=createServer(async(req,res)=>{if(!await service(req,res))res.writeHead(404).end()});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return 'http://127.0.0.1:'+server.address().port;
 };
 const close=async()=>{if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));server=null}};
 try{
  let url=await start();
  const call=async(path,token,data)=>{const r=await fetch(url+'/api/war/'+path,{method:data?'POST':'GET',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});return {status:r.status,...await r.json()}};
  assert.equal((await call('state')).status,401);
  let a=await call('join',null,{faction:'Lantern Guild'});now+=1100;
  let b=await call('join',null,{faction:'Wakekeepers'});assert.equal(a.status,201);assert.equal(b.status,201);
  const ta=a.token,tb=b.token;
  const act=async(token,cmd,delay=250)=>{now+=delay;const p=await call('state',token);return call('command',token,{...cmd,seq:p.self.seq+1})};
  assert.equal((await call('state',ta)).players[0].id,b.self.id);
  assert.equal((await act(ta,{type:'attack',target:b.self.id,damage:999})).status,400);
  // Face east, then approach the other faction using validated control inputs.
  for(let i=0;i<3;i++)a=await act(ta,{type:'input',turn:-Math.PI/2/(3*.25*2.2),drive:0});
  assert.ok(Math.abs(a.self.yaw-Math.PI/2)<1e-6);
  for(let i=0;i<18;i++)a=await act(ta,{type:'input',turn:0,drive:1});
  assert.ok(Math.hypot(a.self.x-b.self.x,a.self.z-b.self.z)<4);
  for(let i=0;i<6;i++){a=await act(ta,{type:'fire',damage:999},550);assert.equal(a.status,200);assert.match(a.event,/Hit|Defeated/)}
  b=await call('state',tb);assert.equal(b.self.hp,0);assert.equal(a.loot.length,1);
  const loot=a.loot[0].id;
  a=await act(ta,{type:'loot',id:loot});assert.equal(a.self.inventory.salvage,6);
  assert.equal((await act(ta,{type:'loot',id:loot})).status,409);
  assert.equal((await act(tb,{type:'respawn'})).status,409);
  b=await act(tb,{type:'respawn'},5500);assert.equal(b.self.hp,100);assert.deepEqual(b.self.inventory,{pulse:1});
  // Walk to the central relay and capture it.
  const goto=async(x,z)=>{
   let p=(await call('state',ta)).self;
   let heading=Math.atan2(x-p.x,-(z-p.z)),angle=Math.atan2(Math.sin(heading-p.yaw),Math.cos(heading-p.yaw));
   while(Math.abs(angle)>.001){const t=Math.max(-1,Math.min(1,-angle/.55));const result=await act(ta,{type:'input',turn:t,drive:0});p=result.self;angle=Math.atan2(Math.sin(heading-p.yaw),Math.cos(heading-p.yaw))}
   for(let i=0;i<60&&Math.hypot(p.x-x,p.z-z)>3;i++){const result=await act(ta,{type:'input',turn:0,drive:1});p=result.self}
   assert.ok(Math.hypot(p.x-x,p.z-z)<=8);
  };
  await goto(0,0);a=await act(ta,{type:'capture'});assert.equal(a.status,200);assert.equal(a.territory['aurelia-control-0'],'Lantern Guild');
  await close();url=await start();const restored=await call('state',ta);assert.equal(restored.self.inventory.salvage,6);assert.equal(restored.territory['aurelia-control-0'],'Lantern Guild');assert.equal(restored.loot.length,0);
 }finally{await close();await rm(dir,{recursive:true,force:true})}
});

test('browser sessions remain available to fresh tabs across restart without exposing a bearer token',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'ashen-browser-war-'));let server,now=100000;
 const start=async()=>{
  const service=await createWarService({dir,clock:()=>now});
  server=createServer(async(req,res)=>{if(!await service(req,res))res.writeHead(404).end()});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return 'http://127.0.0.1:'+server.address().port;
 };
 const close=async()=>{if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));server=null}};
 try{
  let url=await start();
  const call=(path,headers={},data)=>fetch(url+'/api/war/'+path,{
   method:data===undefined?'GET':'POST',headers:{...headers,...(data===undefined?{}:{'Content-Type':'application/json'})},body:data===undefined?undefined:JSON.stringify(data)
  });
  const joined=await call('join',{Origin:url,'Sec-Fetch-Site':'same-origin'},{faction:'Lantern Guild'});
  assert.equal(joined.status,201);
  const result=await joined.json();assert.equal(result.token,undefined);
  const setCookie=joined.headers.get('Set-Cookie');assert.match(setCookie,/HttpOnly/);assert.match(setCookie,/SameSite=Strict/);assert.match(setCookie,/Max-Age=2592000/);
  const cookie=setCookie.split(';')[0];
  assert.equal((await call('command',{Cookie:cookie},{type:'capture',seq:1})).status,403);
  assert.equal((await call('command',{Cookie:cookie,Origin:'https://foreign.invalid'},{type:'capture',seq:1})).status,403);
  await close();url=await start();
  const reopened=await call('state',{Cookie:cookie});assert.equal(reopened.status,200);
  assert.equal((await reopened.json()).self.id,result.self.id);
  assert.equal((await call('state')).status,401);
  const same=await call('join',{Cookie:cookie,Origin:url},{faction:'Wakekeepers'});
  assert.equal(same.status,200);assert.equal((await same.json()).self.id,result.self.id);
  now+=1200;
  const old=await (await call('join',{}, {faction:'Wakekeepers'})).json();
  const migrated=await call('resume',{Origin:url,Authorization:'Bearer '+old.token},{});
  assert.equal(migrated.status,200);assert.equal((await migrated.json()).self.id,old.self.id);
  assert.ok(migrated.headers.get('Set-Cookie'));
 }finally{await close();await rm(dir,{recursive:true,force:true})}
});

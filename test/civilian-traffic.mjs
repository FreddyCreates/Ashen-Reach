import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {advanceTraffic,newTraffic,trafficInterval,trafficView,validTraffic} from '../dist/civilian-traffic.mjs';
import {epoch} from '../dist/universe.mjs';
import {createTrafficService} from '../server/traffic-service.mjs';

function sumStock(s){
  return s.markets.reduce((sum,m)=>sum+Object.values(m.stock).reduce((n,v)=>n+v,0)-m.produced+m.consumed,0)+
    s.pilots.reduce((sum,p)=>sum+(p.position.cargo?.units??0),0);
}

test('named agents autonomously haul real stock, survey and patrol without minting duplicate cargo',()=>{
  const state=newTraffic(12),total=sumStock(state);
  const startingPilots=trafficView(state).pilots.map(p=>p.id);
  const seen=new Set();
  for(let tick=13;tick<550;tick++){
    advanceTraffic(state,tick);
    for(const e of state.events)seen.add(e.kind);
    assert.equal(sumStock(state),total,'stock, cargo, production and consumption balance at every step');
    assert.ok(validTraffic(state),'checkpoint validates after every tick');
  }
  assert.deepEqual(trafficView(state).pilots.map(p=>p.id),startingPilots);
  assert.ok(['delivered','surveyed','patrolled','departed'].every(event=>seen.has(event)));
  assert.ok(state.pilots.some(p=>p.delivered>0)&&state.pilots.some(p=>p.surveys>0)&&state.pilots.some(p=>p.patrols>0));
  assert.ok(state.events.length<=32);
  assert.ok(trafficView(state).pilots.every(p=>p.name&&p.story));
});

test('repeat, rewind and serialized replay do not fork or double-settle the same flight',()=>{
  const state=newTraffic(36),before=structuredClone(state);
  advanceTraffic(state,35);
  advanceTraffic(state,36);
  assert.deepEqual(state,before);
  const restored=JSON.parse(JSON.stringify(state));
  assert.equal(validTraffic(restored),true);
  for(let t=37;t<110;t++)advanceTraffic(state,t);
  advanceTraffic(restored,109);
  assert.deepEqual(state,restored);
  advanceTraffic(restored,5000);
  assert.equal(restored.tick,229,'large downtime catch-up is bounded per refresh');
  const malformed=structuredClone(state);
  malformed.markets[0].stock.ore=-1;
  assert.equal(validTraffic(malformed),false);
});

test('two HTTP clients read the same live simulation and restart retains the same identities and receipts',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'ashen-traffic-'));
  let step=17,server,traffic;
  const start=async()=>{
    traffic=await createTrafficService({dir,pollMs:0,clock:()=>epoch+step*trafficInterval});
    server=createServer(async(req,res)=>{if(!await traffic.handle(req,res))res.writeHead(404).end();});
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    return 'http://127.0.0.1:'+server.address().port+'/api/traffic';
  };
  const close=async()=>{
    traffic?.close();traffic=null;
    if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));server=null;}
  };
  try{
    let url=await start();
    assert.equal((await fetch(url,{method:'POST'})).status,405);
    assert.equal(await (await fetch(url,{method:'HEAD'})).text(),'');
    const initial=await (await fetch(url)).json();
    assert.equal(initial.mode,'shared');
    step+=20;
    const clientPair=await Promise.all(['one','two'].map(async id=>await(await fetch(url,{headers:{'X-Test-Client':id}})).json()));
    assert.deepEqual(clientPair[0],clientPair[1]);
    assert.equal(clientPair[0].tick,step);
    assert.notDeepEqual(clientPair[0].events,initial.events);
    const checkpoint=JSON.parse(await readFile(join(dir,'civilian-traffic.json'),'utf8'));
    assert.ok(validTraffic(checkpoint));
    await close();url=await start();
    assert.deepEqual(await (await fetch(url)).json(),clientPair[0]);
    await close();
    await writeFile(join(dir,'civilian-traffic.json'),'{"schema":1,"tick":99}');
    await assert.rejects(start,/Invalid civilian traffic checkpoint/);
  }finally{await close();await rm(dir,{force:true,recursive:true});}
});

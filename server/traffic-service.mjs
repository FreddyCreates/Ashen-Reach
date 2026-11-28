import {mkdir, readFile, rename, rm, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {advanceTraffic,newTraffic,trafficTick,trafficView,validTraffic} from '../dist/civilian-traffic.mjs';

export async function createTrafficService({dir,clock=Date.now,pollMs=2000,onError=(error)=>console.error('Civilian traffic:',error.message)}={}){
  if(!dir) throw Error('Traffic state directory is required.');
  await mkdir(dir,{recursive:true});
  const file=join(dir,'civilian-traffic.json');
  let state, pending, lastError;
  try{
    const saved=JSON.parse(await readFile(file,'utf8'));
    if(!validTraffic(saved))throw Error('Invalid civilian traffic checkpoint.');
    state=saved;
  }catch(error){if(error.code!=='ENOENT')throw error;}
  const write=async(next)=>{
    const temp=file+'.'+randomUUID()+'.tmp';
    try{
      await writeFile(temp,JSON.stringify(next),{mode:0o600,flush:true});
      await rename(temp,file);
    }finally{await rm(temp,{force:true}).catch(()=>{});}
    state=next;lastError=undefined;
  };
  const refresh=()=>{
    const target=trafficTick(clock());
    if(pending)return pending;
    if(!state||target>state.tick||lastError){
      pending=(async()=>{
        try{await write(state?advanceTraffic(structuredClone(state),target):newTraffic(target));}
        catch(error){lastError=error;throw error;}
        finally{pending=undefined;}
      })();
      return pending;
    }
  };
  await refresh();
  const timer=pollMs>0?setInterval(()=>{refresh()?.catch(onError);},pollMs):null;
  timer?.unref();
  const handle=async(req,res)=>{
    if(new URL(req.url,'http://localhost').pathname!=='/api/traffic')return false;
    const base={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,{...base,Allow:'GET, HEAD'}).end();return true;}
    try{
      await refresh();
      const now=clock();
      res.writeHead(200,base).end(req.method==='HEAD'?undefined:JSON.stringify({
        mode:'shared',serverTime:now,...trafficView(state,trafficTick(now))
      }));
    }catch{
      res.writeHead(503,base).end(req.method==='HEAD'?undefined:JSON.stringify({error:'Traffic state unavailable.'}));
    }
    return true;
  };
  return {handle,refresh,close(){if(timer)clearInterval(timer);}};
}

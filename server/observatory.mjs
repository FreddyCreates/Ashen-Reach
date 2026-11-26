// Run as a single writer with STATE_DIR on a persistent volume.
import {createServer} from 'node:http';
import {mkdir,writeFile,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {cycle,frontier,world} from '../dist/universe.mjs';
const dir=process.env.STATE_DIR||'./state';await mkdir(dir,{recursive:true});
let current;async function advance(){
 const tick=cycle();if(current?.tick===tick)return;
 const snapshot={tick,count:frontier(tick),updatedAt:new Date().toISOString()};
 const file=join(dir,'frontier.json');await writeFile(file+'.tmp',JSON.stringify(snapshot));await rename(file+'.tmp',file);current=snapshot;
}
await advance();let busy=false;
setInterval(async()=>{if(busy)return;busy=true;try{await advance()}catch(e){console.error(e.message)}finally{busy=false}},1000);
createServer((req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;let data;
 if(path==='/api/frontier')data=current;
 else if(/^\/api\/worlds\/\d+$/.test(path)){const id=Number(path.split('/').at(-1));if(id<current.count)data=world(id,current.tick)}
 res.writeHead(data?200:404,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data||{error:'Unknown world'}))
}).listen(Number(process.env.PORT)||8080);

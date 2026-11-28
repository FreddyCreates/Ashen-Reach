import {cycle, epoch, frontier, world} from './universe.mjs';

export const trafficInterval = 30_000;
export const trafficSchema = 1;
const maxLog = 32;
const commodities = Object.freeze(['ore', 'provisions', 'parts']);
const profiles = Object.freeze([
  Object.freeze({id:'iren-voss', name:'Iren Voss', ship:'Second Dawn', role:'Freighter', home:0, goods:'ore',
    story:'The salvage captain who rebuilt her mother’s freighter is paying off its last refit one shipment at a time.'}),
  Object.freeze({id:'amal-reed', name:'Amal Reed', ship:'Lantern Post', role:'Relief pilot', home:1, goods:'provisions',
    story:'After the Nacre storm cut his settlement off for a week, Amal started running provisions to the lowest-stock outposts.'}),
  Object.freeze({id:'mara-isin', name:'Mara Isin', ship:'Fine Signal', role:'Survey pilot', home:2, goods:null,
    story:'Mara maps the channels where her mentor vanished, leaving better route notes for the pilots who follow.'}),
  Object.freeze({id:'sol-wren', name:'Sol Wren', ship:'Far Meridian', role:'Patrol pilot', home:3, goods:null,
    story:'A former convoy escort, Sol keeps checking civilian routes after his squadron was disbanded.'}),
  Object.freeze({id:'tavi-chen', name:'Tavi Chen', ship:'Copper Finch', role:'Freighter', home:1, goods:'parts',
    story:'Tavi is trying to reopen a family workshop by taking the maintenance runs that larger carriers overlook.'}),
  Object.freeze({id:'nuri-vale', name:'Nuri Vale', ship:'Wakesong', role:'Survey pilot', home:0, goods:null,
    story:'Nuri is recording an independent atlas and avoids repeating surveyed destinations when a new route can be mapped.'}),
]);

export function trafficTick(time=Date.now()){
  return Number.isFinite(time)?Math.max(0,Math.floor((time-epoch)/trafficInterval)):0;
}
function frontierAt(tick){return frontier(cycle(epoch+tick*trafficInterval))}
function worldName(id,tick){return world(id,cycle(epoch+tick*trafficInterval)).name}
function laneWorlds(home,tick){
  const max=frontierAt(tick);
  const base=home-home%4;
  return [base,base+1,base+2,base+3].filter(id=>id<max);
}
function market(id){
  const stock=Object.fromEntries(commodities.map((good,index)=>[good,9+((id*53+index*47+11)%13)]));
  const abundant=commodities[id%commodities.length];
  stock[abundant]+=18;
  return {world:id,stock,produced:0,consumed:0};
}
function dock(id){return {phase:'dock',world:id,readyAt:0}}
function addEvent(state,pilot,kind,details){
  const event={id:++state.sequence,tick:state.tick,pilot:pilot.id,kind,...details};
  state.events.push(event);
  if(state.events.length>maxLog)state.events.splice(0,state.events.length-maxLog);
  pilot.lastEvent=event;
}
function refreshMarkets(state){
  for(const m of state.markets){
    const commodity=commodities[m.world%commodities.length];
    if((state.tick+m.world)%4===0&&m.stock[commodity]<40){
      m.stock[commodity]+=2;m.produced+=2;
    }
    const demand=commodities[(m.world+1)%commodities.length];
    if((state.tick+m.world)%3===0&&m.stock[demand]>1){
      m.stock[demand]--;m.consumed++;
    }
  }
}
function chooseRoute(state,pilot,profile){
  // Keep the first roster within one canonical four-body navigation system.
  const options=laneWorlds(profile.home,state.tick).filter(id=>id!==pilot.position.world);
  if(!options.length)return null;
  if(profile.goods){
    const good=profile.goods;
    const here=state.markets[pilot.position.world];
    const quantity=Math.min(5,Math.max(0,here.stock[good]-5));
    const ranked=options.map(to=>({to,need:Math.max(0,23-state.markets[to].stock[good])}))
      .sort((a,b)=>b.need-a.need||a.to-b.to);
    if(quantity&&ranked[0].need>=2)
      return {to:ranked[0].to,cargo:{good,units:Math.min(quantity,ranked[0].need)},intent:'deliver'};
    // Reposition to a better supplier before offering another freight run.
    const supplier=options.slice().sort((a,b)=>state.markets[b].stock[good]-state.markets[a].stock[good]||a-b)[0];
    return {to:supplier,cargo:null,intent:'restock'};
  }
  const to=options.slice().sort((a,b)=>(pilot.visits[a]??0)-(pilot.visits[b]??0)||a-b)[0];
  return {to,cargo:null,intent:profile.role==='Survey pilot'?'survey':'patrol'};
}
function step(state){
  state.tick++;
  refreshMarkets(state);
  for(const pilot of state.pilots){
    const profile=profiles.find(candidate=>candidate.id===pilot.id);
    const pos=pilot.position;
    if(pos.phase==='flight'){
      if(pos.arrivalTick>state.tick)continue;
      pilot.position={phase:'dock',world:pos.to,readyAt:state.tick+1};
      pilot.visits[pos.to]=(pilot.visits[pos.to]??0)+1;
      if(pos.cargo){
        state.markets[pos.to].stock[pos.cargo.good]+=pos.cargo.units;
        pilot.delivered+=pos.cargo.units;
        addEvent(state,pilot,'delivered',{from:pos.from,to:pos.to,cargo:pos.cargo});
      }else{
        if(pos.intent==='survey')pilot.surveys++;
        if(pos.intent==='patrol')pilot.patrols++;
        addEvent(state,pilot,pos.intent==='restock'?'repositioned':pos.intent==='survey'?'surveyed':'patrolled',{from:pos.from,to:pos.to});
      }
    }else if(pos.readyAt<=state.tick){
      const route=chooseRoute(state,pilot,profile);
      if(!route)continue;
      if(route.cargo)state.markets[pos.world].stock[route.cargo.good]-=route.cargo.units;
      const duration=3+Math.abs(pos.world-route.to);
      pilot.position={phase:'flight',from:pos.world,to:route.to,departureTick:state.tick,arrivalTick:state.tick+duration,cargo:route.cargo,intent:route.intent};
      addEvent(state,pilot,'departed',{from:pos.world,to:route.to,cargo:route.cargo,intent:route.intent});
    }
  }
}

export function newTraffic(targetTick=trafficTick()){
  const t=Number.isSafeInteger(targetTick)&&targetTick>=0?targetTick:0;
  // A new world checkpoint begins at a bounded reconstruction window.
  const start=Math.max(0,t-6);
  const state={schema:trafficSchema,tick:start,sequence:0,markets:[0,1,2,3].map(market),events:[],
    pilots:profiles.map((profile,i)=>({id:profile.id,position:{...dock(profile.home),readyAt:start+i%3},visits:{},delivered:0,surveys:0,patrols:0,lastEvent:null}))};
  return advanceTraffic(state,t);
}

function isCount(v){return Number.isSafeInteger(v)&&v>=0}
const intents=['deliver','restock','survey','patrol'];
function validWorld(id){return isCount(id)&&id<4}
function validCargo(c){return c===null||c&&commodities.includes(c.good)&&isCount(c.units)&&c.units>0&&c.units<=5}
function validEvent(e,tick,sequence){
  return e&&profiles.some(p=>p.id===e.pilot)&&isCount(e.id)&&e.id>0&&e.id<=sequence&&isCount(e.tick)&&e.tick<=tick&&
    validWorld(e.from)&&validWorld(e.to)&&e.from!==e.to&&
    ((e.kind==='departed'&&intents.includes(e.intent)&&validCargo(e.cargo)&&(e.intent==='deliver')===Boolean(e.cargo))||
    (e.kind==='delivered'&&e.cargo!==null&&validCargo(e.cargo))||['repositioned','surveyed','patrolled'].includes(e.kind));
}
export function validTraffic(state){
  if(!state||state.schema!==trafficSchema||!isCount(state.tick)||!isCount(state.sequence)||
    !Array.isArray(state.markets)||state.markets.length!==4||!Array.isArray(state.pilots)||state.pilots.length!==profiles.length||
    !Array.isArray(state.events)||state.events.length>maxLog) return false;
  if(!state.markets.every((m,i)=>m&&m.world===i&&isCount(m.produced)&&isCount(m.consumed)&&commodities.every(g=>isCount(m.stock?.[g]))))return false;
  if(!state.events.every((e,i)=>validEvent(e,state.tick,state.sequence)&&(i===0||state.events[i-1].id<e.id)))return false;
  if((state.events.at(-1)?.id??0)!==state.sequence)return false;
  return state.pilots.every((p,i)=>{
    if(!p||p.id!==profiles[i].id||!p.visits||!Object.entries(p.visits).every(([k,v])=>String(Number(k))===k&&validWorld(Number(k))&&isCount(v))||
      ![p.delivered,p.surveys,p.patrols].every(isCount)||(p.lastEvent!==null&&(!validEvent(p.lastEvent,state.tick,state.sequence)||p.lastEvent.pilot!==p.id)))return false;
    const position=p.position;
    if(position?.phase==='dock')return validWorld(position.world)&&isCount(position.readyAt)&&position.readyAt<=state.tick+2;
    return position?.phase==='flight'&&validWorld(position.from)&&validWorld(position.to)&&position.from!==position.to&&
      isCount(position.departureTick)&&position.departureTick<=state.tick&&isCount(position.arrivalTick)&&position.arrivalTick>state.tick&&
      position.arrivalTick-position.departureTick===3+Math.abs(position.from-position.to)&&
      intents.includes(position.intent)&&validCargo(position.cargo)&&(position.intent==='deliver')===Boolean(position.cargo);
  });
}

export function advanceTraffic(state,targetTick,maxSteps=120){
  if(!Number.isSafeInteger(targetTick)||targetTick<=state.tick)return state;
  const budget=Number.isInteger(maxSteps)?Math.min(120,Math.max(0,maxSteps)):120;
  const stop=Math.min(targetTick,state.tick+budget);
  while(state.tick<stop)step(state);
  return state;
}

export function trafficView(state,targetTick=state.tick){
  return {schema:trafficSchema,tick:state.tick, tickAt:epoch+state.tick*trafficInterval, interval:trafficInterval,
    catchingUp:state.tick<targetTick,
    worlds:state.markets.map(m=>({...m,name:worldName(m.world,state.tick)})),
    pilots:state.pilots.map((p,i)=>({...p,...profiles[i]})),
    events:state.events.slice(-14)};
}

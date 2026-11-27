import {landingEntries} from './landing-atlas.mjs';
import {morrowAnchorage,portDistance,portBearing,trackPort,berthAvailable,recordBerthVisit} from './planetary-port.mjs';
import {stationFor,stationDistance,stationBearing,buildStation,serviceAvailable,serviceHull,serviceRack} from './field-station.mjs';
import {restoreCampaign,episode,acceptSignal,fitRepeater,blockadeActive,clearBlockade,broadcast,factions,salePremium,spiritCooldown} from './campaign.mjs';
import {boardNavigator,assignLanding,checkpoint,resumeLanding,relieveNavigator,advanceLanding} from './crew-operations.mjs';
import {newJourney,travel,drawJourney,relief} from './deep-flight.mjs';
import {newLedger,extract,capacity,quote,resources,sell,upgrade} from './mining.mjs';
import {loadCrew,recordCrew,pilot} from './crew.mjs';
import {createSurvey,advanceSurvey,surveyStatus} from './survey.mjs';
import {createTrajectory,stepTrajectory,orbitReadout,showTrajectory} from './orbital-flight.mjs';
import {openFreeport} from './freeroam.mjs';
import {ships,world,cycle,frontier} from './universe.mjs';
import {render} from './space-view.mjs';
const $=id=>document.getElementById(id),key='ashen-reach.captain.v1';
let save={ship:0,sector:0,claims:[]};
try{const v=JSON.parse(localStorage.getItem(key));if(v&&ships[v.ship]&&Number.isSafeInteger(v.sector)&&v.sector>=0&&Array.isArray(v.claims))save={ship:v.ship,sector:v.sector,claims:v.claims.filter(Number.isSafeInteger)}}catch{}
function persist(){try{localStorage.setItem(key,JSON.stringify(save))}catch{tell('Storage unavailable. This voyage lasts for this session.')}}
let tick=cycle(),sector=Math.min(save.sector,frontier(tick)-1),g={impacts:[],ship:save.ship,mode:'hangar',world:world(sector,tick),x:0,z:2,bank:0,spirit:0,enemies:[],shots:[],hp:ships[save.ship].hull};
let keys=new Set(),axis=[0,0],finger=null,overlay=true,fire=0,recharge=0,enemyFire=1,spiritFire=0,clock=0,notice=0,page=0;
function tell(msg){$('feedback').textContent=msg;notice=3}
function button(label,fn,parent){const b=document.createElement('button');b.textContent=label;b.onclick=fn;parent.append(b);return b}
function stop(){keys.clear();axis=[0,0];finger=null;$('stick').firstElementChild.style.transform=''}
function panel(title,body,options){stop();$('panel').classList.remove('fleet-selector','campaign-brief');$('panel').querySelector('small').textContent='SPIRIT FLEET';$('feedback').textContent='';overlay=true;$('panel').hidden=false;$('controls').hidden=true;$('heading').textContent=title;$('body').textContent=body;$('choices').replaceChildren();for(const [label,fn] of options)button(label,fn,$('choices'))}
const hullNotes=[
 'Swept wings and twin drives keep this interceptor light on its feet.',
 'Broad engine nacelles and layered armor give the frigate its heavy profile.',
 'Forward-swept vanes frame the cutter’s resonator. Its spirit recharges in thirteen seconds.'
];
function hangar(){
 g.mode='hangar';g.enemies=[];g.shots=[];g.spirit=0;
 const ship=ships[g.ship];
 panel(ship.name,hullNotes[g.ship],[]);
 $('panel').classList.add('fleet-selector');
 $('panel').querySelector('small').textContent=ship.role.toUpperCase();
 const pick=document.createElement('div');pick.className='hull-list';pick.setAttribute('aria-label','Choose a ship');
 for(const [i,hull] of ships.entries()){
  const item=button(hull.name,()=>{g.ship=i;hangar()},pick);
  item.setAttribute('aria-pressed',String(i===g.ship));item.style.setProperty('--livery',hull.color)
 }
 $('choices').append(pick);
 const row=document.createElement('div');row.className='launch-row';const stats=document.createElement('span');
 stats.textContent=ship.hull+' hull  /  '+ship.speed+' flight speed';row.append(stats);
 button('Board '+ship.name,()=>{save.ship=g.ship;persist();g.hp=ship.hull;deck()},row);$('choices').append(row)
}
function unpause(){stop();overlay=false;$('panel').hidden=true;$('controls').hidden=false;actions()}
function deck(){g.yaw=0;g.pitch=-.02;g.mode='deck';boardNavigator(g.crew,g.ship);receipt('Boarded vessel');g.x=0;g.z=4;g.shots=[];g.enemies=[];g.spirit=0;unpause();tell('Walk forward to the illuminated helm.')}
function launch(){
 if(!g.journey||g.journey.body.id!==sector){
  const restored=resumeLanding(g.crew,g.ship,sector);
  if(!restored&&g.crew.duty==='helm'){relieveNavigator(g.crew);receipt('Flight order released after system change')}
  g.journey=restored||newJourney(sector);
 }
 g.mode='journey';unpause();tell('Push forward to approach. Steer to explore. Hold Climb to lift off.');
}
function selectDestination(){
 const s=g.journey;
 panel('Flight computer','Select a bearing. Hold forward to engage the cruise drive.',[
 ...s.system.map(b=>[b.name,()=>{takeHelm();s.target=b;s.aim=true;unpause()}]),['Manual steering',()=>{takeHelm();s.aim=false;unpause()}]])
}
function patrol(){previousFlight=null;g.blockadeLink=false;g.impacts=[];g.mode='flight';g.x=0;g.z=4;g.shots=[];g.spirit=0;fire=0;enemyFire=2;
 g.enemies=save.claims.includes(sector)&&!blockadeActive(ledger,sector)?[]:Array.from({length:Math.min(5,2+sector%4)},(_,i)=>({x:(i-1)*3,z:-7-i*1.6,base:-7-i*1.6,hp:3,phase:i*2}));
 unpause();tell(g.enemies.length?'Hostile patrol ahead. Align your ship and fire.':'Friendly orbit. Open the chart to travel.')}
function chart(){const count=frontier(tick);page=Math.max(0,Math.min(page,Math.floor((count-1)/4)));const opts=[];for(let i=page*4;i<Math.min(count,page*4+4);i++){const w=world(i,tick);opts.push([w.name+(save.claims.includes(i)?' · claimed':''),()=>inspect(i)])}if(page>0)opts.push(['Previous',()=>{page--;chart()}]);if(page*4+4<count)opts.push(['Next',()=>{page++;chart()}]);opts.push(['Return',unpause]);panel('Star chart',count+' charted worlds · New frontier every eight colony cycles.',opts)}
function inspect(i){const w=world(i,tick);panel(w.name,w.governor+' oversees '+w.population+' settlers, '+w.buildings[0]+' habitats, '+w.buildings[1]+' reactors and '+w.buildings[2]+' shipyards. Next project: '+w.next+'.',[[i===sector?'Enter orbit':'Jump to orbit',()=>{save.sector=sector=i;g.world=w;persist();launch()}],['Star chart',chart]])}
const crewStorage={getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v)};
g.crew=loadCrew(crewStorage);
let crewCheckpointAge=0;
function saveCrewPose(){
 if(g.mode!=='journey'||g.crew.duty!=='helm')return;
 checkpoint(g.crew,g.journey);
 try{crewStorage.setItem('ashen-reach.navigator.v1',JSON.stringify(g.crew))}catch{}
}
window.addEventListener('pagehide',saveCrewPose);
document.addEventListener('visibilitychange',()=>{if(document.hidden)saveCrewPose()});
let ledger=newLedger();
try{const l=JSON.parse(localStorage.getItem('ashen.mining.v1'));if(l&&Array.isArray(l.ore)&&l.ore.length===4&&l.mined)ledger=l}catch{}
ledger.campaign=restoreCampaign(ledger.campaign);
function transact(op){const message=op();try{localStorage.setItem('ashen.mining.v1',JSON.stringify(ledger))}catch{return message+' Storage unavailable.'}return message}
function harvest(){
 if(!g.survey?.lastSample)return tell('Fly through a survey beacon below 160 m to locate a deposit.');
 const p=g.survey.lastSample;
 if(Math.hypot(g.survey.x-p.x,g.survey.z-p.z)>145||g.survey.clearance>160)return tell('Return within 145 m of the scanned deposit below 160 m.');
 tell(transact(()=>extract(ledger,sector,p.id)))
}
function fieldStation(message=''){
 const flight=g.mode==='journey'?g.journey:null;
 const station=stationFor(ledger,sector);
 const choices=[];
 let status='Land on solid terrain with 4 ferrite in the hold to assemble a field station.';
 if(station){
  const body=(flight||newJourney(sector)).body;
  const local=body.center.clone().fromArray(station.position).sub(body.center).normalize();
  const metres=stationDistance(station,flight);
  status=g.world.name+' field station · '+(Math.asin(local.y)*180/Math.PI).toFixed(4)+'° lat, '+(Math.atan2(local.z,local.x)*180/Math.PI).toFixed(4)+'° lon.';
  if(flight)choices.push([flight.trackStation?'Clear station bearing':'Track station bearing',()=>{flight.trackStation=!flight.trackStation;unpause()}]);
  if(Number.isFinite(metres))status+=' Range '+(metres<1000?Math.round(metres)+' m':Math.round(metres/1000)+' km')+'.';
  if(serviceAvailable(ledger,flight)){
   choices.push(['Repair hull',()=>fieldStation(serviceHull(ledger,flight,g,ships[g.ship].hull))]);
   if(ledger.rack<4)choices.push(['Fit cargo rack · '+45*(ledger.rack+1)+' cr',()=>fieldStation(transact(()=>serviceRack(ledger,flight)))]);
  }else status+=' Land within 65 m to use station services.';
 }else if(flight)choices.push(['Build station · 4 ferrite',()=>fieldStation(transact(()=>buildStation(ledger,flight,relief)))]);
 choices.push(['Free flight',launch],['Bridge',bridge]);
 panel('Field station',message+' '+status+' Ferrite aboard: '+ledger.ore[0]+'.',choices)
}
function campaignLog(){
 const chapter=episode(ledger),options=[];
 if(chapter.stage==='signal')options.push(['Trace the convoy signal',()=>{
  transact(()=>acceptSignal(ledger));receipt('Accepted the Nine Lanterns call');campaignLog()
 }]);
 if(chapter.stage==='repeater'){
  options.push(['Plot Aurelia',()=>inspect(0)],['Plot Nacre',()=>inspect(1)]);
  if(sector===1)options.push(['Enter Nacre freeport',freeport]);
 }
 if(chapter.stage==='blockade')options.push(sector===3?['Enter Orison blockade',patrol]:['Plot Orison',()=>inspect(3)]);
 if(chapter.stage==='broadcast')for(const ally of factions){
  const label=ally==='Lantern Guild'?'Guild · Nacre ferrite +3 cr/unit':'Wakekeepers · spirit cooldown −4 s';
  options.push([label,()=>{transact(()=>broadcast(ledger,ally));receipt('Entrusted the beacon to '+ally);campaignLog()}])
 }
 panel(chapter.title,chapter.body,[...options,['Bridge',bridge]]);
 const briefing=$('panel');briefing.classList.add('campaign-brief');
 briefing.querySelector('small').textContent='THE CHOIR LINE  /  SHIP LOG';
 const route=document.createElement('ol');route.className='convoy-route';route.setAttribute('aria-label','Convoy route');
 const phases=['signal','repeater','blockade','broadcast','complete'];
 for(const [index,name] of ['Distress call','Nacre relay','Orison blockade','Broadcast'].entries()){
  const step=document.createElement('li');step.textContent=name;
  const progress=phases.indexOf(chapter.stage);
  if(index<progress)step.className='completed';
  if(index===progress)step.setAttribute('aria-current','step');
  route.append(step)
 }
 $('choices').prepend(route)
}
function exchange(message=''){
 const buttons=resources.flatMap((r,i)=>{
  if(!ledger.ore[i])return [];
  const premium=salePremium(ledger,i,sector);
  return [['Sell '+ledger.ore[i]+' '+r+' · '+(quote(i,sector)+premium)+' cr/unit',()=>exchange(transact(()=>{
   const extra=ledger.ore[i]*premium,base=sell(ledger,i,sector);ledger.credits+=extra;
   return base+(extra?' Guild premium: '+extra+' credits.':'')
  }))]]
 });
 if(ledger.campaign.stage==='repeater'&&sector===1)buttons.unshift(['Fit convoy repeater · 4 ferrite',()=>exchange(transact(()=>fitRepeater(ledger,sector)))]);
 if(ledger.rack<4)buttons.push(['Fit cargo rack · '+45*(ledger.rack+1)+' cr',()=>exchange(transact(()=>upgrade(ledger)))]);
 panel(g.world.name+' exchange',message+' Trade credits '+ledger.credits+' · Hold '+ledger.ore.join(' / ')+' · Capacity '+capacity(ledger),[...buttons,['Return to district',openDistrict],['Bridge',bridge]])
}
function receipt(event){recordCrew(g.crew,crewStorage,event,g.world.name,ships[g.ship].name)}
function crewStation(){
 const c=g.crew;
 const last=c.landings && c.landings[c.landings.length-1];
 const observation=last?' Last landing: '+world(last.world,tick).name+', '+(last.latitude*180/Math.PI).toFixed(2)+'° lat, '+(last.longitude*180/Math.PI).toFixed(2)+'° lon.':'';
 const history=c.log.slice(-3).map(e=>e.event+' · '+e.world).join(' / ');
 panel('Astra · navigator','Crew '+c.id.slice(0,8)+' · '+c.visits+' completed scans. '+observation+' '+history,[
 ['Command a landing',orderLanding],['Landing atlas',landingAtlas],
 ['Assign survey pilot',()=>{relieveNavigator(c);c.duty='survey';receipt('Accepted survey command');survey()}],
 ['Relieve pilot',()=>{relieveNavigator(c);receipt('Returned manual control');unpause()}],['Bridge',bridge]])
}
function takeHelm(){
 if(g.crew.duty==='helm'){relieveNavigator(g.crew);receipt('Captain took the helm')}
}
function landingAtlas(){
 const j=g.mode==='journey'?g.journey:null;
 const r=j?.p.clone().sub(j.body.center);
 const here=r?{world:j.body.id,longitude:Math.atan2(r.z,r.x),latitude:Math.asin(r.y/r.length()),radius:j.body.r}:null;
 const entries=landingEntries(g.crew,here);
 const rows=entries.map(e=>{
  const distance=e.distance===null?'':' · '+(e.distance/1000).toFixed(1)+' km along surface';
  return '#'+e.beat+'  '+world(e.world,tick).name+' · '+ships[e.hull].name+' · '+(e.latitude*180/Math.PI).toFixed(2)+'°, '+(e.longitude*180/Math.PI).toFixed(2)+'°'+distance
 });
 panel('Landing atlas',rows.length?rows.join('\n'):'Assign Astra a landing to record the world, hull and surface coordinates.',[['Crew station',crewStation],['Bridge',bridge]]);
 $('body').style.whiteSpace='pre-line';
}
function orderLanding(){
 launch();
 const flight=g.journey;
 panel('Astra · flight order','Choose a destination. Astra will take the helm, fly the approach and record the landing. Move the stick to take control.',[
 ...flight.system.map(body=>[body.name,()=>{
  assignLanding(g.crew,flight,g.ship,body.id);crewCheckpointAge=0;
  receipt('Took helm for '+body.name);unpause();tell('Astra has the helm for '+body.name+'.')
 }]),['Bridge',bridge]])
}
let districtOpen=false,previousFlight=null;
function rememberOrbit(){
 if(g.mode==='flight')previousFlight={worldId:g.world.id,x:g.x,z:g.z,enemies:g.enemies,shots:g.shots,impacts:g.impacts,spirit:g.spirit}
}
function survey(){
 rememberOrbit();g.mode='survey';g.survey=createSurvey(g.world.id,g.ship);unpause();
 tell('Steer with the stick. Hold climb or descend to change clearance.')
}
function transfer(){
 rememberOrbit();g.mode='navigation';g.trajectory=createTrajectory(g.world,g.ship);unpause();
 tell('Forward burns prograde. Back lowers your orbit. Left and right apply radial thrust.')
}
function returnFlight(){
 if(previousFlight?.worldId===g.world.id){
  Object.assign(g,previousFlight);previousFlight=null;g.mode='flight';unpause()
 }else launch()
}
function openDistrict(){
 if(districtOpen)return;stop();districtOpen=true;overlay=true;
 $('panel').hidden=true;$('controls').hidden=true;
 try{openFreeport({worldId:g.world.id,shipId:g.ship,onExchange:()=>{districtOpen=false;exchange()},onExit:()=>{districtOpen=false;bridge()}})}
 catch(error){districtOpen=false;bridge();tell('Freeport could not open.');console.error(error)}
}
function planetaryPort(message=''){
 launch();
 const flight=g.journey,port=morrowAnchorage(flight.body,relief);
 if(!port){
  panel('Planetary ports','Morrow Works is anchored on Aurelia. Other geographic harbors are still being charted.',[
   ['Plot Aurelia',()=>inspect(0)],['Bridge',bridge]])
  return
 }
 const distance=portDistance(port,flight),visits=ledger.portVisits?.[port.id]?.visits||0;
 const range=distance<1000?Math.round(distance)+' m':Math.round(distance/1000)+' km';
 const choices=[];
 if(berthAvailable(port,flight)){
  choices.push(['Dock at Morrow Works',()=>{
   const result=transact(()=>recordBerthVisit(ledger,port));
   receipt('Docked at Morrow Works');tell(result);openDistrict()
  }])
 }
 choices.push([flight.trackPort?'Release berth approach':'Approach Morrow berth',()=>{
  flight.trackPort=!flight.trackPort;
  if(flight.trackPort)trackPort(port,flight);
  else{delete flight.waypoint;flight.aim=false}
  unpause()
 }],['Free flight',launch],['Bridge',bridge]);
 const instruction=berthAvailable(port,flight)
  ?'Landing envelope confirmed. The berth is ready to receive this hull.'
  :'Follow the berth marker, settle below 12 m and reduce speed below 35 m/s inside the 90 m envelope.';
 panel(port.name,message+' '+instruction+' Range '+range+' · recorded arrivals '+visits+'.',choices)
}
function freeport(){
 if(sector===0){planetaryPort();return}
 openDistrict()
}
function bridge(){
 if(g.mode==='hangar'){hangar();return}
 panel(ships[g.ship].name+' bridge',g.world.name+' · '+save.claims.length+' claimed worlds on this device.',[
 ['Resume',unpause],['The Choir Line',campaignLog],['Free flight',launch],['Combat patrol',patrol],['Crew station',crewStation],['Field station',()=>fieldStation()],['Orbital navigation',transfer],['Surface survey',survey],[sector===0?'Planetary port':'Enter freeport',sector===0?planetaryPort:openDistrict],['Star chart',chart],['Walk the deck',deck],['Change ship',hangar]])
}
function summon(){if(recharge>0){tell('Spirit returns in '+Math.ceil(recharge)+'s');return}g.spirit=8;recharge=spiritCooldown(ledger,g.ship===2?13:21);spiritFire=0;if(g.enemies.length&&blockadeActive(ledger,sector)){g.blockadeLink=true;tell('Nine Lanterns identified. Clear the blockade.')}else tell('Your spirit has joined the battle.')}
function interact(){if(g.mode==='journey'){selectDestination();return}if(g.mode==='survey'||g.mode==='navigation'){returnFlight();return}if(g.mode==='deck'){if(g.z>-4){tell('Approach the forward helm.');return}launch();return}if(g.enemies.length){tell('Clear the orbital patrol first.');return}if(!save.claims.includes(sector)){save.claims.push(sector);persist();tell(g.world.name+' claimed. Fleet repaired.');g.hp=ships[g.ship].hull;actions()}else chart()}
function actions(){const a=$('actions');a.replaceChildren();if(g.mode==='journey'){
 for(const [label,key] of [['Climb','u'],['Descend','j'],['Pitch up','i'],['Pitch down','k']]){
 const b=button(label,()=>{},a);b.onpointerdown=e=>{b.setPointerCapture(e.pointerId);keys.add(key)};b.onlostpointercapture=()=>keys.delete(key)
 }
 button('Extract',()=>{
 const s=g.journey;if(s.alt>30)return tell('Descend below 30 metres to collect local resources.');
 const local=s.p.clone().sub(s.body.center);
 const site='field/'+local.toArray().map(v=>Math.floor(v/250)).join('/');
 tell(transact(()=>extract(ledger,sector,site)))
 },a);if(sector===0)button('Port',planetaryPort,a);button('Bearing',selectDestination,a);button(g.journey.cruise?'Cruise assist':'Newtonian',()=>{takeHelm();g.journey.cruise=!g.journey.cruise;actions()},a);return
 }if(g.mode==='navigation'){
 button('Time ×'+g.trajectory.warp,()=>{g.trajectory.warp=g.trajectory.warp===20?100:g.trajectory.warp===100?1:20;actions()},a);
 button('Descend',survey,a);button('Freeport',freeport,a);button('Patrol',patrol,a);return
 }if(g.mode==='survey'){
 for(const [label,key] of [['Climb','u'],['Descend','j']]){
 const b=button(label,()=>{},a);b.onpointerdown=e=>{b.setPointerCapture(e.pointerId);keys.add(key)};b.onlostpointercapture=()=>keys.delete(key)
 }
 button('Extract',harvest,a);button('Return to orbit',returnFlight,a);return
 }if(g.mode==='deck'){button('Take helm',interact,a);button('The Choir Line',campaignLog,a);button('Chart',chart,a)}else{const b=button('Fire',()=>{if(!overlay)shoot()},a);b.onpointerdown=e=>{b.setPointerCapture(e.pointerId);keys.add('fire')};b.onlostpointercapture=()=>keys.delete('fire');button('Spirit',summon,a);button(save.claims.includes(sector)?'Chart':'Claim',interact,a)}}
function shoot(){if(fire>0)return;fire=ships[g.ship].fire;g.shots.push({x:g.x,z:g.z-1,dx:0,dz:-23,enemy:false})}
function update(dt){clock+=dt;notice-=dt;if(notice<=0&&$('feedback').textContent)$('feedback').textContent='';const now=cycle();if(now!==tick){tick=now;g.world=world(sector,tick)}
 if(overlay)return;const x=axis[0]+Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),z=axis[1]+Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup')),mag=Math.max(1,Math.hypot(x,z)),speed=g.mode==='deck'?3.8:ships[g.ship].speed;
 if(g.mode==='journey'){
 const s=g.journey;if(x||keys.has('i')||keys.has('k'))s.aim=false;
 const manual={turn:x/mag,drive:-z/mag,pitch:Number(keys.has('i'))-Number(keys.has('k')),lift:Number(keys.has('u'))-Number(keys.has('j'))};
 if(g.crew.duty==='helm'&&Object.values(manual).some(Boolean)){takeHelm();s.aim=false}
 if(g.crew.duty==='helm'){
  const event=advanceLanding(g.crew,s,dt);
  crewCheckpointAge+=dt;
  if(event){recordCrew(g.crew,crewStorage,event,s.body.name,ships[g.ship].name);tell(event)}
  else if(crewCheckpointAge>=3||s.body.id!==sector){saveCrewPose();crewCheckpointAge=0}
 }else travel(s,dt,manual);
 if(sector!==s.body.id){sector=save.sector=s.body.id;g.world=world(sector,tick);persist()}return
 }
 const yaw=g.mode==='deck'?g.yaw:0,mx=Math.cos(yaw)*x+Math.sin(yaw)*z,mz=-Math.sin(yaw)*x+Math.cos(yaw)*z;
 if(g.mode==='survey'){const manual={turn:x/mag,throttle:-z/mag,lift:Number(keys.has('u'))-Number(keys.has('j'))};
 if(g.crew.duty==='survey'&&(x||z||manual.lift)){g.crew.duty='standby';receipt('Manual override')}
 const count=g.survey.scans,site=g.survey.site;advanceSurvey(g.survey,dt,g.crew.duty==='survey'?pilot(g.survey):manual);
 if(g.survey.scans>count){g.survey.lastSample={...site,id:count};if(g.crew.duty==='survey')harvest();if(g.crew.duty==='survey')g.crew.visits++;receipt('Survey logged')}return}
 if(g.mode==='navigation'){if(stepTrajectory(g.trajectory,dt*g.trajectory.warp,x/mag,-z/mag)==='entry')survey();return}
 g.bank=x/mag;const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));g.x=clamp(g.x+mx/mag*dt*speed,g.mode==='deck'?-2.4:-9,g.mode==='deck'?2.4:9);g.z=clamp(g.z+mz/mag*dt*speed,g.mode==='deck'?-6.6:-5,7);
 if(g.mode==='deck')return;g.impacts=g.impacts.filter(f=>(f.life-=dt)>0);fire-=dt;recharge=Math.max(0,recharge-dt);g.spirit=Math.max(0,g.spirit-dt);spiritFire-=dt;enemyFire-=dt;
 if(keys.has('fire')||keys.has(' '))shoot();
 for(const e of g.enemies){e.x+=Math.cos(clock+e.phase)*dt*1.6;e.z=e.base+Math.sin(clock*.5+e.phase)*.7}
 if(g.enemies.length&&enemyFire<=0){enemyFire=1.6;const e=g.enemies[Math.floor(clock)%g.enemies.length],d=Math.hypot(g.x-e.x,g.z-e.z)||1;g.shots.push({x:e.x,z:e.z,dx:(g.x-e.x)/d*7,dz:(g.z-e.z)/d*7,enemy:true})}
 if(g.spirit>0&&spiritFire<=0&&g.enemies.length){spiritFire=.8;const e=g.enemies[0],x=g.x+1.9,d=Math.hypot(e.x-x,e.z-g.z)||1;g.shots.push({x,z:g.z,dx:(e.x-x)/d*21,dz:(e.z-g.z)/d*21,enemy:false})}
 g.shots=g.shots.filter(b=>{b.x+=b.dx*dt;b.z+=b.dz*dt;if(b.enemy&&Math.hypot(b.x-g.x,b.z-g.z)<1){g.hp-=12;g.impacts.push({x:b.x,z:b.z,life:.25,duration:.25});return false}if(!b.enemy){const e=g.enemies.find(e=>e.hp>0&&Math.hypot(b.x-e.x,b.z-e.z)<1.24);if(e){e.hp--;const duration=e.hp===0?.58:.22;g.impacts.push({x:b.x,z:b.z,life:duration,duration});return false}}return Math.abs(b.x)<25&&b.z>-27&&b.z<18});
 const n=g.enemies.length;g.enemies=g.enemies.filter(e=>e.hp>0);if(n&&!g.enemies.length){
  if(g.hp>0&&blockadeActive(ledger,sector)){
   if(g.blockadeLink){transact(()=>clearBlockade(ledger,sector,true));receipt('Recovered the Nine Lanterns');tell('Convoy recovered. Open The Choir Line on your bridge.')}
   else tell('Signal lost. Re-enter the Orison blockade and summon your spirit before the last ship falls.')
  }else tell('Orbit secured. Claim this world.')
 }if(g.hp<=0){g.hp=0;panel('Escape pod recovered','Your spirit guided the pod home. Previously claimed worlds remain in your fleet.',[['Return to hangar',hangar]])}}
$('menu').onclick=()=>{if(g.hp<=0)hangar();else bridge()};
onkeydown=e=>{if(districtOpen)return;const k=e.key.toLowerCase();if(k===' '||k.startsWith('arrow'))e.preventDefault();if(!e.repeat&&!overlay){if(k==='e'&&g.mode==='flight')summon();if(k==='f')interact();if(k==='escape')bridge()}keys.add(k)};onkeyup=e=>keys.delete(e.key.toLowerCase());document.onvisibilitychange=()=>{if(document.hidden&&!overlay&&!districtOpen)bridge()};
const stick=$('stick');function aim(e){if(e.pointerId!==finger)return;const b=stick.getBoundingClientRect(),x=e.clientX-b.left-b.width/2,y=e.clientY-b.top-b.height/2,l=Math.max(32,Math.hypot(x,y));axis=[x/l,y/l];stick.firstElementChild.style.transform='translate('+axis[0]*30+'px,'+axis[1]*30+'px)'}stick.onpointerdown=e=>{if(finger!==null)return;finger=e.pointerId;stick.setPointerCapture(finger);aim(e)};stick.onpointermove=aim;stick.onlostpointercapture=()=>{finger=null;axis=[0,0];stick.firstElementChild.style.transform=''};
hangar();let previous=performance.now(),hud='';function label(id,value){const el=$(id);if(el.textContent!==value)el.textContent=value}
function frame(now){const dt=Math.min(.05,(now-previous)/1000);previous=now;update(dt);g.canLook=!overlay||g.mode==='hangar';if(!districtOpen){
  const renderedJourney=g.mode==='journey'?g.journey:null;
  drawJourney(renderedJourney,now,stationFor(ledger,sector),morrowAnchorage(renderedJourney?.body,relief));
  if(g.mode==='journey')showTrajectory(null);
  else if(g.mode==='navigation')showTrajectory(g.trajectory);
  else{showTrajectory(null);render(g,clock)}
 }
 const nav=g.mode==='navigation'?orbitReadout(g.trajectory):null;
 const tracked=g.mode==='journey'&&g.journey.trackStation&&stationFor(ledger,sector);
 const trackedPort=g.mode==='journey'&&g.journey.trackPort&&morrowAnchorage(g.journey.body,relief);
 const h=overlay?'':g.mode==='journey'?((trackedPort?portBearing(trackedPort,g.journey)+'\n':'')+(tracked?stationBearing(tracked,g.journey)+'\n':'')+(g.crew.duty==='helm'?'Astra · '+g.crew.flightOrder.stage+' → '+g.journey.target.name+'\n':'')+(g.journey.alt<5?(sector%4===2?'Cloud skimming':'Surface drive'):'Free flight')+' · '+(g.journey.alt<1000?Math.round(g.journey.alt)+' m':Math.round(g.journey.alt/1000).toLocaleString()+' km')+' altitude · '+Math.round(g.journey.v.length()).toLocaleString()+' m/s'):nav?('Orbit · '+Math.round(nav.altitude/1000)+' km　 '+(nav.speed/1000).toFixed(2)+' km/s　 ×'+g.trajectory.warp+'\nPeriapsis '+Math.round(nav.periapsis/1000)+' km  /  Apoapsis '+(Number.isFinite(nav.apoapsis)?Math.round(nav.apoapsis/1000)+' km':'escape')):g.mode==='survey'?(surveyStatus(g.survey)+(g.crew.duty==='survey'?' · Astra piloting':'')):g.mode==='deck'?'Forward helm · '+Math.max(0,Math.ceil(g.z+4))+' m':('Hull '+g.hp+'/'+ships[g.ship].hull+'　 Patrol '+g.enemies.length+'　 Spirit '+(recharge?Math.ceil(recharge)+'s':'ready'));if(h!==hud){hud=h;$('hud').textContent=h}label('location',g.world.name+' / '+ships[g.ship].name);label('help',overlay?'':g.mode==='journey'?'W/S · Drive　 A/D · Turn　 I/K · Pitch　 U/J · Lift　 F · Bearing':g.mode==='survey'?'W/S · Thrust　 A/D · Turn　 U/J · Climb / descend　 F · Orbit':g.mode==='navigation'?'W/S · Prograde / retrograde　 A/D · Radial burn　 F · Patrol':g.mode==='deck'?'WASD / arrows · Walk　 Drag · Look　 F · Helm':'WASD / arrows · Fly　 Space · Fire　 E · Spirit　 F · Claim');requestAnimationFrame(frame)}requestAnimationFrame(frame);

import {WarClient} from './war-client.mjs';
import {FACTIONS,rallyFor} from './warfront-geography.mjs';
import {catalog,restoreArmory,purchase,equip,shipWeapon,groundWeapon,armorAbsorb} from './armory.mjs';
import {createExpedition,stepExpedition,fireGround,interactGround,settleExpedition} from './surface-expedition.mjs';
import {drawSurface} from './surface-expedition-view.mjs';
import {renderCockpit} from './cockpit-interior.mjs';
import {harborFor,harborStatus,requestApproach,advanceApproach,dockHarbor,restoreHarbor} from './hearth-harbor.mjs';
import {restoreAir,airEpisode,acceptAir,deliverAir} from './borrowed-air.mjs';
import {landingEntries} from './landing-atlas.mjs';
import {stationFor,stationDistance,stationBearing,buildStation,serviceAvailable,serviceHull,serviceRack} from './field-station.mjs';
import {restoreCampaign,episode,acceptSignal,fitRepeater,blockadeActive,clearBlockade,broadcast,factions,salePremium,spiritCooldown} from './campaign.mjs';
import {boardNavigator,assignLanding,checkpoint,resumeLanding,relieveNavigator,advanceLanding} from './crew-operations.mjs';
import {toJourney} from './planet-geography.mjs';
import {newJourney,travel,drawJourney,relief} from './deep-flight.mjs';
import {newLedger,extract,capacity,quote,resources,sell,upgrade} from './mining.mjs';
import {activeMarketManifest,marketInventory,createMarketManifest,settleMarketManifest,cancelMarketManifest} from './market-manifest.mjs';
import {loadCrew,recordCrew,pilot} from './crew.mjs';
import {createSurvey,advanceSurvey,surveyStatus} from './survey.mjs';
import {createTrajectory,stepTrajectory,orbitReadout,showTrajectory} from './orbital-flight.mjs';
import {openFreeport} from './freeroam.mjs';
import {ships,world,cycle,frontier} from './universe.mjs';
import {render,cameraMode,setCameraMode,addCameraShake} from './space-view.mjs';
import {audio} from './audio-engine.mjs';
import {comms,AgentHarness} from './ai-engine.mjs';

const $=id=>document.getElementById(id),key='ashen-reach.captain.v1';
let save={ship:0,sector:0,claims:[]};
try{const v=JSON.parse(localStorage.getItem(key));if(v&&ships[v.ship]&&Number.isSafeInteger(v.sector)&&v.sector>=0&&Array.isArray(v.claims))save={ship:v.ship,sector:v.sector,claims:v.claims.filter(Number.isSafeInteger)}}catch{}
function persist(){try{localStorage.setItem(key,JSON.stringify(save))}catch{tell('Storage unavailable. This voyage lasts for this session.')}}
let tick=cycle(),sector=Math.min(save.sector,frontier(tick)-1),g={impacts:[],ship:save.ship,mode:'hangar',world:world(sector,tick),x:0,z:2,bank:0,spirit:0,enemies:[],shots:[],hp:ships[save.ship].hull};
let keys=new Set(),axis=[0,0],finger=null,overlay=true,fire=0,recharge=0,enemyFire=1,spiritFire=0,clock=0,notice=0,page=0;

// Initialize AI Harness and make accessible globally for AI agents
const aiHarness = new AgentHarness(g);
if(typeof window!=='undefined'){
  window.AshenReachAI=aiHarness;
  window.AshenAudio=audio;
  window.AshenComms=comms;
}

function tell(msg){$('feedback').textContent=msg;notice=3.2}
function button(label,fn,parent){
  const b=document.createElement('button');b.textContent=label;
  b.onclick=e=>{
    audio.resume();audio.uiClick('click');fn(e);
  };
  parent.append(b);return b;
}
function stop(){keys.clear();axis=[0,0];finger=null;const s=$('stick');if(s&&s.firstElementChild)s.firstElementChild.style.transform=''}
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
 button('Board '+ship.name,()=>{
   audio.resume();audio.warpJump();
   save.ship=g.ship;persist();g.hp=ship.hull;deck();
 },row);$('choices').append(row)
}
function unpause(){stop();overlay=false;$('panel').hidden=true;$('controls').hidden=false;actions()}
function deck(){g.yaw=0;g.pitch=-.02;g.mode='deck';boardNavigator(g.crew,g.ship);receipt('Boarded vessel');g.x=0;g.z=4;g.shots=[];g.enemies=[];g.spirit=0;unpause();tell('Walk forward to the illuminated helm.')}
function launch(){
 if(!g.journey||g.journey.body.id!==sector){
  const restored=resumeLanding(g.crew,g.ship,sector);
  if(!restored&&g.crew.duty==='helm'){relieveNavigator(g.crew);receipt('Flight order released after system change')}
  g.journey=restored||newJourney(sector);
  if(!restored&&sector===1&&restoreHarbor(g.journey,harborFor(g.journey.body,relief),ledger.harbor,g.ship))g.journey.alt=g.journey.p.distanceTo(g.journey.body.center)-g.journey.body.r-relief(g.journey.body,g.journey.p.clone().sub(g.journey.body.center).normalize());
 }
 audio.warpJump();
 g.mode='journey';unpause();tell('Push forward to approach. Steer to explore. Hold Climb to lift off.');
 comms.say('Astra [Navigator]', `Free flight initiated in ${g.world.name} orbit. Standing by on sensors.`, 'normal', 'flight');
}
function selectDestination(){
 const s=g.journey;
 panel('Flight computer','Select a bearing. Hold forward to engage the cruise drive.',[
 ...s.system.map(b=>[b.name,()=>{takeHelm();s.target=b;s.aim=true;audio.uiClick('confirm');unpause()}]),['Manual steering',()=>{takeHelm();s.aim=false;unpause()}]])
}
function patrol(){previousFlight=null;g.blockadeLink=false;g.impacts=[];g.mode='flight';g.x=0;g.z=4;g.shots=[];g.spirit=0;fire=0;enemyFire=2;
 g.enemies=save.claims.includes(sector)&&!blockadeActive(ledger,sector)?[]:Array.from({length:Math.min(5,2+sector%4)},(_,i)=>({x:(i-1)*3,z:-7-i*1.6,base:-7-i*1.6,hp:3,phase:i*2}));
 unpause();tell(g.enemies.length?'Hostile patrol ahead. Align your ship and fire.':'Friendly orbit. Open the chart to travel.');
 if(g.enemies.length)comms.say('Astra [Tactical]', `Warning: Orbital patrol detected. ${g.enemies.length} hostile signatures in firing arc.`, 'urgent', 'combat');
}
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
ledger.air=restoreAir(ledger.air);
ledger.armory=restoreArmory(ledger.armory);
function transact(op){const message=op();try{localStorage.setItem('ashen.mining.v1',JSON.stringify(ledger))}catch{return message+' Storage unavailable.'}return message}
function harvest(){
 if(!g.survey?.lastSample)return tell('Fly through a survey beacon below 160 m to locate a deposit.');
 const p=g.survey.lastSample;
 if(Math.hypot(g.survey.x-p.x,g.survey.z-p.z)>145||g.survey.clearance>160)return tell('Return within 145 m of the scanned deposit below 160 m.');
 audio.impact(false);
 tell(transact(()=>extract(ledger,sector,p.id)));
 comms.say('Astra [Geology]', `Mineral sample extraction complete. Ferrite hold updated.`, 'normal', 'mine');
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
function borrowedAir(message=''){
 const chapter=airEpisode(ledger);if(!chapter)return campaignLog();
 const options=[];
 if(ledger.air.stage==='available')options.push(['Accept emergency supply run',()=>{transact(()=>acceptAir(ledger));receipt('Accepted Borrowed Air');borrowedAir()}]);
 if(ledger.air.stage==='supply'){
  options.push(sector===2?['Survey Veyra',survey]:['Plot Veyra',()=>inspect(2)]);
  if(sector===2)for(const [choice,label] of [['clinic','Supply clinic · 80 cr'],['condenser','Supply condenser · 100 cr']])options.push([label,()=>{const result=transact(()=>deliverAir(ledger,sector,choice));if(ledger.air.stage==='complete')receipt('Delivered coolant to '+choice);borrowedAir(result)}]);
 }
 panel(chapter.title,[message,chapter.body].filter(Boolean).join(' '),[...options,['The Choir Line',campaignLog],['Bridge',bridge]]);
 $('panel').classList.add('campaign-brief');$('panel').querySelector('small').textContent='BORROWED AIR / ACT II';
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
 if(chapter.stage==='complete')options.push(['Continue · Borrowed Air',()=>borrowedAir()]);
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
function hearthDocked(){
 const pose=ledger.harbor?.position,s=g.mode==='journey'?g.journey:null;
 return sector===1&&ledger.harbor?.body===1&&ledger.harbor?.hull===g.ship&&s?.body?.id===1&&
  Array.isArray(pose)&&pose.length===3&&pose.every((v,i)=>Number.isFinite(v)&&Math.abs(v-s.p.toArray()[i])<.1)
}
function exchange(message=''){
 const active=activeMarketManifest(ledger),atHearth=hearthDocked(),buttons=[];
 if(sector===1&&atHearth){
  if(active){
   buttons.push(['Deliver '+active.id+' · '+active.units+' '+resources[active.resource],()=>exchange(transact(()=>settleMarketManifest(ledger,active.id,sector).message))]);
   buttons.push(['Cancel '+active.id,()=>exchange(transact(()=>cancelMarketManifest(ledger,active.id).message))])
  }else for(const [i,r] of resources.entries()){
   if(!ledger.ore[i])continue;
   const price=quote(i,sector)+salePremium(ledger,i,sector);
   buttons.push(['Manifest '+ledger.ore[i]+' '+r+' · '+price+' cr/unit',()=>exchange(transact(()=>createMarketManifest(ledger,i,sector,price).message))])
  }
 }else if(sector!==1)for(const [i,r] of resources.entries()){
  if(!ledger.ore[i]||active?.resource===i)continue;
  const premium=salePremium(ledger,i,sector);
  buttons.push(['Sell '+ledger.ore[i]+' '+r+' · '+(quote(i,sector)+premium)+' cr/unit',()=>exchange(transact(()=>{
   const extra=ledger.ore[i]*premium,base=sell(ledger,i,sector);ledger.credits+=extra;
   return base+(extra?' Guild premium: '+extra+' credits.':'')
  }))])
 }
 if(ledger.campaign.stage==='repeater'&&sector===1)buttons.unshift(['Fit convoy repeater · 4 ferrite',()=>exchange(transact(()=>fitRepeater(ledger,sector)))]);
 if(ledger.rack<4)buttons.push(['Fit cargo rack · '+45*(ledger.rack+1)+' cr',()=>exchange(transact(()=>upgrade(ledger)))]);
 const stock=marketInventory(ledger,1),manifest=active?' · Loaded '+active.id:'',access=sector===1&&!atHearth?' Land at Hearth N-04 to manifest and deliver cargo.':'';
 panel(g.world.name+' exchange',message+access+' Trade credits '+ledger.credits+' · Hold '+ledger.ore.join(' / ')+' · Capacity '+capacity(ledger)+manifest+' · Hearth receiving '+stock.join(' / '),[...buttons,[atHearth?'Return to berth':'Return to district',atHearth?hearth:freeport],['Bridge',bridge]])
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
  receipt('Took helm for '+body.name);unpause();tell('Astra has the helm for '+body.name+'.');
  comms.say('Astra [Helm]', `Landing sequence calculated for ${body.name}. Descent profile engaged.`, 'high', 'nav');
 }]),['Bridge',bridge]])
}
let districtOpen=false,previousFlight=null;
function rememberOrbit(){
 if(g.mode==='flight')previousFlight={worldId:g.world.id,x:g.x,z:g.z,enemies:g.enemies,shots:g.shots,impacts:g.impacts,spirit:g.spirit}
}
function survey(){
 const origin=g.mode==='journey'&&g.journey?.alt<3500?g.journey:null;
 if(origin){takeHelm();origin.harborApproach=false;}
 rememberOrbit();g.mode='survey';g.survey=createSurvey(g.world.id,g.ship,origin);unpause();
 tell('Steer with the stick. Hold climb or descend to change clearance.');
 comms.say('Astra [Sensors]', `Surface survey grid activated. Mineral resonance scanner online.`, 'normal', 'survey');
}
function transfer(){
 rememberOrbit();g.mode='navigation';g.trajectory=createTrajectory(g.world,g.ship);unpause();
 tell('Forward burns prograde. Back lowers your orbit. Left and right apply radial thrust.')
}
function returnFlight(){
 if(g.mode==='survey'&&g.survey?.frame&&g.journey&&toJourney(g.survey,g.journey)){g.mode='journey';unpause();tell('Continuing flight from survey coordinates.');return}
 if(previousFlight?.worldId===g.world.id){
  Object.assign(g,previousFlight);previousFlight=null;g.mode='flight';unpause()
 }else launch()
}
function freeport(){
 if(districtOpen)return;stop();districtOpen=true;overlay=true;
 $('panel').hidden=true;$('controls').hidden=true;
 try{openFreeport({worldId:g.world.id,shipId:g.ship,onExchange:()=>{districtOpen=false;exchange()},onExit:()=>{districtOpen=false;bridge()}})}
 catch(error){districtOpen=false;bridge();tell('Freeport could not open.');console.error(error)}
}

function settingsMenu(){
  panel('Ship Systems & AI Core', 'Configure audio synthesizers, camera perspectives, and embodied AI co-pilot behaviors.', [
    [cameraMode==='chase'?'Camera: Chase Cam (Toggle)':'Camera: Cockpit Cam (Toggle)', ()=>{
      const next = cameraMode==='chase'?'cockpit':'chase';
      setCameraMode(next);
      if($('view-toggle'))$('view-toggle').textContent='CAM: '+next.toUpperCase();
      settingsMenu();
    }],
    ['Autopilot: '+(aiHarness.autopilotMode||'OFF').toUpperCase(), ()=>{
      const modes=[null,'combat','transit'];
      const next=modes[(modes.indexOf(aiHarness.autopilotMode)+1)%modes.length];
      aiHarness.setAutopilot(next);
      if($('ai-policy-badge'))$('ai-policy-badge').textContent='AUTOPILOT: '+(next||'OFF').toUpperCase();
      settingsMenu();
    }],
    ['Audio: Toggle Mute', ()=>{
      audio.setMuted(!audio.masterGain || audio.masterGain.gain.value > 0);
      settingsMenu();
    }],
    ['AI Neural Visualizer (Toggle)', ()=>{
      const el=$('ai-telemetry');
      if(el)el.hidden=!el.hidden;
      settingsMenu();
    }],
    ['Return to Bridge', bridge]
  ]);
}

function hearth(message=''){
 const s=g.mode==='journey'?g.journey:null,p=s&&harborFor(s.body,relief),status=harborStatus(p,s);
 const options=[];
 if(sector!==1)options.push(['Plot Nacre',()=>inspect(1)]);
 else if(!s)options.push(['Enter Nacre flight',()=>{launch();hearth()}]);
 else{
  options.push(['Request N-04 approach',()=>{takeHelm();aiHarness.setAutopilot(null);requestApproach(s,p);unpause();tell('N-04 clearance granted. Manual input cancels approach.')}]);
  if(status?.ready){
   options.push(['Secure landing gear',()=>{let docked=false;transact(()=>{docked=dockHarbor(s,p,ledger,g.ship);return 'Berth secured'});if(docked){receipt('Docked at Hearth Exchange N-04');hearth('Landing gear secured.')}}]);
   if(hearthDocked()){
    options.push(['Visit weapons & equipment store',()=>armory()],['Enter mineral exchange',()=>exchange()],['Repair hull · 15 cr',()=>hearth(transact(()=>{if(g.hp>=ships[g.ship].hull)return 'Hull fully repaired.';if(ledger.credits<15)return 'Insufficient credits.';ledger.credits-=15;g.hp=ships[g.ship].hull;return 'Hull restored.'}))],['Depart N-04',()=>{transact(()=>{delete ledger.harbor;return 'Berth released'});s.harborApproach=false;s.aim=false;unpause();tell('Hold Climb to clear the pad.')}]);
   }
  }
 }
 panel('Hearth Exchange · N-04',[message,status?'Range '+Math.round(status.range)+' m · Pad clearance '+Math.round(status.height)+' m · Speed '+Math.round(status.speed)+' m/s. Dock within 34 m, 0–6 m above deck and below 3 m/s.':'Nacre planetary harbor. Fly to the physical landing pad for services.'].filter(Boolean).join(' '),[...options,['Bridge',bridge]]);
}
function armory(message=''){
 if(!hearthDocked())return hearth('Equipment dealer requires a secured N-04 berth.');
 const rows=catalog.map(item=>{
 const owned=ledger.armory.owned.includes(item.id);
 const selected=item.slot==='ship'?ledger.armory.ship[g.ship]===item.id:ledger.armory[item.slot]===item.id;
 return [item.name+' · '+(selected?'EQUIPPED':owned?'Equip':item.price+' cr')+(item.damage?' · Power '+item.damage:''),()=>armory(transact(()=>owned?equip(ledger,item.id,g.ship):purchase(ledger,item.id)))];
 });
 panel('Hearth Armory',message+' · Trade credits '+ledger.credits+' · Ship: '+shipWeapon(ledger,g.ship).name+' · Ground: '+groundWeapon(ledger).name,[...rows,['Return to berth',hearth]]);
}
function disembark(){
 const s=createExpedition(g.journey,ledger);
 if(!s){tell('Land on solid terrain and slow below 2.5 m/s before disembarking.');return}
 takeHelm();aiHarness.setAutopilot(null);g.journey.harborApproach=false;g.journey.v.set(0,0,0);g.expedition=s;g.mode='surface';unpause();tell('Collect geological samples, disable sentinels and return to your ship.');
}
function boardSurface(){
 const s=g.expedition;if(!s)return;
 if(s.hp>0&&Math.hypot(s.x,s.z)>8){tell('Return within 8 metres of your ship.');return}
 const msg=s.hp<=0?'Emergency recovery. Expedition reward forfeited.':transact(()=>settleExpedition(s,ledger));
 g.expedition=null;g.mode='journey';unpause();tell(msg);
}
let war=null,warJoining=false;
function warfront(message=''){
 const j=g.mode==='journey'?g.journey:null,p=j&&rallyFor(j.body),status=harborStatus(p,j);
 const opts=[];
 if(!j)opts.push(['Return to flight',()=>{launch();warfront()}]);
 else if(!p)opts.push(['Plot Aurelia via flight computer',selectDestination]);
 else{
  opts.push(['Request Relay Crown approach',()=>{takeHelm();aiHarness.setAutopilot(null);j.warRally=true;requestApproach(j,p);unpause();tell('Relay Crown approach engaged.') }]);
  if(status?.ready)for(const f of FACTIONS)opts.push(['Enlist / resume · '+f,()=>joinWar(f)]);
 }
 panel('Aurelia · Relay Crown',message+' Land at A-01 to enter the networked faction war. The online inventory is server-owned and separate from offline saves. '+(status?'Range '+Math.round(status.range)+' m · Clearance '+Math.round(status.height)+' m':'Travel to Aurelia first.'),[...opts,['Bridge',bridge]]);
}
async function joinWar(faction){
 if(warJoining)return;warJoining=true;
 const j=g.journey,p=j&&rallyFor(j.body);
 if(!harborStatus(p,j)?.ready){warJoining=false;return warfront('Landing required.')}
 const client=new WarClient();
 panel('Connecting to Relay Crown','Authenticating your faction session…',[]);
 try{await client.connect(faction);war=client;g.expedition=client.makeSurface();j.v.set(0,0,0);j.harborApproach=false;j.warRally=false;g.mode='surface';unpause();tell('Faction network connected. Server controls your equipment and combat.')}
 catch(e){warfront('Network unavailable: '+e.message+'. Start npm run multiplayer on the game host.')}
 finally{warJoining=false}
}
function exitWar(){war?.close();war=null;g.expedition=null;g.mode='journey';unpause();tell('Returned to parked vessel. Online character stays in the warfront.')}
function warLoot(){const s=war?.snapshot;if(!s)return;const l=s.loot.find(l=>Math.hypot(l.x-s.self.x,l.z-s.self.z)<=4);if(l)war.enqueue('loot',{id:l.id});else tell('No loot within 4 m.')}
function bridge(){
 if(g.mode==='surface'&&war){panel('Relay Crown · online','Your online character remains vulnerable while this menu is open.',[['Resume',unpause],['Return to offline vessel',exitWar]]);return}

 if(g.mode==='surface'){panel('Surface expedition','Your vessel remains at the landing coordinates.',[['Resume',unpause],['Board vessel',boardSurface]]);return}

 if(g.mode==='hangar'){hangar();return}
 panel(ships[g.ship].name+' bridge',g.world.name+' · '+save.claims.length+' claimed worlds on this device.',[
 ['Resume',unpause],['The Choir Line',campaignLog],['Free flight',launch],['Combat patrol',patrol],['Crew station',crewStation],['Field station',()=>fieldStation()],['Hearth harbor',()=>hearth()],['Faction warfront',()=>warfront()],['Orbital navigation',transfer],['Surface survey',survey],['Enter freeport',freeport],['Star chart',chart],['Walk the deck',deck],['Settings & AI Core',settingsMenu],['Change ship',hangar]])
}
function summon(){
 if(recharge>0){tell('Spirit returns in '+Math.ceil(recharge)+'s');return}
 audio.spiritSummon();addCameraShake(0.4);
 g.spirit=8;recharge=spiritCooldown(ledger,g.ship===2?13:21);spiritFire=0;
 if(g.enemies.length&&blockadeActive(ledger,sector)){
   g.blockadeLink=true;tell('Nine Lanterns identified. Clear the blockade.');
   comms.say('Ship Spirit', 'I remember the convoy roll call. The lost ships hear us.', 'urgent', 'spirit');
 } else {
   tell('Your spirit has joined the battle.');
   comms.say('Astra [Spirit]', 'Spirit companion deployed. Autonomous combat shielding active.', 'high', 'spirit');
 }
}
function interact(){
 if(g.mode==='surface'&&war){warLoot();return}
 if(g.mode==='surface'){tell(interactGround(g.expedition,ledger));return}
 if(g.mode==='journey'){selectDestination();return}
 if(g.mode==='survey'||g.mode==='navigation'){returnFlight();return}
 if(g.mode==='deck'){if(g.z>-4){tell('Approach the forward helm.');return}launch();return}
 if(g.enemies.length){tell('Clear the orbital patrol first.');return}
 if(!save.claims.includes(sector)){
   save.claims.push(sector);persist();tell(g.world.name+' claimed. Fleet repaired.');
   audio.uiClick('confirm');
   g.hp=ships[g.ship].hull;actions()
 } else chart()
}
function actions(){
 const a=$('actions');a.replaceChildren();
 if(g.mode==='surface'&&war){const b=button('Fire',()=>war?.enqueue('fire'),a);b.onpointerdown=e=>{b.setPointerCapture(e.pointerId);keys.add('fire')};b.onlostpointercapture=()=>keys.delete('fire');button('Loot',warLoot,a);button('Capture',()=>war.enqueue('capture'),a);button('Respawn',()=>war.enqueue('respawn'),a);button('Exit warfront',exitWar,a);return}
 if(g.mode==='surface'){button('Collect sample',interact,a);const b=button('Fire',()=>fireGround(g.expedition,ledger),a);b.onpointerdown=e=>{b.setPointerCapture(e.pointerId);keys.add('fire')};b.onlostpointercapture=()=>keys.delete('fire');button('Board vessel',boardSurface,a);return}
 if(g.mode==='journey'){
  for(const [label,key] of [['Climb','u'],['Descend','j'],['Pitch up','i'],['Pitch down','k']]){
   const b=button(label,()=>{},a);b.onpointerdown=e=>{b.setPointerCapture(e.pointerId);keys.add(key)};b.onlostpointercapture=()=>keys.delete(key)
  }
  button('Extract',()=>{
   const s=g.journey;if(s.alt>30)return tell('Descend below 30 metres to collect local resources.');
   const local=s.p.clone().sub(s.body.center);
   const site='field/'+local.toArray().map(v=>Math.floor(v/250)).join('/');
   tell(transact(()=>extract(ledger,sector,site)))
  },a);
  button('Disembark',disembark,a);if(g.journey.body.id===0)button('Warfront',()=>warfront(),a);button('Bearing',selectDestination,a);button('Harbor',()=>hearth(),a);
  if(g.journey.alt<3500){
   button('Survey descent',()=>{
    survey();
    tell('Entering atmospheric survey corridor.');
    comms.say('Astra [Transition]','Orbital descent confirmed. Engaging low-altitude survey grid.','high','survey');
   },a);
  }
  button(g.journey.cruise?'Cruise assist':'Newtonian',()=>{takeHelm();g.journey.cruise=!g.journey.cruise;actions()},a);
  return
 }
 if(g.mode==='navigation'){
  button('Time ×'+g.trajectory.warp,()=>{g.trajectory.warp=g.trajectory.warp===20?100:g.trajectory.warp===100?1:20;actions()},a);
  button('Descend',survey,a);button('Freeport',freeport,a);button('Patrol',patrol,a);return
 }
 if(g.mode==='survey'){
  for(const [label,key] of [['Climb','u'],['Descend','j']]){
   const b=button(label,()=>{},a);b.onpointerdown=e=>{b.setPointerCapture(e.pointerId);keys.add(key)};b.onlostpointercapture=()=>keys.delete(key)
  }
  button('Extract',harvest,a);button('Return to orbit',returnFlight,a);return
 }
 if(g.mode==='deck'){
   button('Take helm',interact,a);button('The Choir Line',campaignLog,a);button('Chart',chart,a)
 } else {
   const b=button('Fire',()=>{if(!overlay)shoot()},a);
   b.onpointerdown=e=>{b.setPointerCapture(e.pointerId);keys.add('fire')};
   b.onlostpointercapture=()=>keys.delete('fire');
   button('Spirit',summon,a);
   button(save.claims.includes(sector)?'Chart':'Claim',interact,a)
 }
}

function shoot(){
 if(g.mode==='surface'&&war){war.enqueue('fire');return}
 if(g.mode==='surface'){fireGround(g.expedition,ledger);return}
 if(g.mode!=='flight'||fire>0)return;
 const weapon=shipWeapon(ledger,g.ship);
 fire=ships[g.ship].fire*weapon.rate;
 audio.laser(false);
 addCameraShake(0.06);
 g.shots.push({x:g.x,z:g.z-1,dx:0,dz:-weapon.speed,enemy:false,damage:weapon.damage})
}

// Global action listeners for AI Agents
window.addEventListener('ai-action-fire', ()=>{ if(!overlay)shoot(); });
window.addEventListener('ai-action-summon', ()=>{ if(!overlay)summon(); });

function update(dt){
 clock+=dt;notice-=dt;
 if(notice<=0&&$('feedback').textContent)$('feedback').textContent='';
 const now=cycle();if(now!==tick){tick=now;g.world=world(sector,tick)}
 
 // Step AI agent harness & comms checks
 comms.checkAstra(g, clock);
 aiHarness.updateAutopilot(dt);

 if(overlay){if(war&&g.mode==='surface')war.step(g.expedition,{},performance.now(),dt);return}
 const x=axis[0]+Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),
       z=axis[1]+Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup')),
       mag=Math.max(1,Math.hypot(x,z)),speed=g.mode==='deck'?3.8:ships[g.ship].speed;

 // Audio engine hum update
 const throttleRatio = Math.abs(z);
 audio.updateEngine(throttleRatio, g.mode==='journey'?(g.journey?.v.length()||0)/10000:0.3, g.mode==='journey'&&g.journey?.cruise);

 if(g.mode==='surface'&&war){war.step(g.expedition,{turn:x/mag,drive:-z/mag,fire:keys.has(' ')||keys.has('fire')},performance.now(),dt);return}
 if(g.mode==='surface'){stepExpedition(g.expedition,{turn:x/mag,drive:-z/mag},dt,ledger);if(keys.has(' ')||keys.has('fire'))fireGround(g.expedition,ledger);if(g.expedition.hp<=0)boardSurface();return}
 if(g.mode==='journey'){
  const s=g.journey;if(x||keys.has('i')||keys.has('k'))s.aim=false;
  const manual={turn:x/mag,drive:-z/mag,pitch:Number(keys.has('i'))-Number(keys.has('k')),lift:Number(keys.has('u'))-Number(keys.has('j'))};
  if(Object.values(manual).some(Boolean)){s.harborApproach=false;s.warRally=false;if(ledger.harbor){transact(()=>{delete ledger.harbor;return 'Berth released'})}}
  if(g.crew.duty==='helm'&&Object.values(manual).some(Boolean)){takeHelm();s.aim=false}
  if(s.harborApproach){
   if(advanceApproach(s,s.warRally?rallyFor(s.body):harborFor(s.body,relief),dt,relief)){tell(s.warRally?'Relay Crown landing envelope reached. Open Warfront.':'N-04 landing envelope reached. Open Harbor to secure landing gear.');s.warRally=false;actions()}
  }else if(g.crew.duty==='helm'){
   const event=advanceLanding(g.crew,s,dt);
   crewCheckpointAge+=dt;
   if(event){recordCrew(g.crew,crewStorage,event,s.body.name,ships[g.ship].name);tell(event)}
   else if(crewCheckpointAge>=3||s.body.id!==sector){saveCrewPose();crewCheckpointAge=0}
  }else travel(s,dt,manual);
  if(sector!==s.body.id){if(ledger.harbor)transact(()=>{delete ledger.harbor;return 'Berth released'});sector=save.sector=s.body.id;g.world=world(sector,tick);persist()}return
 }

 const yaw=g.mode==='deck'?g.yaw:0,mx=Math.cos(yaw)*x+Math.sin(yaw)*z,mz=-Math.sin(yaw)*x+Math.cos(yaw)*z;
 if(g.mode==='survey'){
   const manual={turn:x/mag,throttle:-z/mag,lift:Number(keys.has('u'))-Number(keys.has('j'))};
   if(g.crew.duty==='survey'&&(x||z||manual.lift)){g.crew.duty='standby';receipt('Manual override')}
   const count=g.survey.scans,site=g.survey.site;advanceSurvey(g.survey,dt,g.crew.duty==='survey'?pilot(g.survey):manual);
   if(g.survey.scans>count){
     g.survey.lastSample={...site,id:count};
     if(g.crew.duty==='survey')harvest();
     if(g.crew.duty==='survey')g.crew.visits++;
     receipt('Survey logged');
   }
   return
 }
 if(g.mode==='navigation'){if(stepTrajectory(g.trajectory,dt*g.trajectory.warp,x/mag,-z/mag)==='entry')survey();return}
 g.bank=x/mag;const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 g.x=clamp(g.x+mx/mag*dt*speed,g.mode==='deck'?-2.4:-9,g.mode==='deck'?2.4:9);
 g.z=clamp(g.z+mz/mag*dt*speed,g.mode==='deck'?-6.6:-5,7);

 if(g.mode==='deck')return;
 g.impacts=g.impacts.filter(f=>(f.life-=dt)>0);fire-=dt;recharge=Math.max(0,recharge-dt);g.spirit=Math.max(0,g.spirit-dt);spiritFire-=dt;enemyFire-=dt;
 if(keys.has('fire')||keys.has(' '))shoot();

 for(const e of g.enemies){e.x+=Math.cos(clock+e.phase)*dt*1.6;e.z=e.base+Math.sin(clock*.5+e.phase)*.7}
 if(g.enemies.length&&enemyFire<=0){
   enemyFire=1.6;const e=g.enemies[Math.floor(clock)%g.enemies.length],d=Math.hypot(g.x-e.x,g.z-e.z)||1;
   audio.laser(true);
   g.shots.push({x:e.x,z:e.z,dx:(g.x-e.x)/d*7,dz:(g.z-e.z)/d*7,enemy:true})
 }
 if(g.spirit>0&&spiritFire<=0&&g.enemies.length){
   spiritFire=.8;const e=g.enemies[0],x=g.x+1.9,d=Math.hypot(e.x-x,e.z-g.z)||1;
   audio.laser(false);
   g.shots.push({x,z:g.z,dx:(e.x-x)/d*21,dz:(e.z-g.z)/d*21,enemy:false})
 }

 g.shots=g.shots.filter(b=>{
   b.x+=b.dx*dt;b.z+=b.dz*dt;
   if(b.enemy&&Math.hypot(b.x-g.x,b.z-g.z)<1){
     g.hp-=Math.max(1,12-armorAbsorb(ledger));
     audio.impact(true);addCameraShake(0.35);
     g.impacts.push({x:b.x,z:b.z,life:.25,duration:.25});return false
   }
   if(!b.enemy){
     const e=g.enemies.find(e=>e.hp>0&&Math.hypot(b.x-e.x,b.z-e.z)<1.24);
     if(e){
       e.hp=Math.max(0,e.hp-(b.damage||1));
       const duration=e.hp===0?.58:.22;
       audio.impact(e.hp===0);addCameraShake(e.hp===0?0.2:0.08);
       g.impacts.push({x:b.x,z:b.z,life:duration,duration});return false
     }
   }
   return Math.abs(b.x)<25&&b.z>-27&&b.z<18
 });

 const n=g.enemies.length;g.enemies=g.enemies.filter(e=>e.hp>0);
 if(n&&!g.enemies.length){
  if(g.hp>0&&blockadeActive(ledger,sector)){
   if(g.blockadeLink){transact(()=>clearBlockade(ledger,sector,true));receipt('Recovered the Nine Lanterns');tell('Convoy recovered. Open The Choir Line on your bridge.')}
   else tell('Signal lost. Re-enter the Orison blockade and summon your spirit before the last ship falls.')
  }else tell('Orbit secured. Claim this world.')
 }
 if(g.hp<=0){
   g.hp=0;
   audio.impact(true);
   panel('Escape pod recovered','Your spirit guided the pod home. Previously claimed worlds remain in your fleet.',[['Return to hangar',hangar]])
 }
}

$('menu').onclick=()=>{if(g.hp<=0)hangar();else bridge()};

// Header Camera & AI buttons
const viewToggle = $('view-toggle');
if(viewToggle){
  viewToggle.onclick=()=>{
    const next = cameraMode === 'chase' ? 'cockpit' : 'chase';
    setCameraMode(next);
    viewToggle.textContent = 'CAM: ' + next.toUpperCase();
    audio.uiClick('click');
  };
}
const aiToggle = $('ai-toggle');
if(aiToggle){
  aiToggle.onclick=()=>{
    const el=$('ai-telemetry');
    if(el)el.hidden=!el.hidden;
    audio.uiClick('click');
  };
}

// Comms Display Subscriber
let commsTimer = null;
comms.subscribe(entry => {
  const commsBox = $('astra-comms');
  const senderEl = $('comms-sender');
  const textEl = $('comms-text');
  if (commsBox && senderEl && textEl) {
    senderEl.textContent = entry.sender;
    textEl.textContent = entry.text;
    commsBox.hidden = false;
    audio.uiClick('confirm');
    clearTimeout(commsTimer);
    commsTimer = setTimeout(() => { commsBox.hidden = true; }, 4500);
  }
});

// Setup Neural telemetry visualizer bars
const neuralBars = $('neural-bars');
if(neuralBars && neuralBars.children.length === 0){
  for(let i=0; i<32; i++){
    const bar = document.createElement('div');
    bar.className = 'neural-bar';
    neuralBars.appendChild(bar);
  }
}

onkeydown=e=>{
  if(districtOpen)return;
  const k=e.key.toLowerCase();
  audio.resume();
  if(k===' '||k.startsWith('arrow'))e.preventDefault();
  if(!e.repeat&&!overlay){
    if(k==='e'&&g.mode==='flight')summon();
    if(k==='f')interact();
    if(k==='v'){
      const next = cameraMode === 'chase' ? 'cockpit' : 'chase';
      setCameraMode(next);
      if(viewToggle)viewToggle.textContent = 'CAM: ' + next.toUpperCase();
      audio.uiClick('click');
    }
    if(k==='escape')bridge()
  }
  keys.add(k)
};
onkeyup=e=>keys.delete(e.key.toLowerCase());
document.onvisibilitychange=()=>{if(document.hidden&&!overlay&&!districtOpen)bridge()};
const stick=$('stick');
function aim(e){
  if(e.pointerId!==finger)return;
  const b=stick.getBoundingClientRect(),x=e.clientX-b.left-b.width/2,y=e.clientY-b.top-b.height/2,l=Math.max(32,Math.hypot(x,y));
  axis=[x/l,y/l];
  stick.firstElementChild.style.transform='translate('+axis[0]*30+'px,'+axis[1]*30+'px)'
}
stick.onpointerdown=e=>{audio.resume();if(finger!==null)return;finger=e.pointerId;stick.setPointerCapture(finger);aim(e)};
stick.onpointermove=aim;
stick.onlostpointercapture=()=>{finger=null;axis=[0,0];stick.firstElementChild.style.transform=''};

hangar();
let previous=performance.now(),hud='';
function label(id,value){const el=$(id);if(el&&el.textContent!==value)el.textContent=value}

let physicalCockpit=false;
function updateFlightInstruments(){
 const el=$('flight-instruments');if(!el)return;
 const s=g.mode==='journey'&&!overlay&&!districtOpen?g.journey:null;
 el.hidden=!s;
 if(!s)return;
 el.classList.toggle('cockpit-frame',cameraMode==='cockpit'&&!physicalCockpit);
 const normal=s.p.clone().sub(s.body.center).normalize();
 const port=s.harborApproach?harborFor(s.body,relief):null;
 const bearing=(port?port.position:s.target.center).clone().sub(s.p);
 const vertical=s.v.dot(normal),north=normal.clone().multiplyScalar(-normal.y);north.y+=1;
 if(north.lengthSq()<1e-10)north.set(0,0,1);north.normalize();
 const east=north.clone().cross(normal).normalize(),heading=Math.atan2(s.forward.dot(east),s.forward.dot(north))*180/Math.PI;
 const format=n=>Math.round(n).toLocaleString('en-US');
 label('flight-speed',format(s.v.length())+' m/s');
 label('flight-alt',format(s.alt)+' m');
 label('flight-vs',(vertical>=0?'+':'')+format(vertical)+' m/s');
 label('flight-heading',String(Math.round((heading+360)%360)%360).padStart(3,'0')+'°');
 label('flight-target',port?'HEARTH N-04':s.target.name.toUpperCase());
 label('flight-distance',format(Math.max(0,bearing.length()-(port?0:s.target.r))/1000)+' km');
 label('flight-drive',s.cruise?'CRUISE ASSIST':'NEWTONIAN');
 label('flight-hull',Math.round(100*Math.max(0,g.hp)/ships[g.ship].hull)+'%');
 const mark=$('flight-marker');
 if(mark){
 const z=bearing.dot(s.forward),up=s.right.clone().cross(s.forward).normalize();
 mark.hidden=z<=0;
 if(z>0){
 mark.style.left=Math.max(8,Math.min(92,50+bearing.dot(s.right)*innerHeight*.83/z/innerWidth*100))+'%';
 mark.style.top=Math.max(15,Math.min(78,50-bearing.dot(up)*.83/z*100))+'%';
 }
 }
}
function updateCockpitHUD(){
  const bracket = $('target-bracket');
  if(!bracket)return;
  if(g.mode==='flight' && g.enemies && g.enemies.length > 0 && !overlay){
    const e = g.enemies[0];
    const screenX = innerWidth * 0.5 + (e.x - g.x) * (innerWidth * 0.04);
    const screenY = innerHeight * 0.42 + (e.z - g.z) * (innerHeight * 0.015);
    bracket.hidden = false;
    bracket.style.left = Math.max(40, Math.min(innerWidth-40, screenX)) + 'px';
    bracket.style.top = Math.max(80, Math.min(innerHeight-80, screenY)) + 'px';
    const dist = Math.hypot(e.x - g.x, e.z - g.z) * 45;
    const distEl = bracket.querySelector('.target-dist');
    if(distEl)distEl.textContent = Math.round(dist) + 'm';
  } else {
    bracket.hidden = true;
  }

  // Update AI Telemetry Panel
  const telemetry = $('ai-telemetry');
  if(telemetry && !telemetry.hidden){
    const spd = g.mode==='journey' ? (g.journey?.v.length()||0) : g.mode==='survey' ? Math.hypot(g.survey?.vx||0, g.survey?.vz||0) : (keys.size?ships[g.ship].speed:0);
    const alt = g.mode==='journey' ? (g.journey?.alt||0) : g.mode==='survey' ? (g.survey?.clearance||0) : 142000;
    label('ai-stat-spd', Math.round(spd).toLocaleString() + ' m/s');
    label('ai-stat-alt', alt < 1000 ? Math.round(alt)+'m' : Math.round(alt/1000)+'km');
    label('ai-stat-hdg', Math.round(((g.yaw||0)*180/Math.PI + 360)%360) + '°');
    label('ai-stat-tgt', g.enemies?.length ? 'HOSTILE x'+g.enemies.length : g.journey?.target?.name || 'CLEAR');

    // Animate neural bars
    if(neuralBars){
      const bars = neuralBars.children;
      for(let i=0; i<bars.length; i++){
        const h = Math.abs(Math.sin(clock*3 + i*0.4)) * 20 + 2;
        bars[i].style.height = h + 'px';
      }
    }
  }
}

function frame(now){
  const dt=Math.min(.05,(now-previous)/1000);previous=now;
  update(dt);
  g.canLook=!overlay||g.mode==='hangar';
  if(!districtOpen){
    drawJourney(g.mode==='journey'?g.journey:null,now,stationFor(ledger,sector));
    drawSurface(g.mode==='surface'?g.expedition:null,g.ship);
    if(g.mode==='surface')showTrajectory(null);
    else if(g.mode==='journey')showTrajectory(null);
    else if(g.mode==='navigation')showTrajectory(g.trajectory);
    else{showTrajectory(null);render(g,clock)}
  }
  let cross=$('war-crosshair');if(!cross){cross=document.createElement('div');cross.id='war-crosshair';cross.textContent='+';document.body.append(cross)}cross.hidden=!(g.mode==='surface'&&war&&!overlay);
  updateCockpitHUD();
  const flight=g.mode==='journey'&&!overlay&&!districtOpen?g.journey:null;
  physicalCockpit=false;
  if(flight&&cameraMode==='cockpit'){
   const port=flight.harborApproach?harborFor(flight.body,relief):null;
   const normal=flight.p.clone().sub(flight.body.center).normalize();
   const north=normal.clone().multiplyScalar(-normal.y);north.y+=1;
   if(north.lengthSq()<1e-10)north.set(0,0,1);north.normalize();
   const east=north.clone().cross(normal).normalize();
   const heading=(Math.atan2(flight.forward.dot(east),flight.forward.dot(north))*180/Math.PI+360)%360;
   physicalCockpit=renderCockpit(true,{hull:Math.max(0,g.hp)/ships[g.ship].hull*100,speed:flight.v.length(),drive:flight.cruise?'CRUISE':'NEWTONIAN',target:port?'HEARTH N-04':flight.target.name,range:port?flight.p.distanceTo(port.position):Math.max(0,flight.p.distanceTo(flight.target.center)-flight.target.r),alt:flight.alt,vertical:flight.v.dot(normal),approach:!!port,heading},now);
  }else renderCockpit(false,null,now);
  $('flight-instruments')?.classList.toggle('physical-cockpit',physicalCockpit);
  updateFlightInstruments();
  const nav=g.mode==='navigation'?orbitReadout(g.trajectory):null;
  const tracked=g.mode==='journey'&&g.journey.trackStation&&stationFor(ledger,sector);
  const portStatus=g.mode==='journey'?harborStatus(harborFor(g.journey.body,relief),g.journey):null;
  const h=overlay?'':g.mode==='surface'&&war?(g.expedition.name+' · '+war.snapshot.self.faction+' · HP '+g.expedition.hp+' · Kills '+war.snapshot.self.score+'\n'+Object.entries(war.snapshot.territory).map(([id,f])=>id.split('-').at(-1)+': '+f).join(' / ')+'\n'+Object.entries(war.snapshot.self.inventory).map(([k,v])=>k+' ×'+v).join(' · ')+'\n'+(war.failure?'NETWORK: ':'')+war.notice):g.mode==='surface'?(g.expedition.name+' · Suit '+Math.ceil(g.expedition.hp)+'%\nSamples '+g.expedition.sites.filter(t=>t.kind==='sample'&&t.taken).length+'/'+g.expedition.sites.filter(t=>t.kind==='sample').length+' · Sentinels '+g.expedition.sites.filter(t=>t.kind==='drone'&&t.hp>0).length+' · Ship '+Math.round(Math.hypot(g.expedition.x,g.expedition.z))+' m\n'+g.expedition.notice):g.mode==='journey'?((portStatus&&g.journey.harborApproach?'N-04 APPROACH · '+Math.round(portStatus.range)+' m range · '+Math.round(portStatus.height)+' m deck clearance\n':'')+(tracked?stationBearing(tracked,g.journey)+'\n':'')+(g.crew.duty==='helm'?'Astra · '+g.crew.flightOrder.stage+' → '+g.journey.target.name+'\n':'')+(g.journey.alt<5?(sector%4===2?'Cloud skimming':'Surface drive'):'Free flight')+' · '+(g.journey.alt<1000?Math.round(g.journey.alt)+' m':Math.round(g.journey.alt/1000).toLocaleString()+' km')+' altitude · '+Math.round(g.journey.v.length()).toLocaleString()+' m/s'):nav?('Orbit · '+Math.round(nav.altitude/1000)+' km　 '+(nav.speed/1000).toFixed(2)+' km/s　 ×'+g.trajectory.warp+'\nPeriapsis '+Math.round(nav.periapsis/1000)+' km  /  Apoapsis '+(Number.isFinite(nav.apoapsis)?Math.round(nav.apoapsis/1000)+' km':'escape')):g.mode==='survey'?(surveyStatus(g.survey)+(g.crew.duty==='survey'?' · Astra piloting':'')):g.mode==='deck'?'Forward helm · '+Math.max(0,Math.ceil(g.z+4))+' m':('Hull '+g.hp+'/'+ships[g.ship].hull+'　 Patrol '+g.enemies.length+'　 Spirit '+(recharge?Math.ceil(recharge)+'s':'ready'));
  if(h!==hud){hud=h;$('hud').textContent=h}
  label('location',g.world.name+' / '+ships[g.ship].name);
  label('help',overlay?'':g.mode==='surface'&&war?'W/S · Move  A/D · Aim  Space · Fire  F · Loot':g.mode==='surface'?'W/S · Walk  A/D · Turn  Space · Fire  F · Collect':g.mode==='journey'?'W/S · Drive　 A/D · Turn　 I/K · Pitch　 U/J · Lift　 F · Bearing　 V · Cam':g.mode==='survey'?'W/S · Thrust　 A/D · Turn　 U/J · Climb / descend　 F · Orbit　 V · Cam':g.mode==='navigation'?'W/S · Prograde / retrograde　 A/D · Radial burn　 F · Patrol':g.mode==='deck'?'WASD / arrows · Walk　 Drag · Look　 F · Helm':'WASD / arrows · Fly　 Space · Fire　 E · Spirit　 F · Claim　 V · Cam');
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame);

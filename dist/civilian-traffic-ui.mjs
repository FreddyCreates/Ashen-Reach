import {advanceTraffic,newTraffic,trafficTick,trafficView,validTraffic} from './civilian-traffic.mjs';

const key='ashen.civilian.traffic.v1';
const contacts=[];
const colors={Freighter:'#ffd493','Relief pilot':'#bcffb3','Survey pilot':'#a3d8ff','Patrol pilot':'#ffadbc'};
let local, current, source='unavailable', lastServer=0, receivedAt=0, fetchAfter=0, localTarget=-1, request, dialog, resetFocus, detailId, interval, trafficButton, mounted=false;
let markerLayer,markerVisibility=false;
function element(tag,text,cls){
  const node=document.createElement(tag);
  if(text!==undefined)node.textContent=text;
  if(cls)node.className=cls;
  return node;
}
function updateContacts(snapshot){
  contacts.length=0;
  for(const [slot,p] of snapshot.pilots.entries()){
    if(p.position.phase!=='flight')continue;
    contacts.push({name:p.name,ship:p.ship,color:colors[p.role],slot,from:p.position.from,to:p.position.to,
      departureTick:p.position.departureTick,arrivalTick:p.position.arrivalTick,front:false});
  }
}
function retain(next,mode){
  if(current?.tick!==next.tick||source!==mode)updateContacts(next);
  current=next; source=mode;renderBoard();
}
function localSnapshot(now){
  const target=trafficTick(now);
  if(localTarget===target&&local?.tick===target)return;
  if(!local){
    try{const saved=JSON.parse(localStorage.getItem(key));if(validTraffic(saved))local=saved;}catch{}
    local??=newTraffic(target);
  }
  advanceTraffic(local,target);
  try{localStorage.setItem(key,JSON.stringify(local));}catch{}
  localTarget=target;retain(trafficView(local,target),'local');
}
function safeEnvelope(s){
  return s?.mode==='shared'&&s.schema===1&&Number.isSafeInteger(s.tick)&&s.tick>=0&&
    Number.isFinite(s.serverTime)&&Number.isFinite(s.tickAt)&&s.interval===30000&&
    Array.isArray(s.worlds)&&s.worlds.length===4&&Array.isArray(s.pilots)&&s.pilots.length<=24&&
    s.pilots.every(p=>p&&typeof p.id==='string'&&typeof p.name==='string'&&typeof p.ship==='string'&&
      p.position&&(p.position.phase==='dock'||p.position.phase==='flight'))&&
    Array.isArray(s.events)&&s.events.length<=32;
}
function refresh(now=Date.now()){
  if(now<fetchAfter||request)return;
  if(typeof location==='undefined')return;
  if(location.protocol!=='http:'&&location.protocol!=='https:'){
    fetchAfter=now+2000;localSnapshot(now);return;
  }
  fetchAfter=now+4500;
  request=(async()=>{
    try{
      const response=await fetch('/api/traffic',{cache:'no-store',signal:AbortSignal.timeout(4000)});
      if(response.status===503&&!lastServer){
        source='shared-unavailable';current=undefined;contacts.length=0;renderBoard();return;
      }
      if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))throw Error('Shared traffic unavailable');
      const data=await response.json();
      if(!safeEnvelope(data))throw Error('Invalid traffic response');
      lastServer=data.serverTime;receivedAt=Date.now(); retain(data,'shared');
    }catch{
      fetchAfter=Date.now()+(lastServer?4500:15000);
      if(lastServer){
        if(source!=='shared-stale'){source='shared-stale';renderBoard();}
      }else if(source!=='shared-unavailable')localSnapshot(Date.now());
    }finally{request=null;}
  })();
}
function animateTick(now=Date.now()){
  if(!current)return 0;
  if(source==='shared-stale'||current.catchingUp)return current.tick;
  const effective=source==='shared'?lastServer+Math.max(0,now-receivedAt):now;
  return current.tick+Math.max(0,Math.min(.999,(effective-current.tickAt)/current.interval));
}
export function trafficFrame(now=Date.now()){
  refresh(now);
  return contacts;
}
export function trafficPhase(){
  return animateTick();
}
export function showContactMarkers(points,visible){
  if(!mounted)return;
  if(markerVisibility!==visible){markerVisibility=visible;markerLayer.hidden=!visible;}
  if(!visible)return;
  for(let i=0;i<markerLayer.children.length;i++){
    const node=markerLayer.children[i],p=points[i];
    if(node.hidden===Boolean(p?.front))node.hidden=!p?.front;
    if(!p?.front)continue;
    if(node.textContent!==p.ship)node.textContent=p.ship;
    if(node.style.color!==p.color)node.style.color=p.color;
    node.style.transform='translate('+Math.round(p.x)+'px,'+Math.round(p.y)+'px)';
  }
}
function worldName(id){return current?.worlds.find(w=>w.world===id)?.name??'Uncharted'}
function eventText(e){
  const v={departed:'Departed',delivered:'Delivered',surveyed:'Surveyed',patrolled:'Patrolled',repositioned:'Repositioned'}[e.kind]??e.kind;
  return [v,worldName(e.from)+' → '+worldName(e.to),e.cargo&&`${e.cargo.units} ${e.cargo.good}`].filter(Boolean).join(' · ');
}
function positionText(p){
  const pos=p.position;
  if(pos.phase==='dock')return 'Docked at '+worldName(pos.world);
  const min=(Math.max(0,pos.arrivalTick-animateTick())*current.interval/60000).toFixed(1);
  return worldName(pos.from)+' → '+worldName(pos.to)+' · ETA '+min+' min';
}
function renderBoard(){
  if(!dialog?.open)return;
  const indicator=dialog.querySelector('[data-source]');
  if(!current){
    indicator.textContent=source==='shared-unavailable'?'Shared traffic unavailable · retrying':'Looking for civilian traffic…';
    for(const slot of ['roster','detail','market','log'])dialog.querySelector('[data-'+slot+']').replaceChildren();
    return;
  }
  const focused=document.activeElement?.dataset?.pilot;
  indicator.textContent=({
    shared:'Shared traffic · server owned',
    'shared-stale':'Last known shared traffic · reconnecting',
    local:'Offline traffic · this browser only',
  })[source]+(current.catchingUp?' · checkpoint catching up':'');
  const roster=dialog.querySelector('[data-roster]');
  const active=detailId??current.pilots[0]?.id;
  roster.replaceChildren(...current.pilots.map(p=>{
    const button=element('button',p.ship+' · '+p.role);
    button.type='button';button.dataset.pilot=p.id;button.setAttribute('aria-pressed',String(p.id===active));
    button.addEventListener('click',()=>{detailId=p.id;renderBoard();});
    return button;
  }));
  const detail=dialog.querySelector('[data-detail]');
  const character=current.pilots.find(p=>p.id===active);
  if(character){
    const pos=character.position;
    detail.replaceChildren(
      element('h3',character.name+' / '+character.ship),
      element('p',character.story),
      element('p',positionText(character)+(pos.cargo?' · '+pos.cargo.units+' '+pos.cargo.good:''),'traffic-route'),
      element('p',`${character.delivered} cargo delivered · ${character.surveys} surveys · ${character.patrols} patrols`),
      element('p',character.lastEvent?eventText(character.lastEvent):'No recorded action yet.')
    );
  }else detail.replaceChildren();
  const cargo=dialog.querySelector('[data-market]');
  cargo.replaceChildren(...current.worlds.map(m=>element('li',`${m.name}: ${m.stock.ore} ore · ${m.stock.provisions} provisions · ${m.stock.parts} parts`)));
  const log=dialog.querySelector('[data-log]');
  log.replaceChildren(...current.events.slice().reverse().slice(0,8).map(e=>element('li',
    (current.pilots.find(p=>p.id===e.pilot)?.ship??e.pilot)+' · '+eventText(e))));
  if(focused)Array.from(roster.children).find(b=>b.dataset.pilot===focused)?.focus({preventScroll:true});
}
export function openTrafficBoard(){
  mount();
  if(!dialog||dialog.open)return;
  resetFocus=document.activeElement;
  dialog.showModal();renderBoard();refresh();
  interval=setInterval(()=>{refresh();renderBoard();},2000);
}
function mount(){
  if(mounted||typeof document==='undefined')return;
  trafficButton=document.getElementById('traffic-button');
  if(!trafficButton)return;
  mounted=true;
  const style=element('style',`
    #ashen-traffic{box-sizing:border-box;width:min(680px,94vw);max-height:min(78vh,680px);padding:1rem 1.25rem;border:1px solid #56909d;border-radius:12px;background:#101d26;color:#e4eef1;font:14px/1.45 system-ui;overflow:auto;z-index:80}
    #ashen-traffic::backdrop{background:#030a12bc} #ashen-traffic h2{margin:.25rem 0} #ashen-traffic h3{margin:.75rem 0 .25rem}
    #ashen-traffic [data-detail]{position:static;box-sizing:border-box;width:100%;max-width:100%;max-height:none;padding:14px;overflow-wrap:anywhere;box-shadow:none} #ashen-traffic p{margin:.45rem 0} #ashen-traffic ul{padding-inline-start:1.2rem} #ashen-traffic [data-source],.traffic-route{color:#a3e4ee}
    #ashen-traffic [data-roster]{display:flex;flex-wrap:wrap;gap:.35rem;margin:.75rem 0}
    #ashen-traffic button{font-size:inherit;min-height:32px;padding:.3rem .55rem;cursor:pointer} #ashen-traffic button[aria-pressed=true]{border-color:#9cdee5;color:#acdce9}
    #ashen-traffic .traffic-close{float:right} #traffic-contact-layer{position:fixed;inset:0;z-index:2;pointer-events:none}
    #traffic-contact-layer span{position:absolute;inset:0 auto auto 0;font:bold clamp(9px,1.3vw,12px) system-ui;text-shadow:0 1px 4px #000;white-space:nowrap;opacity:.85}
    #traffic-contact-layer span::before{content:'◇';margin-inline-end:.3em} #traffic-contact-layer[hidden],#traffic-contact-layer span[hidden]{display:none}
    @media(max-width:520px){header:has(#traffic-button){gap:7px;flex-wrap:wrap} header:has(#traffic-button) #location{order:3;flex-basis:100%;font-size:11px} header:has(#traffic-button) .header-btns{margin-inline-start:auto;gap:4px} header:has(#traffic-button) .header-btns button{font-size:9px;padding:5px 6px} #ashen-traffic{max-height:82vh}}
  `);
  document.head.append(style);
  dialog=element('dialog');dialog.id='ashen-traffic';dialog.setAttribute('aria-labelledby','ashen-traffic-title');
  const close=element('button','Close','traffic-close');close.type='button';close.addEventListener('click',()=>dialog.close());
  const heading=element('h2','Civilian flight board');heading.id='ashen-traffic-title';
  const status=element('p','Looking for civilian traffic…');status.dataset.source='';status.setAttribute('role','status');
  const roster=element('div');roster.dataset.roster='';roster.setAttribute('aria-label','Pilots and ships');
  const detail=element('section');detail.dataset.detail='';detail.setAttribute('aria-label','Selected pilot');
  const market=element('ul');market.dataset.market='';
  const log=element('ul');log.dataset.log='';
  dialog.append(close,heading,status,roster,detail,element('h3','Civilian depot stock'),market,element('h3','Recent flights'),log);
  dialog.addEventListener('keydown',event=>event.stopPropagation());
  dialog.addEventListener('close',()=>{clearInterval(interval);interval=undefined;resetFocus?.focus();});
  markerLayer=element('div');markerLayer.id='traffic-contact-layer';markerLayer.hidden=true;markerLayer.setAttribute('aria-hidden','true');
  for(let i=0;i<12;i++){const marker=element('span');marker.hidden=true;markerLayer.append(marker);}
  document.body.append(markerLayer,dialog);
  trafficButton.addEventListener('click',openTrafficBoard);
}
if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
}

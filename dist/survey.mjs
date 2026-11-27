import {localHeight,localCoordinates,fromJourney} from './planet-geography.mjs';
import {landingSite,regionalElevation} from './survey-atlas.mjs';

// Survey coordinates use metres, seconds and kilograms in a local tangent frame.
const profiles = [
  {name:'Ferric highlands', gravity:7.4, radius:4.9e6, density:.58, sea:false,
   zenith:'#263e59', haze:'#d3ad89', rock:'#8c5e44', light:'#dcad79', dark:'#503d3b', water:'#6c533e'},
  {name:'Tidal archipelago', gravity:9.2, radius:6.3e6, density:1.12, sea:true,
   zenith:'#19476b', haze:'#bed3cf', rock:'#426654', light:'#bdac82', dark:'#334c45', water:'#296a79'},
  {name:'Ammonia cloud belt', gravity:18.4, radius:5.2e7, density:.91, gas:true,
   zenith:'#34283f', haze:'#ddc0c1', rock:'#a18090', light:'#edd2be', dark:'#70576d', water:'#aa889d'},
  {name:'Basalt coast', gravity:8.5, radius:5.4e6, density:.89, sea:true,
   zenith:'#294f5c', haze:'#bdd0bb', rock:'#585c49', light:'#a4a17e', dark:'#364736', water:'#396c72'}
];
const hulls = [
  {mass:9400,thrust:126000,area:14,turn:1.23},
  {mass:21900,thrust:190000,area:33,turn:.75},
  {mass:12200,thrust:146000,area:18,turn:1.06}
];
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
export function surveyProfile(id){return profiles[id%4]}
function hash(x,z,seed){
  let n=Math.imul(x,374761393)^Math.imul(z,668265263)^Math.imul(seed+1,2246822519);
  n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295
}
function noise(x,z,seed){
 const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz;
 const a=fx*fx*(3-2*fx),b=fz*fz*(3-2*fz);
 const low=hash(ix,iz,seed)*(1-a)+hash(ix+1,iz,seed)*a;
 const high=hash(ix,iz+1,seed)*(1-a)+hash(ix+1,iz+1,seed)*a;
 return low*(1-b)+high*b
}
export function surveyHeight(id,x,z,frame=null){
 if(frame)return localHeight(frame,x,z);
 const form=id%4;
 const xx=x+id*1731,zz=z-id*985;
 const broad=noise(xx/2300,zz/2300,id+41);
 const ridge=1-Math.abs(noise(xx/550+1.7*broad,zz/550,id+185)*2-1);
 const fold=noise(xx/175,zz/175,id+9);
 const ledge=noise(xx/39,zz/39,id+19);
 const fine=noise(xx/8,zz/8,id+30);
 if(form===2)return 40+145*broad+80*ridge*ridge+65*fold+12*ledge+2*fine;
 const raw=640*broad+140*ridge*ridge*ridge+74*fold+13*ledge+2.3*fine;
 const region=regionalElevation(id,x,z);
 if(form===0)return region+raw*.84+4*Math.sin(raw*.12)*(.3+fold*.7);
 return region+raw*(form===1?.92:1.07)-(form===1?365:405)
}
export function terrainContact(id,x,z,frame=null){
 const h=surveyHeight(id,x,z,frame);
 return surveyProfile(id).sea?Math.max(0,h):h
}
function siteFor(id,index,x,z){
 const a=(index===0?0:hash(index,id,628)*Math.PI*2);
 const length=index===0?720:680+hash(index,id,834)*720;
 return {x:x+Math.sin(a)*length,z:z-Math.cos(a)*length}
}
export function createSurvey(id,shipIndex,journey=null){
 if(!Number.isSafeInteger(id)||id<0||!hulls[shipIndex])throw Error('Unknown survey destination or hull');
 const profile=surveyProfile(id),x=0,z=0;
 const origin=journey?.body.id===id&&!profile.gas?fromJourney(journey):null;
 const altitude=terrainContact(id,x,z)+(profile.gas?90:98);
 const state={id,ship:shipIndex,x,z,y:altitude,vx:0,vy:0,vz:-15,yaw:0,bank:0,
   yawRate:0,pitch:-.17,clock:0,remainder:0,landed:false,clearance:altitude-terrainContact(id,x,z),
   scans:0,scanTime:0,site:siteFor(id,0,x,z),message:'',messageUntil:0};
 if(origin){Object.assign(state,origin);state.clearance=state.y-terrainContact(id,x,z,state.frame);}
 return state;
}
function step(s,h,input){
 const p=surveyProfile(s.id),hull=hulls[s.ship];
 const turn=clamp(Number(input.turn)||0,-1,1),drive=clamp(Number(input.throttle)||0,-1,1);
 const lift=clamp(Number(input.lift)||0,-1,1);
 s.clock+=h;
 const ground=terrainContact(s.id,s.x,s.z,s.frame),agl=s.y-ground;
 s.yawRate+=(turn*hull.turn-s.yawRate)*(1-Math.exp(-h*2.8));s.yaw+=s.yawRate*h;
 s.bank+=(-s.yawRate*.32-s.bank)*(1-Math.exp(-h*4));
 const acceleration=drive*hull.thrust/hull.mass;
 const density=p.density*Math.exp(-Math.max(0,s.y)/8500);
 const grav=p.gravity*(p.radius/(p.radius+Math.max(0,s.y)))**2;
 const roughWind=p.gas?4.2:.7,wind=roughWind*Math.sin(s.z/150+s.clock*.13);
 const speed=Math.hypot(s.vx-wind,s.vz,s.vy),drag=.5*density*.82*hull.area*speed/hull.mass;
 s.vx+=(Math.sin(s.yaw)*acceleration-drag*(s.vx-wind))*h;
 s.vz+=(-Math.cos(s.yaw)*acceleration-drag*s.vz)*h;
 // Vertical-flight assist trims gravity and commands climb rate. Thrust remains bounded.
 const climb=lift*(s.ship===1?20:29);
 const pressureRecovery=p.gas?clamp((ground-45-s.y)*.22,0,25):0;
 const ceilingRecovery=clamp((agl-1850)*-.15,-40,0);
 const verticalThrust=clamp(grav+1.3*(climb+pressureRecovery+ceilingRecovery-s.vy),0,grav+hull.thrust/hull.mass);
 s.vy+=(verticalThrust-grav-drag*s.vy)*h;
 s.x+=s.vx*h;s.y+=s.vy*h;s.z+=s.vz*h;
 const floor=terrainContact(s.id,s.x,s.z,s.frame);s.clearance=s.y-floor;
 if(!p.gas&&s.clearance<=2.5){
  s.y=floor+2.5;s.clearance=2.5;
  if(s.vy < -7&&!s.landed){s.message='Landing struts absorbed impact';s.messageUntil=s.clock+2.5}
  s.vy=Math.max(0,s.vy);const friction=Math.exp(-h*2.1);s.vx*=friction;s.vz*=friction;s.landed=lift<=0
 }else s.landed=false;
 s.pitch+=((-.18-clamp(-s.vy*.004,-.13,.22))-s.pitch)*(1-Math.exp(-h*2));
 const distance=Math.hypot(s.x-s.site.x,s.z-s.site.z);
 if(distance<100&&s.clearance<160&&s.clearance>-35){s.scanTime+=h;
  if(s.scanTime>=1.2){s.scans++;s.site=siteFor(s.id,s.scans,s.site.x,s.site.z);
  s.scanTime=0;s.message='Survey transect recorded';s.messageUntil=s.clock+3}
 }else s.scanTime=0
}
export function advanceSurvey(s,dt,input={}){
 if(!Number.isFinite(dt)||dt<=0)return;
 s.remainder+=Math.min(dt,.25);
 const h=1/60;
 while(s.remainder+1e-10>=h){step(s,h,input);s.remainder-=h}
}
export function surveyStatus(s){
 const p=surveyProfile(s.id),spd=Math.hypot(s.vx,s.vz),dx=s.site.x-s.x,dz=s.site.z-s.z;
 const delta=Math.atan2(Math.sin(Math.atan2(dx,-dz)-s.yaw),Math.cos(Math.atan2(dx,-dz)-s.yaw));
 const dir=Math.abs(delta)<.17?'ahead':delta>0?'right':'left';
 const level=s.landed?'Ground contact':(p.gas?'Cloud clearance ':'Terrain clearance ')+Math.round(s.clearance)+' m';
 const site=landingSite(s.id),lat=clamp(site.latitude-s.z/p.radius*180/Math.PI,-90,90);
 const lon=((site.longitude+s.x/(p.radius*Math.max(.02,Math.cos(lat*Math.PI/180)))*180/Math.PI+540)%360)-180;
 const actual=s.frame?localCoordinates(s.frame,s.x,s.z):{latitude:lat,longitude:lon};
 const coords=Math.abs(actual.latitude).toFixed(2)+'°'+(actual.latitude<0?'S':'N')+' '+Math.abs(actual.longitude).toFixed(2)+'°'+(actual.longitude<0?'W':'E');
 return p.name+' · '+coords+' · '+level+' · '+Math.round(spd)+' m/s\n'+(s.clock<s.messageUntil?s.message:'Beacon '+dir+' · '+Math.round(Math.hypot(dx,dz))+' m')+' · '+s.scans+' scanned'
}

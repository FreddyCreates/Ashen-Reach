// The crew record owns the flight order and its pose. Simulated time only advances during play.
import {newJourney,travel} from './deep-flight.mjs';

import {noteLanding} from './landing-atlas.mjs';

const vectorKeys=['p','v','forward','right'];
const validVector=a=>Array.isArray(a)&&a.length===3&&a.every(Number.isFinite);
const bodyId=id=>Number.isSafeInteger(id)&&id>=0;
const sameSystem=(a,b)=>Math.floor(a/4)===Math.floor(b/4);
export function boardNavigator(crew,hull){
 if(crew.station?.hull===hull)return;
 if(crew.duty==='helm')relieveNavigator(crew);
 crew.station={hull,role:'navigator'};
 crew.flightOrder=null;
}
export function assignLanding(crew,journey,hull,destination){
 const target=journey.system.find(b=>b.id===destination);
 if(!target)throw new RangeError('Choose a world in this flight system.');
 boardNavigator(crew,hull);
 crew.duty='helm';
 crew.flightOrder={world:destination,hull,stage:'depart',elapsed:0};
 journey.target=target;journey.cruise=true;journey.aim=true;
 checkpoint(crew,journey);
}
export function checkpoint(crew,journey){
 const order=crew.flightOrder;if(!order)return;
 order.pose={body:journey.body.id,alt:journey.alt};
 for(const key of vectorKeys)order.pose[key]=journey[key].toArray();
}
export function resumeLanding(crew,hull,sector){
 const order=crew.flightOrder,pose=order?.pose;
 if(crew.duty!=='helm'||order?.hull!==hull||!bodyId(order.world)||!pose||
    !bodyId(pose.body)||!sameSystem(pose.body,order.world)||!sameSystem(sector,pose.body)||
    !Number.isFinite(pose.alt)||!vectorKeys.every(key=>validVector(pose[key])))return null;
 const journey=newJourney(pose.body);
 for(const key of vectorKeys)journey[key].fromArray(pose[key]);
 journey.target=journey.system.find(b=>b.id===order.world);
 journey.alt=pose.alt;
 return journey;
}
export function relieveNavigator(crew){
 crew.duty='standby';crew.flightOrder=null;
}
// Emit a memory only after observing arrival through the same physics used by manual pilots.
export function advanceLanding(crew,journey,dt){
 const order=crew.flightOrder;
 if(!order||crew.duty!=='helm')return null;
 const target=journey.system.find(b=>b.id===order.world);
 if(!target){relieveNavigator(crew);return 'Flight order ended outside assigned system.'}
 journey.target=target;journey.aim=true;journey.cruise=true;
 order.elapsed+=dt;
 const approach=journey.body.id===target.id&&journey.alt<10000;
 order.stage=approach?'approach':journey.body.id===target.id?'descent':'transfer';
 travel(journey,dt,{drive:1});
 if(journey.body!==target||journey.alt>4)return null;
 const offset=journey.p.clone().sub(target.center);
 noteLanding(crew,{world:target.id,hull:order.hull,at:Date.now(),longitude:Math.atan2(offset.z,offset.x),
  latitude:Math.asin(offset.y/offset.length()),radius:offset.length(),seconds:Math.round(order.elapsed)});
 // At touchdown the flight assist damps residual velocity as manual control resumes.
 relieveNavigator(crew);return 'Astra reached '+target.name+' and logged surface coordinates.';
}

import {Vector3} from './three.module.js';
import {upgrade} from './mining.mjs';
const reach=65;
const V=(x=0,y=0,z=0)=>new Vector3(x,y,z);
export function stationFor(ledger,id){
 const station=ledger.stations?.[id];
 return station?.body===id&&Array.isArray(station.position)&&station.position.length===3&&station.position.every(Number.isFinite)?station:null;
}
export function stationDistance(station,flight){
 if(!station||station.body!==flight?.body.id)return Infinity;
 return V().fromArray(station.position).distanceTo(flight.p);
}
export function stationBearing(station,flight){
 const delta=V().fromArray(station.position).sub(flight.p);
 const angle=Math.round(Math.atan2(delta.dot(flight.right),delta.dot(flight.forward))*180/Math.PI);
 const range=delta.length();
 return 'Station '+(Math.abs(angle)<4?'ahead':Math.abs(angle)+'° '+(angle>0?'right':'left'))+' · '+(range<1000?Math.round(range)+' m':Math.round(range/1000)+' km');
}
export function buildStation(ledger,flight,elevation){
 if(!flight||flight.alt>5)return 'Land in free flight with clearance under 5 m.';
 const b=flight.body;
 if(b.id%4===2)return 'A field station needs solid ground. This world is a cloud giant.';
 if(stationFor(ledger,b.id))return 'A field station already operates on this world.';
 if(ledger.ore[0]<4)return 'Construction requires 4 ferrite.';
 const normal=flight.p.clone().sub(b.center).normalize();
 const ahead=flight.forward.clone().addScaledVector(normal,-flight.forward.dot(normal));
 if(ahead.lengthSq()<1e-8)ahead.copy(flight.right);
 const pad=flight.p.clone().sub(b.center).addScaledVector(ahead.normalize(),24).normalize();
 const height=elevation(b,pad);
 if(b.id%4!==0&&height===0)return 'This shoreline is submerged. Move inland to build.';
 const point=b.center.clone().addScaledVector(pad,b.r+height);
 if(!ledger.stations)ledger.stations={};
 ledger.stations[b.id]={body:b.id,position:point.toArray(),created:Date.now()};
 ledger.ore[0]-=4;
 return b.name+' field station online. Service radius 65 m.';
}
export function serviceAvailable(ledger,flight){
 return flight?.alt<=12&&stationDistance(stationFor(ledger,flight.body.id),flight)<=reach;
}
export function serviceHull(ledger,flight,hull,limit){
 if(!serviceAvailable(ledger,flight))return 'Land within 65 m of the station.';
 if(hull.hp>=limit)return 'Hull already at full strength.';
 hull.hp=limit;return 'Field crew repaired the hull.';
}
export function serviceRack(ledger,flight){
 if(!serviceAvailable(ledger,flight))return 'Land within 65 m of the station.';
 return upgrade(ledger);
}
// Construct the habitat, gantry and tracking dish once per persisted site in its tangent frame.
const meshes=new WeakMap();
export function stationMesh(station,body){
 if(meshes.has(station))return meshes.get(station);
 const origin=V().fromArray(station.position),up=origin.clone().sub(body.center).normalize();
 const right=V().crossVectors(Math.abs(up.y)<.9?V(0,1,0):V(1,0,0),up).normalize();
 const front=V().crossVectors(up,right),result=[];
 const point=(x,y,z)=>origin.clone().addScaledVector(right,x).addScaledVector(up,y).addScaledVector(front,z);
 function box(x,y,z,w,h,d,tint){
  const vertices=[];
  for(let iy=0;iy<2;iy++)for(let iz=0;iz<2;iz++)for(let ix=0;ix<2;ix++)vertices.push(point(x+(ix-.5)*w,y+iy*h,z+(iz-.5)*d));
  [[0,1,5,4],[1,3,7,5],[3,2,6,7],[2,0,4,6],[4,5,7,6]].forEach(([a,b,c,d],face)=>{
   const color=tint.map(k=>Math.round(k*(.66+face*.085)));
   for(const ids of [[a,b,c],[a,c,d]])result.push(ids.map(i=>({p:vertices[i],c:color})))
  });
 }
 box(0,-1,0,15,1.5,10,[92,109,117]);box(-2,.5,0,8,4,7,[199,173,137]);
 box(-2,4.5,0,8.6,.45,7.4,[105,123,136]);box(4,.5,0,2,7,2,[197,129,70]);
 box(4,7.5,0,.5,4,.5,[170,185,184]);box(4,11.5,0,1.1,.6,1.1,[130,243,210]);
 for(const z of [-3.54,3.54])box(-2,2,z,6,.8,.14,[77,212,210]);
 for(let i=0;i<4;i++)box(4,.5+i*.42,-3-i*.55,3,.35,1,[145,150,142]);
 meshes.set(station,result);return result;
}

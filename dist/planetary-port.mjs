import {Vector3} from './three.module.js';

const V=(x=0,y=0,z=0)=>new Vector3(x,y,z);
const berthRadius=90;
const ports=new WeakMap();

// Morrow Works is authored at Aurelia's +Z meridian. The starting orbit shares
// this meridian, so a new captain can follow the marker straight to the berth.
export function morrowAnchorage(body,elevation){
 if(!body||body.id!==0)return null;
 if(ports.has(body))return ports.get(body);
 const normal=V(0,0,1),height=elevation(body,normal);
 const port={
  id:'aurelia/morrow-works',
  name:'Morrow Works',
  body:body.id,
  normal:normal.toArray(),
  position:body.center.clone().addScaledVector(normal,body.r+height+1).toArray(),
  berthRadius
 };
 ports.set(body,port);
 return port
}

export function portDistance(port,flight){
 if(!port||!flight||port.body!==flight.body.id)return Infinity;
 return V().fromArray(port.position).distanceTo(flight.p);
}

export function portBearing(port,flight){
 if(!port||!flight||port.body!==flight.body.id)return 'Morrow Works is on Aurelia.';
 const delta=V().fromArray(port.position).sub(flight.p);
 const angle=Math.round(Math.atan2(delta.dot(flight.right),delta.dot(flight.forward))*180/Math.PI);
 const range=delta.length();
 const direction=Math.abs(angle)<4?'ahead':Math.abs(angle)+'° '+(angle>0?'right':'left');
 return port.name+' '+direction+' · '+(range<1000?Math.round(range)+' m':Math.round(range/1000)+' km');
}

export function trackPort(port,flight){
 if(!port||!flight||port.body!==flight.body.id)return false;
 flight.target=flight.body;
 flight.aim=true;
 flight.trackPort=true;
 flight.waypoint=[...port.position];
 return true;
}

export function berthAvailable(port,flight){
 return portDistance(port,flight)<=berthRadius&&flight.alt<=12&&flight.v.length()<=35;
}

export function recordBerthVisit(ledger,port,now=Date.now()){
 if(!ledger.portVisits)ledger.portVisits={};
 const prior=ledger.portVisits[port.id];
 const visits=(Number.isSafeInteger(prior?.visits)?prior.visits:0)+1;
 ledger.portVisits[port.id]={visits,lastArrival:now,position:[...port.position]};
 return 'Docked at '+port.name+' · arrival '+visits+'.';
}

const meshes=new WeakMap();
export function portMesh(port,body){
 if(!port)return [];
 if(meshes.has(port))return meshes.get(port);
 const origin=V().fromArray(port.position),up=origin.clone().sub(body.center).normalize();
 const right=V().crossVectors(Math.abs(up.y)<.9?V(0,1,0):V(1,0,0),up).normalize();
 const front=V().crossVectors(up,right),result=[];
 const point=(x,y,z)=>origin.clone().addScaledVector(right,x).addScaledVector(up,y).addScaledVector(front,z);
 function box(x,y,z,w,h,d,tint){
  const vertices=[];
  for(let iy=0;iy<2;iy++)for(let iz=0;iz<2;iz++)for(let ix=0;ix<2;ix++)vertices.push(point(x+(ix-.5)*w,y+iy*h,z+(iz-.5)*d));
  for(const [face,[a,b,c,d]] of [[0,[0,1,5,4]],[1,[1,3,7,5]],[2,[3,2,6,7]],[3,[2,0,4,6]],[4,[4,5,7,6]]]){
   const color=tint.map(value=>Math.round(value*(.68+face*.07)));
   for(const ids of [[a,b,c],[a,c,d]])result.push(ids.map(index=>({p:vertices[index],c:color})))
  }
 }
 box(0,-1,0,64,1,42,[72,91,98]);
 box(-20,0,8,18,8,18,[164,133,96]);
 box(18,0,10,12,13,15,[128,145,151]);
 box(0,0,-17,44,3,5,[191,154,103]);
 for(const x of [-26,26]){box(x,0,-15,2,18,2,[112,129,135]);box(x,18,-15,3,2,3,[117,234,208])}
 for(const x of [-12,0,12])box(x,0,0,7,.3,28,[203,176,119]);
 meshes.set(port,result);
 return result
}

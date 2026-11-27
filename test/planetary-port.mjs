import test from 'node:test';
import assert from 'node:assert/strict';
import {newJourney,travel,relief} from '../dist/deep-flight.mjs';
import {newLedger} from '../dist/mining.mjs';
import {morrowAnchorage,portDistance,portBearing,trackPort,berthAvailable,recordBerthVisit,portMesh} from '../dist/planetary-port.mjs';

const advance=(flight,seconds,input)=>{for(let i=0;i<seconds*50;i++)travel(flight,.02,input)};

test('Morrow Works is a fixed geographic berth reached from orbit and revisited after reload',()=>{
 const flight=newJourney(0),port=morrowAnchorage(flight.body,relief);
 assert.equal(port.name,'Morrow Works');
 assert.deepEqual(port.normal,[0,0,1]);
 assert.equal(trackPort(port,flight),true);
 assert.match(portBearing(port,flight),/Morrow Works ahead/);
 advance(flight,52,{drive:1});
 assert.equal(flight.alt,3);
 assert.ok(portDistance(port,flight)<10);
 assert.equal(berthAvailable(port,flight),true);
 const ledger=newLedger();
 assert.match(recordBerthVisit(ledger,port,1700000000000),/arrival 1/);
 const reloaded=JSON.parse(JSON.stringify(ledger));
 const samePort=morrowAnchorage(newJourney(0).body,relief);
 assert.deepEqual(reloaded.portVisits[port.id].position,samePort.position);
 assert.equal(reloaded.portVisits[port.id].visits,1);
 assert.ok(portMesh(samePort,flight.body).length>70);
 flight.trackPort=false;flight.aim=false;delete flight.waypoint;
 advance(flight,10,{drive:1});
 assert.ok(portDistance(port,flight)>90);
 assert.equal(berthAvailable(port,flight),false);
 flight.forward.multiplyScalar(-1);
 flight.right.multiplyScalar(-1);
 advance(flight,10,{drive:1});
 assert.ok(portDistance(port,flight)<90);
 assert.equal(berthAvailable(port,flight),true);
});

test('the authored berth cannot be used from another body',()=>{
 const aurelia=newJourney(0),port=morrowAnchorage(aurelia.body,relief),nacre=newJourney(1);
 assert.equal(morrowAnchorage(nacre.body,relief),null);
 assert.equal(portDistance(port,nacre),Infinity);
 assert.equal(trackPort(port,nacre),false);
 assert.equal(berthAvailable(port,nacre),false);
});

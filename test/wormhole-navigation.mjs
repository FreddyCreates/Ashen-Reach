import test from 'node:test';
import assert from 'node:assert/strict';
import {newJourney,relief} from '../dist/deep-flight.mjs';
import {advanceApproach,harborFor,harborStatus,requestApproach} from '../dist/hearth-harbor.mjs';
import {rallyFor} from '../dist/warfront-geography.mjs';
import {crossWormhole,wormholeAvailable,WORMHOLE_EXIT_CLEARANCE} from '../dist/wormhole-navigation.mjs';

function reach(s,p,seconds){
 assert.ok(requestApproach(s,p));
 for(let i=0;i<seconds*40;i++){
  if(advanceApproach(s,p,.025,relief)){assert.ok(harborStatus(p,s).ready);return (i+1)/40}
  assert.ok(s.alt>=0);
 }
 assert.fail('No valid landing within '+seconds+' simulated seconds');
}
test('Relay Crown assist descends from fresh orbit without inching through the orbital leg',()=>{
 const s=newJourney(0),p=rallyFor(s.body);
 assert.ok(s.alt>9_000_000);
 assert.ok(reach(s,p,45)>20);
});
for(const [id,port] of [[0,'Relay Crown'],[1,'Hearth Exchange']])test(port+' wormhole rejoins the same world above a physical berth',()=>{
 const s=newJourney(id),p=id===0?rallyFor(s.body):harborFor(s.body,relief);
 const body=s.body,system=s.system;
 assert.ok(wormholeAvailable(s,p,relief));
 assert.ok(crossWormhole(s,p,relief));
 assert.equal(s.body,body);
 assert.equal(s.system,system);
 assert.equal(s.v.length(),0);
 assert.ok(s.alt>=WORMHOLE_EXIT_CLEARANCE&&s.alt<WORMHOLE_EXIT_CLEARANCE+100);
 assert.equal(harborStatus(p,s).ready,false);
 assert.equal(crossWormhole(s,p,relief),false);
 assert.ok(reach(s,p,25)>10);
});
test('ship outside gate, on a different world, or already below clear orbit cannot initiate a transit',()=>{
 const s=newJourney(0),p=rallyFor(s.body),other=newJourney(1);
 assert.equal(crossWormhole(other,p,relief),false);
 s.p.z*=-1;assert.equal(crossWormhole(s,p,relief),false);
 s.p.z*=-1;s.v.x=3_000_000;
 assert.equal(crossWormhole(s,p,relief),false);
});

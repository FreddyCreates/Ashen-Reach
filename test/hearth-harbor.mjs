import test from 'node:test';
import assert from 'node:assert/strict';
import {newJourney,relief} from '../dist/deep-flight.mjs';
import {harborFor,harborStatus,harborMesh,requestApproach,advanceApproach,dockHarbor,restoreHarbor} from '../dist/hearth-harbor.mjs';
test('Nacre harbor is deterministic and contains finite world geometry',()=>{
 const a=harborFor(newJourney(1).body,relief),b=harborFor(newJourney(1).body,relief);
 assert.deepEqual(a.position.toArray(),b.position.toArray());
 assert.equal(harborFor(newJourney(0).body,relief),null);
 const mesh=harborMesh(a);assert.ok(mesh.length>300);
 assert.ok(mesh.every(t=>t.length===3&&t.every(v=>v.p.toArray().every(Number.isFinite))));
});
test('docking requires a valid pose and restores the same hull',()=>{
 const s=newJourney(1),p=harborFor(s.body,relief),ledger={};
 assert.equal(dockHarbor(s,p,ledger,0),false);
 s.p.copy(p.position).addScaledVector(p.up,3);s.v.copy(p.up).multiplyScalar(8);
 assert.equal(dockHarbor(s,p,ledger,0),false);
 s.v.set(0,0,0);s.forward.copy(p.forward);s.right.copy(p.right);
 assert.equal(dockHarbor(s,p,ledger,0),true);
 const fresh=newJourney(1);assert.equal(restoreHarbor(fresh,harborFor(fresh.body,relief),ledger.harbor,1),false);
 assert.equal(restoreHarbor(fresh,harborFor(fresh.body,relief),ledger.harbor,0),true);
 assert.ok(fresh.p.distanceTo(s.p)<.001);
});
test('assisted final descent advances actual position into landing envelope',()=>{
 const s=newJourney(1),p=harborFor(s.body,relief);
 s.p.copy(p.position).addScaledVector(p.up,200);s.v.set(0,0,0);
 assert.equal(requestApproach(s,p),true);
 for(let i=0;i<2000&&s.harborApproach;i++)advanceApproach(s,p,.05,relief);
 assert.equal(harborStatus(p,s).ready,true);
 assert.equal(s.harborApproach,false);
});

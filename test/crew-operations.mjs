import test from 'node:test';
import assert from 'node:assert/strict';
import {newJourney} from '../dist/deep-flight.mjs';
import {boardNavigator,assignLanding,advanceLanding,checkpoint,relieveNavigator,resumeLanding} from '../dist/crew-operations.mjs';
import {loadCrew,recordCrew} from '../dist/crew.mjs';

test('navigator boards a hull, crosses a system through physics and remembers the landing after reload',()=>{
 const records=new Map(),storage={getItem:k=>records.get(k),setItem:(k,v)=>records.set(k,v)};
 let crew=loadCrew(storage),ship=newJourney(0);
 const identity=crew.id;
 assignLanding(crew,ship,1,1);
 for(let i=0;i<200;i++)advanceLanding(crew,ship,.025);
 checkpoint(crew,ship);recordCrew(crew,storage,'On watch','Aurelia','Bastion');
 const pos=ship.p.toArray(),velocity=ship.v.toArray();
 crew=loadCrew(storage);ship=resumeLanding(crew,1,0);
 assert.deepEqual(ship.p.toArray(),pos);assert.deepEqual(ship.v.toArray(),velocity);
 let log;
 for(let i=0;i<12000&&!log;i++)log=advanceLanding(crew,ship,.025);
 assert.match(log,/reached Nacre/);assert.equal(ship.body.id,1);assert.ok(ship.alt<=4);
 assert.equal(crew.landings[0].hull,1);assert.equal(crew.landings[0].world,1);assert.ok(Number.isFinite(crew.landings[0].latitude));
 assert.equal(crew.id,identity);assert.equal(crew.duty,'standby');assert.equal(advanceLanding(crew,ship,.025),null);
 recordCrew(crew,storage,log,'Nacre','Bastion');assert.equal(loadCrew(storage).landings.length,1);
});
test('commands respect hull transfers, system boundaries and explicit manual overrides',()=>{
 const crew={id:'a',duty:'standby'},ship=newJourney(0);
 assert.throws(()=>assignLanding(crew,ship,2,7),RangeError);
 assignLanding(crew,ship,2,0);assert.equal(resumeLanding(crew,2,8),null);
 boardNavigator(crew,1);assert.equal(crew.flightOrder,null);assert.equal(crew.duty,'standby');
 assignLanding(crew,ship,1,2);relieveNavigator(crew);assert.equal(resumeLanding(crew,1,0),null);
});

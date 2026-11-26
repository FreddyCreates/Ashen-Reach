import test from 'node:test';
import assert from 'node:assert/strict';
import {newJourney,travel,relief} from '../dist/deep-flight.mjs';
import {newLedger,extract} from '../dist/mining.mjs';
import {buildStation,stationFor,stationDistance,stationBearing,stationMesh,serviceHull,serviceRack,serviceAvailable} from '../dist/field-station.mjs';

test('fly down, harvest a vein, construct a geographic station, reload it and use its workshop',()=>{
 const ledger=newLedger(),flight=newJourney(0),hull={hp:20};
 assert.match(buildStation(ledger,flight,relief),/Land/);
 for(let i=0;i<1700;i++)travel(flight,.025,{drive:1});
 assert.equal(flight.alt,3);
 assert.match(buildStation(ledger,flight,relief),/requires 4/);
 extract(ledger,0,'field/test');
 assert.match(buildStation(ledger,flight,relief),/online/);assert.equal(ledger.ore[0],0);
 const stored=JSON.parse(JSON.stringify(ledger)),station=stationFor(stored,0);
 assert.ok(stationDistance(station,flight)<26);
 assert.match(stationBearing(station,flight),/ahead/);
 assert.ok(stationMesh(station,flight.body).length>60);
 assert.match(buildStation(stored,flight,relief),/already/);
 assert.match(serviceHull(stored,flight,hull,100),/repaired/);assert.equal(hull.hp,100);
 stored.credits=45;assert.match(serviceRack(stored,flight),/fitted/);assert.equal(stored.credits,0);
 for(let i=0;i<800;i++)travel(flight,.025,{drive:1});
 assert.ok(stationDistance(station,flight)>65);assert.equal(serviceAvailable(stored,flight),false);
 assert.match(serviceRack(stored,flight),/within 65/);
});
test('cloud decks do not support construction or spend any ferrite',()=>{
 const ledger=newLedger(),gas=newJourney(2);ledger.ore[0]=4;gas.alt=3;
 assert.match(buildStation(ledger,gas,relief),/solid ground/);assert.equal(ledger.ore[0],4);
});

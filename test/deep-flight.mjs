import test from 'node:test';
import assert from 'node:assert/strict';
import {newJourney,travel} from '../dist/deep-flight.mjs';
const advance=(s,seconds,input)=>{for(let i=0;i<seconds*50;i++)travel(s,.02,input)};
test('same ship descends from orbit, drives, lifts off and reaches a second planet',()=>{
 const s=newJourney(0);
 assert.ok(s.alt>9e6);
 advance(s,50,{drive:1});assert.equal(s.alt,3);
 const landing=s.p.clone();
 advance(s,30,{drive:1});assert.ok(s.p.distanceTo(landing)>300);assert.equal(s.alt,3);
 s.target=s.system[1];advance(s,230,{drive:1});
 assert.equal(s.body.id,1);assert.equal(s.alt,3);assert.ok(s.p.distanceTo(landing)>1e8);
});
test('unpowered gravity and escape beyond planetary system',()=>{
 const s=newJourney(0);s.cruise=false;travel(s,.02,{});assert.ok(s.v.z<0);
 s.v.set(0,0,1e8);advance(s,100,{});assert.ok(s.p.z>9e9);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrajectory,stepTrajectory,orbitReadout} from '../dist/orbital-flight.mjs';
test('a full unpowered orbit preserves energy and radius',()=>{
 const s=createTrajectory({id:0},0),before=orbitReadout(s),r=s.x;
 stepTrajectory(s,2*Math.PI*Math.sqrt(r**3/s.mu));
 assert.ok(Math.abs(orbitReadout(s).energy/before.energy-1)<1e-7);
 assert.ok(Math.hypot(s.x-r,s.y)<r*1e-4);
});
test('retrograde thrust lowers periapsis and can enter the atmosphere',()=>{
 const s=createTrajectory({id:0},0),before=orbitReadout(s);
 stepTrajectory(s,120,0,-1);assert.ok(orbitReadout(s).periapsis<before.periapsis);
 assert.equal(stepTrajectory(s,20000),'entry')
});

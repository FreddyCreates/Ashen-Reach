import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDistrict,serializeDistrict,contractOffers,acceptContract,destination,
  dockShip,refit,tickDistrict,phaseVeil
} from '../dist/freeroam.mjs';

test('freight playthrough starts at a dock, transports cargo under thrust, pays once and buys a refit',()=>{
  const s=createDistrict(2,1),[offer]=contractOffers(s),start={...s.player};
  acceptContract(s,'medical');dockShip(s);assert.equal(s.job.stage,'delivery');
  const restored=createDistrict(2,1,serializeDistrict(s));assert.deepEqual(restored.job,s.job);
  restored.course=destination(restored).id;
  for(let ticks=0;ticks<60*90&&restored.course!==null;ticks++)tickDistrict(restored);
  assert.equal(restored.course,null);assert.ok(Math.hypot(restored.player.x-start.x,restored.player.z-start.z)>80);
  assert.match(dockShip(restored),/delivered/);assert.equal(restored.completed,1);
  assert.equal(restored.credits,offer.reward);dockShip(restored);assert.equal(restored.credits,offer.reward);
  assert.match(refit(restored),/installed/);assert.equal(restored.credits,offer.reward-100);
  assert.equal(createDistrict(2,1,serializeDistrict(restored)).tuning,1);
});

test('cold thrust preserves coasting momentum, full brake stops, light hull accelerates faster',()=>{
  const fast=createDistrict(1,0),heavy=createDistrict(1,1);
  for(let i=0;i<60;i++)for(const s of [fast,heavy])tickDistrict(s,{x:1});
  assert.ok(fast.player.vx>heavy.player.vx);const vx=fast.player.vx;
  for(let i=0;i<60;i++)tickDistrict(fast);
  assert.equal(vx,fast.player.vx);for(let i=0;i<120;i++)tickDistrict(fast,{brake:true});
  assert.ok(Math.abs(fast.player.vx)<.01);
});

test('spirit interrupts an inspection and customs eventually seizes an exposed sealed load',()=>{
  const s=createDistrict(0,2,{credits:105});
  acceptContract(s,'sealed');dockShip(s);const officer=s.agents.at(-1);
  Object.assign(officer,{x:s.player.x,z:s.player.z});
  for(let i=0;i<90;i++)tickDistrict(s);assert.ok(officer.scan>1);
  phaseVeil(s);tickDistrict(s);assert.equal(officer.scan,0);
  assert.ok(s.job&&s.cooldown>12);
  for(let i=0;i<4800&&s.job;i++)tickDistrict(s);
  assert.equal(s.job,null);assert.equal(s.credits,60);assert.equal(s.heat,0);
});

test('resident carriers visit docks and exchange actual freight stocks while the player idles',()=>{
  const s=createDistrict(1,1),start=s.freight.slice();
  for(let i=0;i<60*17;i++)tickDistrict(s);
  assert.ok(s.agents.some(a=>a.kind==='carrier'&&a.runs>0));
  assert.notDeepEqual(s.freight,start);
});

test('reject invalid save cargo and isolate local district records',()=>{
  const s=createDistrict(0,2,{credits:-1,tuning:44,dock:77,job:{reward:1e22},state:[NaN,1,2,3]});
  assert.equal(s.credits,0);assert.equal(s.tuning,0);assert.equal(s.job,null);assert.equal(s.dock,0);
  assert.equal(s.player.x,s.ports[0].x);
});

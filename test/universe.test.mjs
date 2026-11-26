import assert from 'node:assert/strict';
import test from 'node:test';
import {cycle,epoch,interval,world,frontier} from '../dist/universe.mjs';
test('governors complete one project per tick and catch up deterministically',()=>{
 for(let i=0;i<10;i++)for(let t=0;t<100;t++){
  const w=world(i,t),next=world(i,t+1);
  assert.deepEqual(w,world(i,t));assert.equal(next.buildings.reduce((a,b)=>a+b,0)-w.buildings.reduce((a,b)=>a+b,0),next.age-w.age);
  assert.ok(next.buildings.every((n,j)=>n>=w.buildings[j]))
 }
});
test('new worlds start with founding infrastructure',()=>{for(let t=8;t<=80;t+=8){assert.equal(world(frontier(t)-1,t).age,0);assert.equal(cycle(epoch+t*interval),t)}});

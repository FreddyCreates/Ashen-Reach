import test from 'node:test';import assert from 'node:assert/strict';
import {newLedger,capacity,extract,sell,upgrade,quote} from '../dist/mining.mjs';
test('mine, transport, sell once, fit rack and preserve depletion on reload',()=>{
 let l=newLedger();for(let i=0;i<4;i++)extract(l,0,i);assert.equal(l.ore[0],12);
 l=JSON.parse(JSON.stringify(l));sell(l,0,1);sell(l,0,1);assert.equal(l.credits,12*quote(0,1));
 upgrade(l);assert.equal(capacity(l),20);extract(l,0,0);assert.equal(l.ore[0],0);extract(l,0,3);assert.equal(l.ore[0],4)
})

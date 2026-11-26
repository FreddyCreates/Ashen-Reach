import test from 'node:test';
import assert from 'node:assert/strict';
import {noteLanding,landingEntries,surfaceArc} from '../dist/landing-atlas.mjs';
test('landing observations retain order through eviction and longitude wrap',()=>{
 const a={world:0,latitude:0,longitude:Math.PI-.001,radius:1000};
 const b={...a,longitude:-Math.PI+.001};
 assert.ok(Math.abs(surfaceArc(a,b)-2)<1e-6);
 assert.equal(surfaceArc(a,{...b,world:1}),null);
 const crew={landings:[a]};
 for(let i=0;i<40;i++)noteLanding(crew,b);
 const view=landingEntries(JSON.parse(JSON.stringify(crew)),a);
 assert.equal(view.length,32);assert.equal(view[0].beat,41);assert.equal(view.at(-1).beat,10);
});

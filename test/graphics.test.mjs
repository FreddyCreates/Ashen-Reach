import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {shipModel,deckModel} from '../dist/fleet-models.mjs';
for(const [kind,count,create,budget] of [['ships',4,shipModel,3500],['decks',3,deckModel,7500]]){
 test(kind+' have valid indexed geometry and matching baked lighting',()=>{
  for(let id=0;id<count;id++){
   const root=create(id),samples=readFileSync(new URL('../dist/art/'+kind+'-'+id+'.ao',import.meta.url));
   let vertices=0,triangles=0;
   for(const mesh of root.children){
    const geo=mesh.geometry,n=geo.attributes.position.count;
    vertices+=n;triangles+=geo.index.count/3;
    assert.equal(n,geo.attributes.normal.count);assert.equal(n,geo.attributes.uv.count);
    assert.ok(geo.index.array.every(v=>v<n));
    assert.ok(geo.attributes.position.array.every(Number.isFinite));
    assert.ok(geo.attributes.normal.array.every(Number.isFinite))
   }
   assert.equal(samples.length,vertices);assert.ok(Math.min(...samples)<210);
   assert.ok(triangles<=budget);assert.ok(root.children.length<=20)
  }
 })
}

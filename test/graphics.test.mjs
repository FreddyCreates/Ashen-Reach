import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {shipModel,deckModel,shipDetailModel,shipLandingLegs,shipLandingModel} from '../dist/fleet-models.mjs';
import {Box3,Vector3} from '../dist/three.module.js';
import {makeCoastalWater,surfaceLightFor} from '../dist/surface-lighting.mjs';
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

test('fleet close meshes are material-batched and fit the original hull envelope',()=>{
 for(const id of [0,1,2]){
  const base=shipModel(id),close=shipDetailModel(id);
  const baseBounds=new Box3().setFromObject(base).expandByVector(new Vector3(.16,.16,.21));
  const closeBounds=new Box3().setFromObject(close);
  assert.ok(baseBounds.containsBox(closeBounds));
  assert.ok(close.children.length<=8);
  let triangles=0;
  for(const {geometry:g,material:m} of close.children){
   const {position:p,normal:n,uv}=g.attributes;
   assert.ok(p.array.every(Number.isFinite)&&n.array.every(Number.isFinite)&&uv.array.every(Number.isFinite));
   assert.equal(p.count,n.count);assert.equal(p.count,uv.count);
   assert.ok(g.index.array.every(i=>i<p.count));
   assert.ok(m.roughness>=0&&m.roughness<=1);
   triangles+=g.index.count/3;
  }
  assert.ok(triangles>=1500&&triangles<=2600);
 }
});
test('only solid coastal worlds render water and its visual clock leaves sea level unchanged',()=>{
 assert.equal(makeCoastalWater(0),null);
 assert.equal(makeCoastalWater(2),null);
 assert.notEqual(surfaceLightFor(1).water,surfaceLightFor(3).water);
 const water=makeCoastalWater(1);
 const p=water.geometry.attributes.position;
 water.position.set(20,0,-14);water.updateMatrixWorld();
 for(let i=0;i<p.count;i++)assert.ok(Math.abs(new Vector3().fromBufferAttribute(p,i).applyMatrix4(water.matrixWorld).y)<1e-6);
 water.userData.time.value=30;
 assert.equal(water.material.uniforms.uTime.value,30);
});

test('ground-specific gear places three skid bases exactly on sampled local terrain',()=>{
 for(const id of [0,1,2]){
  const ground=[-.53,-.68,-.51],gear=shipLandingModel(id,ground);
  const skids=gear.children.find(mesh=>mesh.material.color.getHexString()==='202830');
  const points=skids.geometry.attributes.position;
  for(const [i,[x,z]] of shipLandingLegs(id).entries()){
   const contacts=[];
   for(let k=0;k<points.count;k++)
    if(Math.abs(points.getX(k)-x)<.16&&Math.abs(points.getZ(k)-z)<.18)contacts.push(points.getY(k));
   assert.ok(contacts.length);
   assert.ok(Math.abs(Math.min(...contacts)-ground[i])<1e-6);
  }
 }
});

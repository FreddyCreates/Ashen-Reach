import test from 'node:test';
import assert from 'node:assert/strict';
import {MeshForge,sentinelMesh,surveyCacheMesh} from '../dist/forge-mesh.mjs';
import {tileMesh,TILE} from '../dist/terrain-stream.mjs';
import {newJourney} from '../dist/deep-flight.mjs';
import {tangentFrame} from '../dist/planet-geography.mjs';
test('Forge models contain finite normals and valid indexed triangles',()=>{
 for(const m of [sentinelMesh(),surveyCacheMesh()]){
  assert.ok(m.positions.length>100);assert.equal(m.normals.length,m.positions.length);
  assert.equal(m.uvs.length,m.positions.length/3*2);
  assert.ok(m.indices.every(i=>i<m.positions.length/3));
  assert.ok(m.positions.every(Number.isFinite));
  assert.equal(m.groups.reduce((n,g)=>n+g.count,0),m.indices.length);
 }
 assert.throws(()=>new MeshForge().chamferBox(1,1,1,.9));
});
test('fine terrain boundary follows coarse adjacent tile',()=>{
 const j=newJourney(1),f=tangentFrame(j.body,j.p);
 const a=tileMesh(f,0,0,true,{east:true}),b=tileMesh(f,1,0,false);
 const p=a.attributes.position,q=b.attributes.position;
 for(let i=0;i<=64;i++){
  const row=Math.floor(i/4),t=i%4/4;
  const y=q.getY(row*17)*(1-t)+q.getY(Math.min(16,row+1)*17)*t;
  assert.ok(Math.abs(p.getY(i*65+64)-y)<.001);
  assert.equal(p.getX(i*65+64),TILE);
 }
 a.dispose();b.dispose();
});

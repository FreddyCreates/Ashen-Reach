import test from 'node:test';
import assert from 'node:assert/strict';
import {newJourney,relief} from '../dist/deep-flight.mjs';
import {bedrock,tangentFrame,directionAt,localHeight,localCoordinates,toJourney} from '../dist/planet-geography.mjs';
import {createSurvey,surveyHeight,terrainContact,advanceSurvey} from '../dist/survey.mjs';
test('spherical bedrock retains bathymetry and waterline collision',()=>{
 const body=newJourney(1).body;let wet=0,dry=0;
 for(let i=0;i<180;i++){const n=body.center.clone().set(Math.cos(i*2.399),Math.sin(i*.43),Math.sin(i*2.399)).normalize();const h=bedrock(body,n);assert.ok(Number.isFinite(h));assert.equal(relief(body,n),Math.max(0,h));if(h<0)wet++;else dry++}
 assert.ok(wet>0&&dry>0);
});
test('same terrain and physical pose through survey handoff',()=>{
 for(const id of [0,1,3]){
 const j=newJourney(id),n=j.p.clone().sub(j.body.center).normalize();
 j.p.copy(j.body.center).addScaledVector(n,j.body.r+relief(j.body,n)+100);
 j.forward.set(0,1,0);j.right.set(1,0,0);j.v.set(8,12,-3);
 const initial=j.p.clone(),v=j.v.clone(),s=createSurvey(id,0,j);
 assert.ok(s.frame);assert.ok(Math.abs(s.clearance-100)<1e-6);
 assert.equal(surveyHeight(id,0,0,s.frame),bedrock(j.body,n));
 assert.ok(toJourney(s,j));assert.ok(j.p.distanceTo(initial)<1e-6);assert.ok(j.v.distanceTo(v)<1e-6);
 s.x=140;s.z=-200;s.y=terrainContact(id,s.x,s.z,s.frame)+80;
 const expected=directionAt(s.frame,s.x,s.z);assert.ok(toJourney(s,j));
 assert.ok(j.p.clone().sub(j.body.center).normalize().distanceTo(expected)<1e-9);
 assert.ok(Math.abs(j.alt-80)<1e-6);
 const coords=localCoordinates(s.frame,s.x,s.z);assert.ok(Number.isFinite(coords.latitude)&&Number.isFinite(coords.longitude));
 }
});
test('gas giant retains cloud survey rather than fictitious solid surface',()=>assert.equal(createSurvey(2,0,newJourney(2)).frame,undefined));

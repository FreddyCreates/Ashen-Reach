import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSurvey,advanceSurvey,surveyHeight,terrainContact,surveyStatus,surveyProfile} from '../dist/survey.mjs';
function fly(s,time,input,hz=60){for(let n=0;n<Math.round(time*hz);n++)advanceSurvey(s,1/hz,input)}
test('surface relief is repeatable at a coordinate and differs within and between four worlds',()=>{
 for(const id of [0,1,2,3,4,150]){
  const a=surveyHeight(id,17.546,-33.055);
  assert.equal(surveyHeight(id,17.546,-33.055),a);assert.notEqual(a,surveyHeight(id,18.546,-33.055));
  assert.notEqual(a,surveyHeight(id+4,17.546,-33.055));assert.ok(surveyStatus(createSurvey(id,1)).includes(surveyProfile(id).name));
 }
});
test('fixed-step flight is invariant across frame rates and releases thrust into a coast',()=>{
 const a=createSurvey(0,0),b=createSurvey(0,0);fly(a,3,{turn:.2,throttle:.7},30);fly(b,3,{turn:.2,throttle:.7},120);
 for(const key of ['x','y','z','vx','vy','vz','yaw','bank'])assert.ok(Math.abs(a[key]-b[key])<1e-9,key);
 const prev=a.z;fly(a,.5,{});assert.ok(a.z<prev);
});
test('mass and thrust change acceleration and reverse thrust reduces forward velocity',()=>{
 const light=createSurvey(0,0),heavy=createSurvey(0,1);fly(light,2,{throttle:1});fly(heavy,2,{throttle:1});
 assert.ok(light.vz<heavy.vz);const prev=light.vz;fly(light,.5,{throttle:-1});assert.ok(light.vz>prev)
});
test('gear supports land contact and allows liftoff; sea surface supports a waterline',()=>{
 const s=createSurvey(0,1);s.vz=0;s.y=terrainContact(0,s.x,s.z)+4;s.vy=-10;fly(s,1,{lift:-1});
 assert.ok(s.landed);assert.equal(s.clearance,2.5);assert.ok(surveyStatus(s).includes('Ground contact'));fly(s,2,{lift:1});assert.ok(!s.landed&&s.clearance>5);
 let water=false;for(let x=-4000;x<4000;x+=140)if(surveyHeight(1,x,100)<0){assert.equal(terrainContact(1,x,100),0);water=true;break}assert.ok(water)
});
test('giant cloud decks admit atmospheric penetration without ground contact',()=>{
 const s=createSurvey(2,0);s.y=terrainContact(2,s.x,s.z)-5;s.vy=-7;advanceSurvey(s,.1,{lift:-1});
 assert.ok(s.clearance<0);assert.ok(!s.landed);
});
test('reaching a low-altitude beacon records it once and moves the next destination',()=>{
 const s=createSurvey(0,0),first={...s.site};s.x=s.site.x;s.z=s.site.z;s.y=terrainContact(0,s.x,s.z)+30;s.vz=0;fly(s,1.3,{});
 assert.equal(s.scans,1);assert.notDeepEqual(s.site,first);assert.ok(surveyStatus(s).includes('recorded'));fly(s,.6,{});assert.equal(s.scans,1)
});

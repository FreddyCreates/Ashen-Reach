import test from 'node:test';
import assert from 'node:assert/strict';
import {restoreArmory,purchase,equip,shipWeapon,groundWeapon} from '../dist/armory.mjs';
import {newJourney,relief} from '../dist/deep-flight.mjs';
import {createExpedition,canDisembark,fireGround,interactGround,settleExpedition,stepExpedition} from '../dist/surface-expedition.mjs';
test('armory debits once, restores only owned valid loadouts',()=>{
 const s={credits:200,armory:restoreArmory({ship:['nova'],ground:'disruptor'})};
 assert.equal(shipWeapon(s,0).id,'pulse');assert.equal(groundWeapon(s).id,'sidearm');
 purchase(s,'lance');assert.equal(s.credits,90);purchase(s,'lance');assert.equal(s.credits,90);
 equip(s,'lance',1);assert.equal(shipWeapon(s,1).damage,2);assert.equal(shipWeapon(s,0).id,'pulse');
 purchase(s,'nova');assert.equal(s.credits,90);
 s.armory=restoreArmory(JSON.parse(JSON.stringify(s.armory)));assert.equal(shipWeapon(s,1).id,'lance');
});
test('landed expedition pays once and returns to actual ship',()=>{
 const j=newJourney(0),n=j.p.clone().sub(j.body.center).normalize();
 assert.equal(canDisembark(j),false);j.p.copy(j.body.center).addScaledVector(n,j.body.r+relief(j.body,n)+3);j.alt=3;
 const l={credits:0,armory:restoreArmory()},s=createExpedition(j,l);assert.ok(s);assert.equal(s.sites.length,5);
 stepExpedition(s,{drive:1},.05,l);assert.ok(s.z<0);
 for(const t of s.sites){s.x=t.x;s.z=t.z;if(t.kind==='sample')interactGround(s,l);else{s.z=t.z+10;s.yaw=0;for(let i=0;i<3;i++){s.fire=0;fireGround(s,l)}assert.equal(t.hp,0)}}
 s.x=0;s.z=0;assert.match(settleExpedition(s,l),/90/);assert.equal(l.credits,90);settleExpedition(s,l);assert.equal(l.credits,90);
 assert.equal(createExpedition(j,l).done,true);
});
test('gas giant and moving spacecraft cannot disembark',()=>{const j=newJourney(2);j.alt=3;assert.equal(canDisembark(j),false);const k=newJourney(0);k.alt=3;k.v.set(3,0,0);assert.equal(canDisembark(k),false)});

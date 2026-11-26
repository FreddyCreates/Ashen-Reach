import assert from 'node:assert/strict';
import test from 'node:test';
import {pilot,loadCrew,recordCrew} from '../dist/crew.mjs';
import {advanceSurvey,createSurvey} from '../dist/survey.mjs';
test('Astra pilots each hull to a scan and reloads the same identity and receipt',()=>{
 const mem=new Map(),storage={getItem:k=>mem.get(k),setItem:(k,v)=>mem.set(k,v)};
 const crew=loadCrew(storage);
 for(let ship=0;ship<3;ship++){const s=createSurvey(ship,ship);
 for(let i=0;i<18000&&!s.scans;i++)advanceSurvey(s,1/60,pilot(s));
 assert.equal(s.scans,1);recordCrew(crew,storage,'Scan complete',s.id,ship)}
 const copy=loadCrew(storage);assert.equal(copy.id,crew.id);assert.equal(copy.log.length,3)
});

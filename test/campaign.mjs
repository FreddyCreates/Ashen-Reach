import test from 'node:test';
import assert from 'node:assert/strict';
import {acceptSignal, blockadeActive, clearBlockade, broadcast, episode, factions, fitRepeater, restoreCampaign, salePremium, spiritCooldown} from '../dist/campaign.mjs';
import {newLedger, extract} from '../dist/mining.mjs';

function reload(ledger) {
  const copy=JSON.parse(JSON.stringify(ledger));
  copy.campaign=restoreCampaign(copy.campaign);
  return copy;
}

test('legacy mining saves preserve their cargo and receive the opening signal',()=>{
  const ledger=newLedger();
  extract(ledger,0,'landing');
  const resumed=reload(ledger);
  assert.equal(episode(resumed).stage,'signal');
  assert.deepEqual(resumed.ore,ledger.ore);
  assert.deepEqual(resumed.mined,ledger.mined);
  assert.equal(restoreCampaign({stage:'complete',ally:'broken'}).stage,'broadcast');
});

for(const ally of factions)test('play through The Choir Line and reload the '+ally+' ending',()=>{
  let ledger=reload(newLedger());
  assert.equal(acceptSignal(ledger),true);
  assert.equal(acceptSignal(ledger),false);
  const first=ledger.ore.slice();
  fitRepeater(ledger,1);
  assert.deepEqual(ledger.ore,first);
  extract(ledger,0,'Aurelia highlands');
  fitRepeater(ledger,0);
  assert.equal(ledger.ore[0],4);
  assert.equal(episode(ledger).stage,'repeater');
  fitRepeater(ledger,1);
  ledger=reload(ledger);
  assert.equal(ledger.ore[0],0);
  assert.equal(episode(ledger).stage,'blockade');
  fitRepeater(ledger,1);
  assert.equal(ledger.ore[0],0);
  assert.equal(blockadeActive(ledger,3),true);
  assert.equal(clearBlockade(ledger,3,false),false);
  assert.equal(clearBlockade(ledger,0,true),false);
  assert.equal(broadcast(ledger,ally),false);
  assert.equal(clearBlockade(ledger,3,true),true);
  assert.equal(clearBlockade(ledger,3,true),false);
  ledger=reload(ledger);
  assert.equal(broadcast(ledger,'unrecognized'),false);
  assert.equal(broadcast(ledger,ally),true);
  ledger=reload(ledger);
  assert.equal(broadcast(ledger,factions.find(f=>f!==ally)),false);
  assert.equal(ledger.campaign.ally,ally);
  assert.equal(episode(ledger).stage,'complete');
  assert.equal(salePremium(ledger,0,1),ally==='Lantern Guild'?3:0);
  assert.equal(salePremium(ledger,1,1),0);
  assert.equal(salePremium(ledger,0,0),0);
  assert.equal(spiritCooldown(ledger,21),ally==='Wakekeepers'?17:21);
});

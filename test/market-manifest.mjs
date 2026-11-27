import test from 'node:test';
import assert from 'node:assert/strict';
import {newLedger} from '../dist/mining.mjs';
import {activeMarketManifest,marketInventory,createMarketManifest,settleMarketManifest,cancelMarketManifest} from '../dist/market-manifest.mjs';

const reload=value=>JSON.parse(JSON.stringify(value));

test('Hearth manifest settles ship cargo into station stock exactly once across reloads',()=>{
 let ledger=newLedger();ledger.ore[0]=4;
 const loaded=createMarketManifest(ledger,0,1,24);
 assert.equal(loaded.ok,true);assert.equal(ledger.ore[0],4);assert.equal(ledger.credits,0);
 const id=loaded.manifest.id;ledger=reload(ledger);
 const delivery=settleMarketManifest(ledger,id,1);
 assert.equal(delivery.ok,true);assert.equal(delivery.already,false);
 assert.equal(ledger.ore[0],0);assert.equal(ledger.credits,96);
 assert.deepEqual(marketInventory(ledger,1),[4,0,0,0]);
 const snapshot=reload(ledger),retry=settleMarketManifest(ledger,id,1);
 assert.equal(retry.ok,true);assert.equal(retry.already,true);assert.deepEqual(ledger,snapshot);
 ledger=reload(ledger);assert.equal(settleMarketManifest(ledger,id,1).already,true);
 assert.equal(ledger.credits,96);assert.deepEqual(marketInventory(ledger,1),[4,0,0,0]);
});

test('a loaded manifest is exclusive, station-bound and cancellable without consuming cargo',()=>{
 const ledger=newLedger();ledger.ore[0]=6;ledger.ore[1]=3;
 const first=createMarketManifest(ledger,0,1,21),before=reload(ledger);
 assert.equal(createMarketManifest(ledger,1,1,30).ok,false);
 assert.equal(settleMarketManifest(ledger,first.manifest.id,2).ok,false);
 assert.deepEqual(ledger,before);
 ledger.ore[0]=5;const short=reload(ledger);
 assert.equal(settleMarketManifest(ledger,first.manifest.id,1).ok,false);assert.deepEqual(ledger,short);
 assert.equal(cancelMarketManifest(ledger,first.manifest.id).ok,true);
 assert.equal(ledger.ore[0],5);assert.equal(activeMarketManifest(ledger),null);
});

test('old saves are upgraded lazily and malformed terms cannot mutate the ledger',()=>{
 const ledger={credits:0,rack:0,ore:[2,0,0,0],mined:{}},before=reload(ledger);
 assert.equal(activeMarketManifest(ledger),null);
 assert.equal(createMarketManifest(ledger,4,1,12).ok,false);
 assert.equal(createMarketManifest(ledger,0,1,Number.MAX_SAFE_INTEGER).ok,false);
 assert.deepEqual(ledger.ore,before.ore);assert.equal(ledger.credits,before.credits);
 assert.deepEqual(marketInventory(ledger,1),[0,0,0,0]);
});

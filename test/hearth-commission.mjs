import test from 'node:test';
import assert from 'node:assert/strict';
import {newLedger, extract} from '../dist/mining.mjs';
import {restoreCampaign} from '../dist/campaign.mjs';
import {newJourney, relief} from '../dist/deep-flight.mjs';
import {harborFor, requestApproach, advanceApproach, dockHarbor, harborMesh} from '../dist/hearth-harbor.mjs';
import {commission, commissionedBuilding, commissionDelivery} from '../dist/hearth-commission.mjs';
import {createMarketManifest, cancelMarketManifest} from '../dist/market-manifest.mjs';

for (const [ally, source, units, id, payout] of [
  ['Lantern Guild', 1, 8, 'depot', 72],
  ['Wakekeepers', 3, 4, 'mast', 64]
]) {
  test(ally + ' captain gathers materials, lands and opens a permanent berth service', () => {
    let ledger = newLedger();
    assert.equal(commission(ledger), undefined);
    ledger.campaign = restoreCampaign({stage:'complete', ally});
    assert.equal(commission(ledger).id, id);
    for (let site = 0; site < units / 4; site++) extract(ledger, source, site);
    commissionDelivery(ledger, false);
    assert.equal(ledger.ore[source], units);
    const flight = newJourney(1), port = harborFor(flight.body, relief);
    requestApproach(flight, port);
    for (let i=0; i<60000 && flight.harborApproach; i++) advanceApproach(flight, port, .05, relief);
    const docked = dockHarbor(flight, port, ledger, 0);
    assert.equal(docked, true);
    const load = createMarketManifest(ledger, source, 1, 10);
    commissionDelivery(ledger, docked);
    assert.equal(ledger.credits, 0);
    cancelMarketManifest(ledger, load.manifest.id);
    commissionDelivery(ledger, docked);
    ledger = JSON.parse(JSON.stringify(ledger));
    commissionDelivery(ledger, docked);
    assert.equal(ledger.credits, payout);
    assert.equal(ledger.ore[source], 0);
    assert.equal(commissionedBuilding(ledger), id);
    assert.ok(harborMesh(port,id).length > harborMesh(port).length);
  });
}

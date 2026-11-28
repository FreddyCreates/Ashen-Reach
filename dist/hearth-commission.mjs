import {activeMarketManifest} from './market-manifest.mjs';

const commissions = new Map([
  ['Lantern Guild', {id:'depot', name:'Cold-chain depot', cargo:'brine ice', resource:1, units:8, source:1, place:'Nacre', reward:72}],
  ['Wakekeepers', {id:'mast', name:'Listening mast', cargo:'basalt glass', resource:3, units:4, source:3, place:'Orison', reward:64}]
]);

export function commission(ledger) {
  if (ledger.campaign?.stage === 'complete') return commissions.get(ledger.campaign.ally);
}

export function commissionedBuilding(ledger) {
  const job = commission(ledger);
  return job && ledger.hearthProject === job.id ? job.id : null;
}

export function commissionDelivery(ledger, docked) {
  const job = commission(ledger);
  if (!job || !docked) return 'Secure your hull at Hearth N-04 to deliver.';
  if (commissionedBuilding(ledger)) return job.name + ' is already operating.';
  const manifest = activeMarketManifest(ledger);
  const reserved = manifest?.resource === job.resource ? manifest.units : 0;
  const aboard = ledger.ore[job.resource];
  if (!Number.isSafeInteger(aboard) || aboard - reserved < job.units)
    return 'Deliver ' + job.units + ' units of unmanifested ' + job.cargo + '.';
  if (!Number.isSafeInteger(ledger.credits) || !Number.isSafeInteger(ledger.credits + job.reward))
    return 'Unable to settle this fleet balance.';
  ledger.ore[job.resource] -= job.units;
  ledger.credits += job.reward;
  ledger.hearthProject = job.id;
  return job.name + ' operational. Fleet paid ' + job.reward + ' credits.';
}

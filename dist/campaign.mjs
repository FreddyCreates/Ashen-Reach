// The campaign and its cargo live in the same mining ledger snapshot.
// The combat encounter is transient. Its completed objective survives a reload.
const stages = ['signal', 'repeater', 'blockade', 'broadcast', 'complete'];
export const factions = ['Lantern Guild', 'Wakekeepers'];

export function restoreCampaign(raw) {
  const stage = stages.includes(raw?.stage) ? raw.stage : 'signal';
  const ally = stage === 'complete' && factions.includes(raw?.ally) ? raw.ally : null;
  return {stage: stage === 'complete' && !ally ? 'broadcast' : stage, ally};
}

export function episode(ledger) {
  const {stage, ally} = ledger.campaign;
  const copy = {
    signal: ['Dead air', 'The Nine Lanterns medical convoy vanished before reaching Orison. Tonight a pilot on its last ship is reading nursery names over a repeater that lost power eleven years ago. Astra recognizes the carrier tone.'],
    repeater: ['Four measures of iron', 'At Aurelia, descend and extract ferrite, or send Astra to a survey beacon. Bring four units to the Nacre freeport. Open Dispatch, then Mineral exchange, and fit the repeater there. Ferrite aboard: ' + ledger.ore[0] + '/4.'],
    blockade: ['Names on the wire', 'The repeater carries voices from the Orison blockade. Enter the Orison combat patrol, summon your spirit while the blockade is active, then clear the hostile ships. Your spirit can read the convoy’s call signs through the interference.'],
    broadcast: ['Who keeps the frequency?', 'All nine lanterns answer. Each is a spirit carrying the last directions its pilot heard. The Lantern Guild wants to publish the route for freighters. The Wakekeepers ask to keep an open channel for the dead. Choose who receives the repeater key.'],
    complete: ally === 'Lantern Guild'
      ? ['The open lane', 'The Guild prints the Nine Lanterns route on every Nacre freight docket. A clinic freighter is the first ship to cross. Your fleet earns three extra credits per unit of ferrite sold at Nacre.']
      : ['The night watch', 'The Wakekeepers reserve a watch at Orison for every lost crew. The spirits now answer your fleet four seconds sooner after each patrol summons.']
  };
  const [title, body] = copy[stage];
  return {title, body, stage};
}

export function acceptSignal(ledger) {
  if (ledger.campaign.stage !== 'signal') return false;
  ledger.campaign.stage = 'repeater';
  return true;
}

export function fitRepeater(ledger, worldId) {
  if (ledger.campaign.stage !== 'repeater') return 'The relay has no open installation order.';
  if (worldId !== 1) return 'The relay socket is at Nacre freeport.';
  if (ledger.ore[0] < 4) return 'Four units of ferrite are required. Extract ferrite on Aurelia.';
  ledger.ore[0] -= 4;
  ledger.campaign.stage = 'blockade';
  return 'Repeater online. Nine Lanterns is transmitting from Orison. Open The Choir Line on your bridge.';
}

export function blockadeActive(ledger, worldId) {
  return ledger.campaign.stage === 'blockade' && worldId === 3;
}

export function clearBlockade(ledger, worldId, spiritLinked) {
  if (!blockadeActive(ledger, worldId) || !spiritLinked) return false;
  ledger.campaign.stage = 'broadcast';
  return true;
}

export function broadcast(ledger, ally) {
  if (ledger.campaign.stage !== 'broadcast' || !factions.includes(ally)) return false;
  ledger.campaign = {stage:'complete', ally};
  return true;
}

export function salePremium(ledger, resource, worldId) {
  return ledger.campaign.ally === 'Lantern Guild' && resource === 0 && worldId === 1 ? 3 : 0;
}

export function spiritCooldown(ledger, base) {
  return base - (ledger.campaign.ally === 'Wakekeepers' ? 4 : 0);
}

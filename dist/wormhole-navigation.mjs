// Paired, geographically anchored ship transits. No change to the current body or saved economy.
export const WORMHOLE_MIN_CLEARANCE = 60_000;
export const WORMHOLE_EXIT_CLEARANCE = 9_000;
export function wormholeAvailable(ship, berth, relief) {
 if(!ship||!berth||berth.body!==ship.body?.id||!ship.p||!ship.v)return false;
 const offset=ship.p.clone().sub(ship.body.center);
 const radial=offset.length();
 // Only activate a gate in the departure corridor above this port, and never at a berth.
 const clearance=radial-ship.body.r-relief(ship.body,offset.normalize());
 return clearance>=WORMHOLE_MIN_CLEARANCE&&offset.dot(berth.up)>.65&&ship.v.length()<2_000_000;
}
export function crossWormhole(ship, berth, relief) {
 if(!wormholeAvailable(ship,berth,relief))return false;
 const terrain=relief(ship.body,berth.up);
 const deck=berth.position.distanceTo(ship.body.center)-ship.body.r;
 const altitude=Math.max(terrain,deck)+WORMHOLE_EXIT_CLEARANCE;
 ship.p.copy(ship.body.center).addScaledVector(berth.up,ship.body.r+altitude);
 ship.alt=altitude-terrain;
 ship.v.set(0,0,0);ship.forward.copy(berth.forward);ship.right.copy(berth.right);
 ship.target=ship.body;ship.aim=false;ship.cruise=true;ship.harborApproach=false;
 return true;
}

const RESOURCE_COUNT=4;

const whole=value=>Number.isSafeInteger(value)&&value>=0;
const validResource=value=>Number.isSafeInteger(value)&&value>=0&&value<RESOURCE_COUNT;
const validWorld=value=>Number.isSafeInteger(value)&&value>=0;

function marketState(ledger){
 if(!ledger||typeof ledger!=='object')throw new TypeError('A cargo ledger is required.');
 if(!ledger.market||typeof ledger.market!=='object'||Array.isArray(ledger.market))ledger.market={};
 const market=ledger.market;
 if(!Number.isSafeInteger(market.nextManifest)||market.nextManifest<1)market.nextManifest=1;
 if(!market.receipts||typeof market.receipts!=='object'||Array.isArray(market.receipts))market.receipts={};
 if(!market.stations||typeof market.stations!=='object'||Array.isArray(market.stations))market.stations={};
 return market
}

function validManifest(manifest){
 return !!manifest&&typeof manifest==='object'&&manifest.status==='loaded'&&
  typeof manifest.id==='string'&&/^hearth-\d+$/.test(manifest.id)&&
  validResource(manifest.resource)&&validWorld(manifest.world)&&
  whole(manifest.units)&&manifest.units>0&&whole(manifest.unitPrice)
}

export function activeMarketManifest(ledger){
 const market=marketState(ledger);
 return validManifest(market.active)?market.active:null
}

export function marketInventory(ledger,world){
 if(!validWorld(world))return Array(RESOURCE_COUNT).fill(0);
 const market=marketState(ledger),station=market.stations[world];
 if(!station||typeof station!=='object'||!Array.isArray(station.stock))return Array(RESOURCE_COUNT).fill(0);
 return Array.from({length:RESOURCE_COUNT},(_,i)=>whole(station.stock[i])?station.stock[i]:0)
}

export function createMarketManifest(ledger,resource,world,unitPrice){
 const market=marketState(ledger),active=activeMarketManifest(ledger);
 if(active)return {ok:false,message:'Deliver or cancel '+active.id+' before loading another manifest.'};
 if(!validResource(resource)||!validWorld(world)||!whole(unitPrice))return {ok:false,message:'Manifest terms are invalid.'};
 const units=Array.isArray(ledger.ore)&&whole(ledger.ore[resource])?ledger.ore[resource]:0;
 if(units<=0)return {ok:false,message:'No cargo is available for this manifest.'};
 let sequence=market.nextManifest,id='hearth-'+sequence;
 while(market.receipts[id]){sequence++;id='hearth-'+sequence}
 const value=units*unitPrice;
 if(!Number.isSafeInteger(value))return {ok:false,message:'Manifest value exceeds the fleet ledger limit.'};
 const manifest={id,status:'loaded',resource,world,units,unitPrice,value};
 market.nextManifest=sequence+1;market.active=manifest;
 return {ok:true,manifest,message:'Loaded '+id+' with '+units+' cargo units.'}
}

export function settleMarketManifest(ledger,id,world){
 const market=marketState(ledger),prior=typeof id==='string'?market.receipts[id]:null;
 if(prior&&prior.status==='settled')return {ok:true,already:true,receipt:prior,message:id+' was already delivered. No duplicate credit issued.'};
 const manifest=activeMarketManifest(ledger);
 if(!manifest||manifest.id!==id)return {ok:false,message:'That loaded manifest is not available.'};
 if(!validWorld(world)||manifest.world!==world)return {ok:false,message:'This manifest belongs to another receiving station.'};
 const ore=Array.isArray(ledger.ore)&&whole(ledger.ore[manifest.resource])?ledger.ore[manifest.resource]:-1;
 const credits=whole(ledger.credits)?ledger.credits:-1;
 const stock=marketInventory(ledger,world),nextCredits=credits+manifest.value,nextStock=stock[manifest.resource]+manifest.units;
 if(ore<manifest.units)return {ok:false,message:'The ship hold no longer contains the manifested cargo.'};
 if(!Number.isSafeInteger(nextCredits)||!Number.isSafeInteger(nextStock))return {ok:false,message:'Delivery exceeds the fleet ledger limit.'};
 const receipt={...manifest,status:'settled'};
 ledger.ore[manifest.resource]=ore-manifest.units;ledger.credits=nextCredits;
 stock[manifest.resource]=nextStock;market.stations[world]={stock};
 market.receipts[id]=receipt;market.active=null;
 return {ok:true,already:false,receipt,message:'Delivered '+id+' for '+manifest.value+' trade credits.'}
}

export function cancelMarketManifest(ledger,id){
 const market=marketState(ledger),manifest=activeMarketManifest(ledger);
 if(!manifest||manifest.id!==id)return {ok:false,message:'That loaded manifest is not available.'};
 market.active=null;
 return {ok:true,message:'Cancelled '+id+'. Cargo remains in the ship hold.'}
}

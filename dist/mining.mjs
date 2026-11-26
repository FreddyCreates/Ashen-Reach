export const resources=['Ferrite','Brine ice','Ammonia','Basalt glass'];
export const newLedger=()=>({credits:0,rack:0,ore:[0,0,0,0],mined:{}});
export function capacity(s){return 12+s.rack*8}
export function quote(resource,world){return [12,19,24,16][resource]+(resource===world%4?0:9)+(world*7+resource*3)%5}
export function extract(ledger,world,site){
 const id=world+'/'+site,room=capacity(ledger)-ledger.ore.reduce((a,b)=>a+b,0);
 const available=4-(ledger.mined[id]||0),units=Math.min(room,available);
 if(units<=0)return room?'Deposit depleted. Survey another beacon.':'Hold full. Sell cargo at a freeport.';
 ledger.ore[world%4]+=units;ledger.mined[id]=(ledger.mined[id]||0)+units;
 return 'Recovered '+units+' units of '+resources[world%4]+'.'
}
export function sell(s,r,w){const units=s.ore[r],value=units*quote(r,w);s.ore[r]=0;s.credits+=value;return 'Sold '+units+' units for '+value+' trade credits.'}
export function upgrade(s){const price=45*(s.rack+1);if(s.rack>=4||s.credits<price)return 'Insufficient trade credits or maximum capacity reached.';s.credits-=price;s.rack++;return 'Cargo rack fitted.'}

// Fictional equipment. Integer in-game credits, ownership and per-hull loadouts.
export const catalog=Object.freeze([
 {id:'pulse',name:'Pulse repeater',slot:'ship',price:0,damage:1,rate:1,speed:23},
 {id:'lance',name:'Ion lance',slot:'ship',price:110,damage:2,rate:1.55,speed:30},
 {id:'arc',name:'Arc projector',slot:'ship',price:180,damage:1,rate:.55,speed:27},
 {id:'nova',name:'Nova resonator',slot:'ship',price:320,damage:3,rate:2.4,speed:19},
 {id:'sidearm',name:'Survey pulse tool',slot:'ground',price:0,damage:1,rate:.48,range:24},
 {id:'carbine',name:'Aurora carbine',slot:'ground',price:75,damage:2,rate:.4,range:42},
 {id:'disruptor',name:'Spirit disruptor',slot:'ground',price:150,damage:4,rate:1.1,range:32},
 {id:'shield',name:'Aegis plating',slot:'armor',price:125,absorb:4}
].map(Object.freeze));
const byId=id=>catalog.find(x=>x.id===id);
const validHull=h=>Number.isInteger(h)&&h>=0&&h<3;
export function restoreArmory(raw){
 const owned=[...new Set(['pulse','sidearm',...(Array.isArray(raw?.owned)?raw.owned.filter(id=>byId(id)):[])])];
 const pick=(id,slot,fallback)=>owned.includes(id)&&byId(id)?.slot===slot?id:fallback;
 return {owned,ship:Array.from({length:3},(_,i)=>pick(raw?.ship?.[i],'ship','pulse')),ground:pick(raw?.ground,'ground','sidearm'),armor:pick(raw?.armor,'armor',null)};
}
export function purchase(s,id){
 const item=byId(id);if(!item)return 'Equipment unavailable.';
 if(s.armory.owned.includes(id))return 'Already owned.';
 if(!Number.isSafeInteger(s.credits)||s.credits<item.price)return 'Insufficient trade credits.';
 s.credits-=item.price;s.armory.owned.push(id);return item.name+' purchased.';
}
export function equip(s,id,hull){
 const item=byId(id);if(!item||!s.armory.owned.includes(id)||!validHull(hull))return 'Equipment not available.';
 if(item.slot==='ship')s.armory.ship[hull]=id;else s.armory[item.slot]=id;
 return item.name+' equipped.';
}
export function shipWeapon(s,hull){return byId(s.armory?.ship?.[hull])||catalog[0]}
export function groundWeapon(s){return byId(s.armory?.ground)||byId('sidearm')}
export function armorAbsorb(s){return byId(s.armory?.armor)?.absorb||0}

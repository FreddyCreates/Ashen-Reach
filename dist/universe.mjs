export const ships=[
 {name:'Peregrine',role:'Interceptor',speed:9,hull:90,fire:.23,color:'#df9c60'},
 {name:'Bastion',role:'Heavy frigate',speed:5,hull:180,fire:.38,color:'#8ebac8'},
 {name:'Vesper',role:'Spirit cutter',speed:7,hull:115,fire:.29,color:'#b598df'}
];
const names=['Aurelia','Nacre','Veyra','Orison','Thalos','Eidolon','Lumen','Caelis'], colors=['#d99e70','#72bfc9','#b89fdb','#94c09b'];
export const epoch=Date.UTC(2026,10,25,18), interval=900000;
export function random(seed){return ()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296)}
export function cycle(time=Date.now()){return Math.max(0,Math.floor((time-epoch)/interval))}
export function world(id,tick){
 const rng=random(731+id*7613), specialization=(id+Math.floor(id/7))%3,base=12+Math.floor(rng()*16);
 const age=Math.max(0,tick-Math.max(0,(id-3)*8));
 // Each district is a small closed planning horizon. Districts export surplus
 // to the next settlement so old colonies can be reconstructed in constant time.
 const districts=Math.floor(age/6), local=age%6;
 const buildings=[2+districts*3,1+districts*2,1+districts];
 const quota=[3,2,1],built=[0,0,0],labels=['habitat','reactor','shipyard'];
 const demand=random((id+1)*773+districts*137);
 let project=0;
 for(let step=0;step<=local;step++){
   const scores=quota.map((capacity,i)=>built[i]>=capacity?-Infinity:
     (capacity-built[i])/(built[i]+1)+demand()*1.5+(i===specialization?.65:0));
   project=scores.indexOf(Math.max(...scores));
   if(step<local){built[project]++;buildings[project]++}
 }
 return {id,name:names[id%8]+(id>=8?' '+(1+Math.floor(id/8)):''),color:colors[id%4],governor:['The Architect','The Cantor','The Warden'][specialization],population:base+buildings[0]*7+buildings[1]*2,buildings,next:labels[project],age};
}
export function frontier(tick){return 4+Math.floor(tick/8)}

// Act II: actual ore is consumed from the shared mining ledger.
// Separate checkpoint preserves Act I saves and faction benefits.
export const airChoices=['clinic','condenser'];
export function restoreAir(raw){
 if(raw?.stage==='complete'&&airChoices.includes(raw.choice))return {stage:'complete',choice:raw.choice};
 return {stage:raw?.stage==='supply'?'supply':'available',choice:null};
}
export function airEpisode(s){
 const a=s.air;
 if(s.campaign?.stage!=='complete')return null;
 if(a.stage==='available')return {title:'Borrowed Air',body:'Relay Nine reports failing refrigeration. '+(s.campaign.ally==='Lantern Guild'?'The Guild offers an insured supply run.':'A Wakekeeper engineer identifies an emergency transfer point.')};
 if(a.stage==='supply')return {title:'Cold cargo',body:'Recover 4 units of ammonia at Veyra. Carry them to Relay Nine and choose which system receives the coolant. Ammonia aboard: '+s.ore[2]+'/4.'};
 return {title:a.choice==='clinic'?'Beds kept cold':'The platform holds',body:a.choice==='clinic'?'The clinic remains operational. Your crew receives 80 credits for the emergency delivery.':'The condenser stabilizes the platform. Your crew receives 100 credits for the industrial delivery.'};
}
export function acceptAir(s){
 if(s.campaign?.stage!=='complete'||s.air.stage!=='available')return false;
 s.air={stage:'supply',choice:null};return true;
}
export function deliverAir(s,world,choice){
 if(s.campaign?.stage!=='complete'||s.air.stage!=='supply')return 'No active coolant order.';
 if(world!==2)return 'Relay Nine is at Veyra.';
 if(!airChoices.includes(choice))return 'Choose a valid recipient.';
 if(!Number.isSafeInteger(s.ore[2])||s.ore[2]<4)return 'Four units of ammonia required.';
 const reward=choice==='clinic'?80:100;
 if(!Number.isSafeInteger(s.credits)||s.credits<0||!Number.isSafeInteger(s.credits+reward))return 'Invalid trade balance.';
 s.ore[2]-=4;s.credits+=reward;s.air={stage:'complete',choice};
 return 'Coolant delivered. '+reward+' trade credits received.';
}

import {writeFileSync} from 'node:fs';
import {shipModel,deckModel} from '../dist/fleet-models.mjs';
const serialize=g=>g.children.map(({geometry:a,material:m})=>({name:m.name,color:[m.color.r,m.color.g,m.color.b],p:Array.from(a.attributes.position.array),n:Array.from(a.attributes.normal.array),i:Array.from(a.index.array)}));
writeFileSync(process.argv[2],JSON.stringify({ships:[0,1,2,3].map(i=>serialize(shipModel(i))),decks:[0,1,2].map(i=>serialize(deckModel(i)))}));

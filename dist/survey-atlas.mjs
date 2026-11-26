import {elevations,sites} from './survey-atlas-data.mjs';
const grids=[];
const radii=[4.9e6,6.3e6,5.2e7,5.4e6];
export function landingSite(id){
 const [latitude,longitude]=sites[id%4][Math.floor(id/4)%8];
 return {latitude,longitude}
}
function relief(family,u,v){
 if(!grids[family])grids[family]=Uint8Array.from(atob(elevations[family]),s=>s.charCodeAt(0));
 const px=((u%1+1)%1)*160-.5,py=Math.max(0,Math.min(79,v*80-.5));
 const x=Math.floor(px),y=Math.floor(py),fx=px-x,fy=py-y,g=grids[family];
 const sample=(col,row)=>g[row*160+(col+160)%160];
 return ((1-fy)*((1-fx)*sample(x,y)+fx*sample(x+1,y))+fy*((1-fx)*sample(x,Math.min(79,y+1))+fx*sample(x+1,Math.min(79,y+1))))/255
}
const regions=new Map();
export function regionalElevation(id,x,z){
 let region=regions.get(id);const f=id%4;
 if(!region){const site=landingSite(id),lat=site.latitude*Math.PI/180,u=(site.longitude+180)/360,v=.5-site.latitude/180;
 region={u,v,dx:1/(2*Math.PI*radii[f]*Math.cos(lat)),dz:1/(Math.PI*radii[f]),base:relief(f,u,v)};regions.set(id,region)}
 return 10500*(relief(f,region.u+x*region.dx,region.v+z*region.dz)-region.base)
}

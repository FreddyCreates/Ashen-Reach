// Camera-centred streamed terrain, stable coordinates and stitched LOD edges.
import * as T from './three.module.js';
import {localHeight,directionAt,surfaceColor} from './planet-geography.mjs';
export const TILE=128;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const themes=[
 {sea:false,rock:[140,94,68],light:[220,173,121]},
 {sea:true,rock:[66,102,84],light:[189,172,130]},
 {sea:false,rock:[161,128,144],light:[237,210,190]},
 {sea:true,rock:[88,92,73],light:[164,161,126]}
];
export function tileMesh(frame,tx,tz,detail,edges={}){
 const n=detail?64:16,step=TILE/n,coarse=TILE/16,vertices=[],normals=[],colors=[],indices=[],theme=themes[frame.body.id%4];
 const height=(x,z)=>localHeight(frame,x,z);
 for(let j=0;j<=n;j++)for(let i=0;i<=n;i++){
  const x=tx*TILE+i*step,z=tz*TILE+j*step;let h=height(x,z);
  if(detail&&((i===0&&edges.west)||(i===n&&edges.east))){const a=Math.floor(j*step/coarse)*coarse,b=clamp((j*step-a)/coarse,0,1);h=height(x,tz*TILE+a)*(1-b)+height(x,tz*TILE+a+coarse)*b}
  if(detail&&((j===0&&edges.north)||(j===n&&edges.south))){const a=Math.floor(i*step/coarse)*coarse,b=clamp((i*step-a)/coarse,0,1);h=height(tx*TILE+a,z)*(1-b)+height(tx*TILE+a+coarse,z)*b}
  vertices.push(x,h,z);
  const dx=(height(x+2,z)-height(x-2,z))/4,dz=(height(x,z+2)-height(x,z-2))/4,l=Math.hypot(dx,1,dz);
  normals.push(-dx/l,1/l,-dz/l);
  const c=surfaceColor(frame.body,directionAt(frame,x,z),h,theme);
  const rock=clamp((Math.hypot(dx,dz)-.45)*.8,0,.8),strata=.91+.09*Math.sin(h*.45+x*.008+z*.013);
  const rgb=c.map((v,k)=>clamp((v*(1-rock)+theme.rock[k]*rock)*strata/255,0,1));
  const color=new T.Color().setRGB(...rgb,T.SRGBColorSpace);colors.push(color.r,color.g,color.b);
 }
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i;indices.push(a,a+n+1,a+1,a+1,a+n+1,a+n+2)}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeBoundingSphere();return g;
}
export function terrainMaterial(){
 const mat=new T.MeshStandardMaterial({vertexColors:true,roughness:.96});
 mat.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vRock;').replace('#include <begin_vertex>','#include <begin_vertex>\nvRock=position;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vRock;').replace('#include <color_fragment>',`#include <color_fragment>
   float grain=fract(sin(dot(floor(vRock*8.),vec3(12.9898,78.233,39.425)))*43758.5453);
   float bands=sin(vRock.y*2.7+sin(vRock.x*.7)+sin(vRock.z*.6));
   float fade=1.-smoothstep(28.,105.,length(vViewPosition));
   diffuseColor.rgb*=1.+fade*(.12*(grain-.5)+.055*bands);
  `);
 };mat.customProgramCacheKey=()=> 'ashen-forge-rock-v1';return mat;
}
export class TerrainStream{
 constructor(scene,frame){this.scene=scene;this.frame=frame;this.tiles=new Map();this.material=terrainMaterial();this.cx=null;this.cz=null;}
 update(x,z){
  const cx=Math.floor(x/TILE),cz=Math.floor(z/TILE);if(cx===this.cx&&cz===this.cz)return;
  this.cx=cx;this.cz=cz;const wanted=new Map();
  for(let j=-3;j<=3;j++)for(let i=-3;i<=3;i++){const tx=cx+i,tz=cz+j,detail=Math.abs(i)<=1&&Math.abs(j)<=1;
   const edges={west:i===-1,east:i===1,north:j===-1,south:j===1};const key=[tx,tz,detail?Object.values(edges).map(Number).join(''):'low'].join(':');wanted.set(key,{tx,tz,detail,edges})}
  for(const [key,m] of this.tiles)if(!wanted.has(key)){this.scene.remove(m);m.geometry.dispose();this.tiles.delete(key)}
  for(const [key,v] of wanted)if(!this.tiles.has(key)){const m=new T.Mesh(tileMesh(this.frame,v.tx,v.tz,v.detail,v.edges),this.material);m.receiveShadow=true;this.scene.add(m);this.tiles.set(key,m)}
 }
 dispose(){for(const m of this.tiles.values()){this.scene.remove(m);m.geometry.dispose()}this.tiles.clear();this.material.dispose()}
}

// Ashen Forge: independent indexed mesh compiler, no Blender runtime dependency.
const finite=a=>a.every(Number.isFinite);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>Math.hypot(...a);
export class MeshForge{
 constructor(){this.positions=[];this.normals=[];this.uvs=[];this.indices=[];this.groups=[]}
 face(points,material=0,uvs=null){
  if(points.length<3||points.some(p=>p.length!==3||!finite(p)))throw Error('Invalid polygon');
  const n=cross(sub(points[1],points[0]),sub(points[2],points[0])),l=norm(n);
  if(l<1e-9)throw Error('Degenerate polygon');
  const base=this.positions.length/3,start=this.indices.length;
  for(let i=0;i<points.length;i++){this.positions.push(...points[i]);this.normals.push(...n.map(v=>v/l));this.uvs.push(...(uvs?.[i]||[i%2,Math.floor(i/2)%2]))}
  for(let i=1;i<points.length-1;i++)this.indices.push(base,base+i,base+i+1);
  this.groups.push({start,count:this.indices.length-start,material});return this
 }
 // Convex profile extruded along Z, with real chamfered corners authored in the profile.
 extrude(profile,depth,material=0,offset=[0,0,0]){
  if(profile.length<3||depth<=0||!Number.isFinite(depth))throw Error('Invalid extrusion');
  const area=profile.reduce((s,p,i)=>{const q=profile[(i+1)%profile.length];return s+p[0]*q[1]-q[0]*p[1]},0);
  const ring=area>0?profile:[...profile].reverse();
  const p=(v,z)=>[v[0]+offset[0],v[1]+offset[1],z+offset[2]];
  this.face(ring.map(v=>p(v,depth/2)),material);
  this.face([...ring].reverse().map(v=>p(v,-depth/2)),material);
  for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length];this.face([p(a,-depth/2),p(b,-depth/2),p(b,depth/2),p(a,depth/2)],material)}
  return this;
 }
 chamferBox(w,h,d,r,material=0,offset=[0,0,0]){
  const x=w/2,y=h/2;if(r<=0||r>=Math.min(x,y))throw Error('Invalid chamfer');
  return this.extrude([[-x+r,-y],[x-r,-y],[x,-y+r],[x,y-r],[x-r,y],[-x+r,y],[-x,y-r],[-x,-y+r]],d,material,offset)
 }
 compile(){
  const {positions,normals,uvs,indices,groups}=this;
  if(!positions.length||!finite(positions)||!finite(normals)||indices.some(i=>i<0||i>=positions.length/3))throw Error('Invalid mesh');
  return {positions:new Float32Array(positions),normals:new Float32Array(normals),uvs:new Float32Array(uvs),indices:new Uint32Array(indices),groups:groups.map(g=>({...g}))}
 }
}
export function sentinelMesh(){
 const m=new MeshForge();
 m.chamferBox(1.8,.78,1.1,.18,0).chamferBox(1.42,.28,1.4,.1,1,[0,.49,0]);
 m.chamferBox(.82,.35,.12,.07,2,[0,.08,.62]);
 for(const sign of [-1,1]){
  m.chamferBox(.38,.65,.8,.11,1,[sign*1.06,-.04,0]);
  m.chamferBox(.24,.17,.58,.05,3,[sign*1.06,-.46,0]);
  m.chamferBox(.15,.38,.24,.04,0,[sign*.76,-.52,.42]);
  m.chamferBox(.11,.12,.44,.025,2,[sign*.66,.25,.57]);
 }
 return m.compile();
}
export function surveyCacheMesh(){
 const m=new MeshForge();
 m.chamferBox(1.1,.66,.82,.1,0).chamferBox(1.06,.12,.86,.045,1,[0,.39,0]);
 for(const side of [-1,1]){m.chamferBox(.13,.56,.88,.04,1,[side*.39,0,0]);m.chamferBox(.13,.18,.1,.025,2,[side*.32,.1,.47])}
 return m.compile()
}

// Coordinates are metres. The bow points along negative Z.
import * as T from './three.module.js';
const steel='#536575', armor='#b3b9b8', inset='#202c38', edge='#808f94', glass='#274d62';
const liveries=['#d17d48','#578699','#a79ab7','#a34b40'];
const cube=new T.BoxGeometry(),cylinder=new T.CylinderGeometry(1,1,1,18);
export const surfaces=new Map();
const pale='#b8f4ea', amber='#f4bd78';
function surface(color,finish){
 const key=color+finish;
 if(!surfaces.has(key)){
 const options={color,roughness:finish==='glass'?.17:finish==='light'?.25:.51,metalness:finish==='glass'?.62:finish==='light'?.16:.55};
 if(finish==='light'){options.emissive=color;options.emissiveIntensity=1.8}
 const m=new T.MeshStandardMaterial(options);m.name=finish+' '+color;surfaces.set(key,m)}
 return surfaces.get(key)
}
// Pack each set of identical materials into one indexed mesh.
class Builder{
 constructor(){this.groups=new Map()}
 append(geometry,color,finish='plate',transform=new T.Matrix4()){
  const mat=surface(color,finish);let b=this.groups.get(mat);
  if(!b){b={p:[],n:[],u:[],idx:[]};this.groups.set(mat,b)}
  const p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv,base=b.p.length/3;
  const v=new T.Vector3(),pos=new T.Vector3(),normalMatrix=new T.Matrix3().getNormalMatrix(transform);
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(transform);b.p.push(v.x,v.y,v.z);pos.copy(v);v.fromBufferAttribute(n,i).applyNormalMatrix(normalMatrix);b.n.push(v.x,v.y,v.z);if(Math.abs(v.y)>.6)b.u.push(pos.x,pos.z);else if(Math.abs(v.x)>.6)b.u.push(pos.z,pos.y);else b.u.push(pos.x,pos.y)}
  const indices=geometry.index?.array;for(let i=0;i<(indices?.length??p.count);i++)b.idx.push(base+(indices?indices[i]:i))
 }
 primitive(geo,c,x,y,z,w,h,d,rx=0,ry=0,rz=0,finish='plate'){
  const mat=new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(rx,ry,rz)),new T.Vector3(w,h,d));this.append(geo,c,finish,mat)
 }
 box(...args){this.primitive(cube,...args)}
 disk(c,x,y,z,r,depth,finish='plate'){this.primitive(cylinder,c,x,y,z,r,depth,r,Math.PI/2,0,0,finish)}
 // Loft chamfered cross sections to form hulls, armor plating, and glazing.
 body(sections,color,finish='plate',offset=0){
  const points=[],indices=[];for(const [z,w,low,high] of sections){
   const bevel=(high-low)*.27;for(const [x,y] of [[-w*.69,high],[w*.69,high],[w,high-bevel],[w,low+bevel],[w*.68,low],[-w*.68,low],[-w,low+bevel],[-w,high-bevel]])points.push(offset+x,y,z)
  }
  for(let j=0;j<sections.length-1;j++)for(let k=0;k<8;k++){const a=j*8+k,b=j*8+(k+1)%8;indices.push(a,a+8,b,b,a+8,b+8)}
  const last=(sections.length-1)*8;for(let k=1;k<7;k++)indices.push(0,k,k+1,last,last+k+1,last+k);
  this.faces(points,indices,color,finish)
 }
 faces(points,indices,c,finish){
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(points,3));geo.setIndex(indices);
  const flat=geo.toNonIndexed();flat.computeVertexNormals();this.append(flat,c,finish)
 }
 wing(shape,top,bottom,c,side){
  const poly=new T.Shape();shape.forEach(([x,z],i)=>i?poly.lineTo(side*x,-z):poly.moveTo(side*x,-z));poly.closePath();
  const g=new T.ExtrudeGeometry(poly,{depth:top-bottom,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.035,bevelThickness:.025});
  g.rotateX(-Math.PI/2);g.translate(0,bottom,0);this.append(g,c)
 }
 finish(){
  const root=new T.Group();for(const [mat,b] of this.groups){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(b.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(b.n,3));g.setAttribute('uv',new T.Float32BufferAttribute(b.u,2));g.setIndex(b.idx);g.computeBoundingSphere();root.add(new T.Mesh(g,mat))}return root
 }
}
export function shipModel(id){
 const b=new Builder(),c=liveries[id],heavy=id===1,ghost=id===2,enemy=id===3;
 const nose=heavy?-2.35:ghost?-3.15:-3.45,w=heavy?.93:ghost?.56:.64;
 b.body([[nose,.13,-.02,.10],[-1.62,w*.65,-.15,.28],[-.72,w,-.26,.47],[.85,w*1.15,-.31,.55],[2.14,w*.84,-.17,.32]],inset);
 // Segmented dorsal armor with exposed expansion joints.
 b.body([[nose+.12,.13,.055,.14],[-1.56,w*.64,.21,.34],[-1.06,w*.78,.25,.4]],armor);
 b.body([[-1.01,w*.81,.23,.40],[-.58,w*.98,.31,.52],[.38,w*1.04,.34,.58]],c);
 b.body([[.43,w*1.04,.34,.59],[1.17,w,.31,.54],[1.97,w*.79,.20,.36]],armor);
 b.body([[-1.22,.13,.31,.42],[-.58,.37,.47,.85],[.24,.33,.54,.83],[.47,.21,.51,.62]],edge);
 b.body([[-1.16,.128,.397,.477],[-.57,.341,.531,.862],[.17,.296,.61,.859],[.36,.203,.60,.694]],glass,'glass');
 b.body([[-.40,.335,.51,.865],[-.355,.33,.51,.868]],steel);
 b.body([[.079,.306,.58,.865],[.119,.302,.58,.866]],steel);
 b.box('#d3c7ab',0,.323,-1.75,.066,.032,.82,-.12);
 for(let j=0;j<4;j++)b.box(inset,0,.334+j*.012,-1.63+j*.1,.19,.018,.024,-.13);
 for(const s of [-1,1]){
 let shape=heavy?[[.4,-1.75],[1.67,-1.63],[2.03,-.88],[2,1.97],[1.29,2.28],[.5,1.4]]:ghost?[[.33,-.51],[1.17,-1.23],[2.04,-2.25],[1.94,-.39],[1.43,1.72],[.72,2.06]]:[[.39,-1.43],[.84,-.99],[2.72,1.48],[2.59,1.9],[1.10,1.51],[.44,.93]];
 b.wing(shape,.13,-.13,steel,s);b.wing(shape.map(([x,z])=>[x*.92,z*.93]),.21,.15,c,s);
 // Cut the broad armor into offset service panels, retaining the structural spar beneath.
 const skin=(polygon,col,y)=>b.wing(polygon,y,y-.012,col,s);
 if(!heavy&&!ghost){
 skin([[.69,-.79],[.86,-.58],[1.36,.17],[1.21,.25],[.73,-.37]],'#deddd0',.248);
 skin([[1.30,.24],[1.43,.19],[2.24,1.29],[1.83,1.09]],'#8e553a',.246);
 skin([[1.36,.51],[1.77,1.14],[1.69,1.33],[1.10,1.17]],'#c5c4b1',.245);
 skin([[1.86,1.25],[2.29,1.39],[2.40,1.55],[1.89,1.41]],edge,.245);
 }else if(ghost){
 skin([[1.27,-.86],[1.80,-1.84],[1.66,-.58],[1.34,.15]],'#c9cbd5',.245);
 skin([[1.54,-.49],[1.69,-.79],[1.31,.85],[1.15,1.19]],'#554b65',.246);
 }else{
 for(let j=0;j<3;j++){let t=-1.23+j*.95;skin([[1.44,t],[1.69,t+.09],[1.79,t+.57],[1.49,t+.54]],'#acb7ad',.229)}
 }
 const pod=heavy?1.49:ghost?1.2:.91;
 b.body([[-.94,.13,-.02,.18],[-.46,.24,-.19,.36],[1.48,.27,-.2,.36],[1.99,.23,-.15,.24]],armor,'plate',s*pod);
 for(let j=0;j<5;j++)b.box(inset,s*pod,.372,.69+j*.134,.39,.045,.065);
 for(let j=0;j<3;j++)b.disk(j===1?edge:inset,s*pod,.038,1.76+j*.12,.292-j*.015,.13);
 b.disk(enemy?'#f48f68':pale,s*pod,.038,2.078,.17,.045,'light');b.disk('#efffff',s*pod,.038,2.105,.085,.045,'light');
 // Access hatch, fasteners, compressor louvers and individual nozzle petals.
 b.box(inset,s*pod,.351,.26,.35,.045,.40);b.box(edge,s*pod,.388,.26,.30,.024,.33);
 for(const dx of [-.112,.112])for(const dz of [-.115,.115])b.primitive(cylinder,inset,s*pod+dx,.407,.26+dz,.020,.012,.020);
 for(let j=0;j<12;j++){const a=j*Math.PI/6;b.box(edge,s*pod+Math.cos(a)*.26,.038+Math.sin(a)*.26,1.95,.045,.065,.23,0,0,a)}
 for(let j=0;j<7;j++)b.box(j%3?steel:edge,s*(w*.96),.11,-.56+j*.18,.09,.22,.076,0,0,-s*.25);
 b.box(c,s*pod,.36,-.15,.21,.05,.48);b.box(amber,s*(heavy?1.91:ghost?1.81:2.47),.215,heavy?.25:ghost?-.71:1.46,.10,.04,.22,0,0,0,'light');
 b.box(edge,s*.45,.49,1.08,.07,.13,1.12);
 for(let j=0;j<3;j++)b.box(inset,s*w*.77,.41,-1.10+j*.17,.07,.055,.09);
 const fin=s*(heavy?1.72:ghost?1.16:1.01);b.box(c,fin,.48,1.28,.10,heavy?.53:.81,.74,-.24,0,-s*.24);
 if(heavy){for(let j=0;j<3;j++)b.box(armor,s*1.70,.28,-.96+j*.64,.38,.12,.49)}
 else{b.box(steel,s*(ghost?1.65:1.42),.22,ghost?-1.35:.77,.11,.11,.92)}
 }
 for(let j=0;j<6;j++)b.box(steel,0,.548-j*.019,.65+j*.18,w*.89,.052,.08);
 b.box(inset,0,.17,nose+.18,.09,.12,.58);return b.finish()
}
// Optional close-range shell. The baked hull and its AO vertex ordering are
// left untouched; this batched layer adds only visible, three-dimensional parts.
const shellLight='#d7d2bd',shellDark='#202830',rib='#59616b',heat='#754c3f',warning='#c48750';
const nozzle = new T.LatheGeometry([
 new T.Vector2(.255,-.13),new T.Vector2(.287,-.105),new T.Vector2(.287,-.02),
 new T.Vector2(.269,.063),new T.Vector2(.232,.074),new T.Vector2(.207,.045),
 new T.Vector2(.213,-.035),new T.Vector2(.238,-.13),new T.Vector2(.255,-.13)
],18);
const railRotation=Math.PI/2;
const nearHullConfig=[
 {pod:.91,wingX:1.06,wingZ:.39,rake:.66,tipX:2.57,tipZ:1.52,neck:-2.16,w:.64,armor:shellLight},
 {pod:1.49,wingX:1.43,wingZ:.09,rake:.17,tipX:1.96,tipZ:1.13,neck:-1.70,w:.93,armor:'#b8c3c3'},
 {pod:1.20,wingX:1.23,wingZ:-.13,rake:-.39,tipX:1.87,tipZ:-1.01,neck:-2.20,w:.56,armor:'#c9c4bb'},
];
export function shipDetailModel(id){
 const a=nearHullConfig[id];
 if(!a)throw new RangeError('Unsupported fleet detail hull');
 const b=new Builder(),{pod,wingX,wingZ,rake,tipX,tipZ,neck,w,armor:skin}=a;
 // Radar cover, canopy support, and small belly plates establish a sense of scale.
 b.body([[neck-.57,.047,.14,.166],[neck-.17,.11,.17,.225],[neck+.23,.14,.21,.29],[neck+.39,.11,.219,.27]],shellDark);
 b.body([[neck-.48,.033,.167,.176],[neck-.14,.076,.224,.246],[neck+.12,.098,.254,.275],[neck+.20,.073,.261,.271]],skin);
 b.body([[.45,w*.37,.546,.591],[.61,w*.38,.552,.609],[.95,w*.26,.508,.553],[1.17,w*.18,.483,.516]],shellDark);
 for(const s of [-1,1]){
  const x=s*pod;
  // Tie the engine to the airframe with a visibly separate shroud, ring and heat fins.
  b.primitive(nozzle,shellDark,x,.038,2.11,1,1,1,railRotation);
  b.primitive(nozzle,heat,x,.038,2.177,.866,.72,.866,railRotation);
  for(let i=0;i<6;i++){
   const angle=(i+.5)*Math.PI/3;
   b.box(rib,x+Math.cos(angle)*.279,.038+Math.sin(angle)*.279,2.084,.06,.036,.16,0,0,angle);
  }
  b.body([[.465,.12,.378,.398],[.51,.23,.381,.424],[1.45,.24,.381,.425],[1.59,.16,.356,.382]],shellDark,'plate',x);
  for(let i=0;i<5;i++)b.box(i===4?heat:rib,x,.423,.61+i*.162,.326,.025,.048,.13);
  b.body([[-.91,.06,.16,.208],[-.83,.14,.186,.237],[-.47,.19,.295,.364],[-.30,.095,.325,.36]],skin,'plate',x);
  b.box(warning,x,.378,-.35,.169,.023,.049,-.14);
  // Layered wing service access and visibly recessed seams, not billboard decals.
  const polygon=[[wingX-.16,wingZ-.35],[wingX+.06,wingZ-.28],[wingX+.25,wingZ+.22+rake*.19],[wingX+.12,wingZ+.34+rake*.19],[wingX-.12,wingZ+.19]];
  b.wing(polygon,.269,.235,shellDark,s);
  const ox=wingX,oz=wingZ;
  b.wing(polygon.map(([x,z])=>[ox+(x-ox)*.84,oz+(z-oz)*.84]),.283,.272,skin,s);
  for(let i=0;i<4;i++)b.box(i===0?warning:rib,s*(wingX+.039+i*.029),.313,wingZ+.04+i*.037,.026,.011,.093,0,s*.19,0);
  b.box(skin,s*tipX,.197,tipZ,.14,.043,.19,0,-s*rake);
  b.box(s<0?'#f68760':'#b8f4ea',s*tipX,.225,tipZ,.051,.024,.093,0,-s*rake,0,'light');
  // Thermal tiles and louvers run below the nacelles. Readable on a full orbit.
  b.body([[.39,.102,-.291,-.206],[.50,.168,-.304,-.207],[1.56,.163,-.309,-.208],[1.70,.114,-.275,-.167]],rib,'plate',x);
  for(let i=0;i<5;i++)b.box(i%2?heat:shellDark,x,-.310,.64+i*.189,.241,.036,.072);
  b.body([[-.52,.075,-.27,-.151],[.29,.16,-.36,-.22],[1.12,.12,-.37,-.215],[1.35,.083,-.281,-.21]],shellDark,'plate',s*w*.43);
 }
 return b.finish();
}
// Grounded preview only; this does not alter the landing envelope or physics.
export const shipLandingLegs=id=>{
 const pod=nearHullConfig[id]?.pod;
 return pod?[[0,-1.03,-.14],[-pod,.95,-.15],[pod,.95,-.15]]:[];
};
export function shipLandingModel(id,groundY){
 const b=new Builder();
 for(const [i,[x,z,mount]] of shipLandingLegs(id).entries()){
  if(!Number.isFinite(groundY[i]))throw new TypeError('Invalid landing foot height');
  const foot=Math.min(mount-.11,groundY[i]),extension=mount-foot;
  b.box(shellDark,x,mount,z,i?.235:.171,.126,i?.31:.22);
  b.primitive(cylinder,rib,x,foot+.055+(extension-.055)/2,z,.034,extension-.055,.034);
  b.primitive(cylinder,heat,x,mount-extension*.24,z,.062,extension*.48,.062);
  b.box(shellDark,x,foot+.031,z,i?.245:.172,.062,i?.34:.25);
  b.box(warning,x,foot+.064,z-.045,i?.178:.105,.016,i?.12:.09);
 }
 return b.finish();
}
export function deckModel(id){
 const b=new Builder(),c=liveries[id];b.box(inset,0,-.17,0,6.9,.26,17);b.box(inset,0,3.65,0,6.9,.24,17);
 for(let j=0;j<10;j++){const z=7.6-j*1.6;
 for(const s of [-1,1]){
 b.box(j%3?steel:'#5e6f79',s*1.55,-.035,z,3.04,.09,1.55);
 b.box('#b3a88a',s*2.45,.022,z,.045,.025,1.39);
 b.box(edge,s*3.23,1.3,z,.24,2.65,.21);b.box(steel,s*2.96,2.94,z,.24,1.15,.24,0,0,s*.52);
 b.box(steel,s*1.77,3.38,z,2.11,.17,.25);
 b.box('#b6d2d6',s*2.27,3.24,z,.76,.045,.14,0,0,0,'light');
 b.box('#44525d',s*3.19,.59,z,.28,1.03,1.50);b.box(c,s*3.02,.84,z,.06,.105,1.42);
 b.box(steel,s*3.12,1.19,z,.11,.10,1.49);
 b.box('#a48c70',s*2.79,3.40,z,.095,.10,1.56);
 b.box(edge,s*2.60,3.46,z,.12,.12,1.54);
 b.box(inset,s*1.1,.019,z,.68,.018,.47);
 b.box('#76818a',s*1.1,.039,z,.63,.018,.42);
 for(const dx of [-.25,.25])b.box(inset,s*1.1+dx,.052,z+.13,.04,.01,.044);
 for(let k=0;k<4;k++)b.box(inset,s*2.73,.038,z-.44+k*.21,.28,.025,.095);
 }b.box('#657581',0,3.40,z,1.02,.10,.18)}
 for(const s of [-1,1]){
 b.box(steel,s*2.52,.61,-5.93,1.22,1.20,2.15);b.box(inset,s*2.35,1.28,-5.95,1.66,.18,2.15);
 for(let j=0;j<3;j++){let z=-6.7+j*.67;b.box('#335961',s*2.31,1.39,z,1.31,.06,.53,0,0,0,'glass');for(let k=0;k<5;k++)b.box(k%2?pale:amber,s*(1.83+.18*k),1.432,z+.13,.12,.016,.055,0,0,0,'light')}
 b.box(inset,s*2.37,1.95,-7.15,1.41,.92,.13,-.18);
 b.box('#173944',s*2.37,1.99,-7.04,1.25,.69,.03,-.18,0,0,'glass');
 for(let j=0;j<7;j++)b.box(j===4?amber:pale,s*2.37+.15,2.23-j*.075,-6.958,.15+((j*13)%9)*.034,.018,.012,0,0,0,'light');
 for(let j=0;j<3;j++){const dial=new T.TorusGeometry(.05+j*.041,.006,4,24);b.primitive(dial,'#6eaaa5',s*2.37-.31,2.0,-6.956,1,1,1,0,0,0,'light')}
 b.box(inset,s*2.13,.64,-4.31,.74,.19,.69);b.box('#42535c',s*2.13,.86,-4.00,.70,.71,.16,-.12);
 b.primitive(cylinder,edge,s*2.13,.30,-4.26,.18,.61,.18);
 
 b.box(steel,s*2.31,1.35,-8.07,2.24,.25,.37);b.box(steel,s*2.16,2.48,-8.06,.11,2.1,.2,0,0,-s*.27);
 if(id===1){for(let j=0;j<3;j++){b.box(edge,s*2.67,.55,1+j*1.5,1.04,1.1,1.32);b.box(c,s*2.67,.82,1+j*1.5,1.06,.15,1.34)}}
 else if(id===2){b.primitive(cylinder,inset,s*2.68,.5,.45,.59,1,.59);b.primitive(new T.OctahedronGeometry(1,1),pale,s*2.68,1.51,.45,.33,.65,.33,0,0,0,'light')}
 }
 b.box(steel,0,1.72,8.12,6.8,3.48,.24);
 for(const s of [-1,1]){b.box(inset,s*.68,1.47,7.95,1.31,2.8,.19);b.box(edge,s*.68,1.47,7.81,1.14,2.53,.10);b.box(c,s*.68,1.84,7.745,1.08,.14,.04);b.box(pale,s*1.43,1.71,7.72,.065,2.51,.06,0,0,0,'light')}
 b.box(steel,0,.45,-8.07,6.85,.95,.26);return b.finish()
}

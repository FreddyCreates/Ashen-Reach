// Both renderers consume the same offline contact-light sample for each vertex.
import {Float32BufferAttribute} from './three.module.js';
const files=new Map();
export function lighting(kind,id){
 const key=kind+'-'+id;if(!files.has(key)){
 files.set(key,fetch('./art/'+key+'.ao').then(r=>r.ok?r.arrayBuffer():null).then(b=>b&&new Uint8Array(b)).catch(()=>null))}
 return files.get(key)
}
export async function applyLighting(root,kind,id){
 const meshes=root.children.filter(o=>o.isMesh);
 for(const mesh of meshes){const count=mesh.geometry.attributes.position.count;mesh.geometry.setAttribute('color',new Float32BufferAttribute(new Float32Array(count*3).fill(1),3));
 mesh.material=mesh.material.clone();mesh.material.vertexColors=true}
 const data=await lighting(kind,id);if(!data)return;
 const length=meshes.reduce((n,m)=>n+m.geometry.attributes.position.count,0);
 if(length!==data.length)return;
 let offset=0;for(const mesh of meshes){const geo=mesh.geometry,count=geo.attributes.position.count,colors=new Float32Array(count*3);
 for(let i=0;i<count;i++){const light=mesh.material.name.startsWith('light')?1:data[offset+i]/255;colors.fill(light,3*i,3*i+3)}
 geo.setAttribute('color',new Float32BufferAttribute(colors,3));if(!mesh.material.vertexColors){mesh.material=mesh.material.clone();mesh.material.vertexColors=true}offset+=count}
}

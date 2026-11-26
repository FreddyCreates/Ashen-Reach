"""Bake short-range ambient occlusion in original vertex order for all static models."""
import json,math,sys
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
src,dest=sys.argv[sys.argv.index('--')+1:];models=json.loads(Path(src).read_text())
directions=[]
for j in range(32):
 z=(j+.5)/32;rad=math.sqrt(1-z*z);a=j*2.399963
 directions.append((rad*math.cos(a),rad*math.sin(a),z))
for kind,group in models.items():
 for index,meshes in enumerate(group):
  verts=[];faces=[]
  for mesh in meshes:
   first=len(verts);p=mesh['p'];ix=mesh['i'];verts.extend([p[j:j+3] for j in range(0,len(p),3)]);faces.extend([tuple(first+v for v in ix[j:j+3]) for j in range(0,len(ix),3)])
  tree=BVHTree.FromPolygons(verts,faces,all_triangles=True);data=bytearray();cache={}
  for mesh in meshes:
   p,n=mesh['p'],mesh['n']
   for j in range(0,len(p),3):
    key=tuple(round(v,4) for v in p[j:j+3]+n[j:j+3])
    if key not in cache:
     pos=Vector(p[j:j+3]);normal=Vector(n[j:j+3]).normalized()
     axis=normal.cross(Vector((0,1,0) if abs(normal.y)<.85 else (1,0,0))).normalized();cross=normal.cross(axis)
     limit=1.45 if kind=='decks' else .42;hit=0
     for x,y,z in directions:
      _,_,_,d=tree.ray_cast(pos+normal*.013,axis*x+cross*y+normal*z,limit)
      if d is not None:hit+=1-.5*d/limit
     cache[key]=round(255*(1-.81*hit/len(directions)))
    data.append(cache[key])
  Path(dest,f'{kind}-{index}.ao').write_bytes(data)

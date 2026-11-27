"""Deterministic authored-brief to mesh compiler. No learned inference is claimed."""
import json, math, random, hashlib, argparse
from pathlib import Path

def terrain(spec):
    n=spec["resolution"]; extent=spec["extent_m"]; seed=spec["seed"]
    if not 17<=n<=257 or not 100<=extent<=10000: raise ValueError("invalid terrain budget")
    rng=random.Random(seed); phases=[rng.uniform(0,math.tau) for _ in range(8)]
    vertices=[]; faces=[]
    for j in range(n):
        z=(j/(n-1)-.5)*extent
        for i in range(n):
            x=(i/(n-1)-.5)*extent
            coast=-130+45*math.sin(z/150+phases[0])+18*math.sin(z/43+phases[1])
            inland=1/(1+math.exp(max(-60,min(60,-(x-coast)/12))))
            rough=sum((12/(2**k))*math.sin(x/(85/2**k)+phases[k])*math.cos(z/(92/2**k)+phases[k+4]) for k in range(4))
            y=-18+inland*(spec["cliff_height_m"]+18+rough)
            vertices.append([round(x,4),round(y,4),round(z,4)])
    for j in range(n-1):
        for i in range(n-1):
            a=j*n+i;b=a+1;c=a+n;d=c+1
            faces.extend([[a,c,b],[b,c,d]])
    return {"vertices":vertices,"triangles":faces}

def architecture(spec):
    y=spec["port"]["deck_y"]; r=spec["port"]["pad_radius"]
    entities=[]
    def box(name,x,z,w,h,d,base=y,material="ceramic",collision=True):
        entities.append(dict(id=name,kind="box",center=[x,base+h/2,z],size=[w,h,d],material=material,collision=collision))
    box("foundation",0,0,180,18,180,y-18,"basalt")
    box("pad-N-04",0,0,2*r,.3,2*r,y,"basalt")
    for side in [-1,1]:
        box("pylon-"+str(side),side*65,65,15,75,22)
        box("freight-"+str(side),side*65,-45,24,10,55)
        for i in range(8):
            box("light-"+str(side)+"-"+str(i),side*(r+5),-35+i*10,.6,.5,.6,y,"amber",False)
    box("gateway",0,65,145,12,22,y+63)
    box("market",0,125,80,14,36)
    box("refit",55,125,24,12,32)
    return {"entities":entities,"pad":{"id":"N-04","position":[0,y+.3,0],"radius":r,"max_speed_mps":3,"max_clearance_m":5},"waypoints":[[0,y+220,-480],[0,y+60,-160],[0,y+10,-45],[0,y+.3,0]]}

def validate(mesh, scene):
    v=mesh["vertices"]; t=mesh["triangles"]
    if not v or any(len(p)!=3 or not all(math.isfinite(k) for k in p) for p in v): raise ValueError("invalid vertices")
    if not t or any(len(f)!=3 or len(set(f))!=3 or min(f)<0 or max(f)>=len(v) for f in t): raise ValueError("invalid indices")
    ids=[e["id"] for e in scene["entities"]]
    if len(ids)!=len(set(ids)): raise ValueError("duplicate entities")
    if not any(e["id"]=="pad-"+scene["pad"]["id"] for e in scene["entities"]): raise ValueError("missing pad")
    return {"vertices":len(v),"triangles":len(t),"entities":len(ids)}

def write_json(path,data):
    path=Path(path); path.parent.mkdir(parents=True,exist_ok=True)
    payload=json.dumps(data,sort_keys=True,separators=(",",":"),allow_nan=False).encode()
    tmp=path.with_suffix(path.suffix+".tmp");tmp.write_bytes(payload);tmp.replace(path)
    return hashlib.sha256(payload).hexdigest()

def build(spec,out):
    out=Path(out); mesh=terrain(spec); scene=architecture(spec); counts=validate(mesh,scene)
    manifest={"schema":1,"world":spec["id"],"source_sha256":hashlib.sha256(json.dumps(spec,sort_keys=True).encode()).hexdigest(),"quality":"procedural blockout, not photoreal","counts":counts,"files":{}}
    for name,data in [("terrain.json",mesh),("scene.json",scene)]:
        manifest["files"][name]=write_json(out/name,data)
    write_json(out/"manifest.json",manifest)
    return manifest

if __name__=="__main__":
    parser=argparse.ArgumentParser();parser.add_argument("--spec",default="game-design/worlds/nacre.json");parser.add_argument("--out",default="studio-output/nacre")
    args=parser.parse_args();print(json.dumps(build(json.loads(Path(args.spec).read_text()),args.out),indent=2))

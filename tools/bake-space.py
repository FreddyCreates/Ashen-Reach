"""Bake repeatable world surfaces and a nebula using spherical and planar fractal noise."""
from pathlib import Path
import numpy as np
from scipy.ndimage import map_coordinates
from PIL import Image,ImageDraw,ImageFilter
out=Path(__file__).resolve().parents[1]/'dist/art'
def save(name,a,q=89):Image.fromarray(np.uint8(np.clip(a,0,255))).save(out/name,quality=q,method=5)
def noise(axes,seed,octaves=6):
 axes=np.array(axes,dtype='f');total=0
 for j in range(octaves):
  grid=np.random.default_rng(seed+j).random((40,)*len(axes),dtype='f');v=map_coordinates(grid,axes*(1.9*2**j)+11,order=3,mode='grid-wrap');total=total+(v-.5)*.52**j
 return total
def blend(a,b,f):return np.asarray(a)*(1-f[...,None])+np.asarray(b)*f[...,None]
def sat(a):return np.clip(a,0,1)
def palette(v,stops):return np.stack([np.interp(v,[p[0] for p in stops],[p[1][c] for p in stops]) for c in range(3)],-1)
h,w=720,1536
y,x=np.mgrid[0:h,0:w];xx=x/w;yy=y/h
v=noise([xx*2.7,yy*1.5],89);u=noise([xx*4+v*.26,yy*2+v*.2],232);lane=np.exp(-((yy-.35+.38*xx-.16*np.sin(xx*6)-.20*v)/.21)**2)
filament=sat((u+.45)*.88)*lane;shine=sat(.35+v*1.2)**2*lane
sky=blend([4,10,18],[29,53,61],sat(filament*1.28));sky+=shine[...,None]*[55,37,24]+sat((.3-u)*lane)[...,None]*[9,7,13]
rng=np.random.default_rng(43);sky+=rng.normal(size=(h,w,1))*.9
im=Image.fromarray(np.uint8(np.clip(sky,0,255)));d=ImageDraw.Draw(im)
for i in range(2400):
 sx,sy=rng.integers([0,0],[w,h]);l=rng.random()**3;col=tuple(int(a*(.3+l*.68)) for a in (216,228,239));d.point((sx,sy),fill=col)
 if l>.97:d.line((sx-2,sy,sx+2,sy),fill=tuple(c//2 for c in col));d.point((sx,sy),fill=(224,232,239))
im.save(out/'dust-lane.webp',quality=93)
h,w=768,1536;y,x=np.mgrid[0:h,0:w];lat=(.5-y/(h-1))*np.pi;lon=x/w*2*np.pi
sx=np.cos(lat)*np.cos(lon);sy=np.sin(lat);sz=np.cos(lat)*np.sin(lon)
for i in range(4):
 a=np.array([sx,sy,sz]);warp=noise(a*.87,81+i);v=noise(a*1.4+warp*.43,17+i*29);ridge=(1-np.abs(noise(a*6+warp,91+i))*2)**3;cloud=sat((noise(a*1.65+warp*.8,174+i)+.05)*1.7)
 if i==0:
  col=palette(v,[(-1,(34,38,47)),(-.27,(75,59,54)),(-.15,(101,73,56)),(.02,(171,112,69)),(.19,(202,153,104)),(.42,(226,196,157)),(1,(235,216,191))]);col+=ridge[...,None]*[18,13,9]
 elif i==1 or i==3:
  col=palette(v,[(-1,(8,36,59)),(-.18,(20,74,97)),(-.045,(33,112,119)),(-.028,(181,174,130)),(.015,(108,129,85)),(.18,(75,91,65)),(.48,(183,170,132)),(1,(231,214,187))]);col=blend(col,[217,224,222],sat((abs(sy)-.91)*12+v*.4))
 else:
  band=np.sin(sy*37+warp*4+v*2)+.5*np.sin(sy*89+warp*5);col=palette(band,[(-2,(64,55,81)),(-.6,(128,97,124)),(.1,(170,141,156)),(.7,(198,174,173)),(2,(231,207,184))])
 # Terrain relief and high-altitude weather are independent layers at orbital scale.
 height=v+.055*ridge
 if i==0:
  seeded=np.random.default_rng(600);craters=np.zeros_like(v)
  for _ in range(36):
   center=seeded.normal(size=3);center/=np.linalg.norm(center);radius=seeded.uniform(.012,.068)
   d=np.sqrt(np.maximum(0,2*(1-(sx*center[0]+sy*center[1]+sz*center[2]))))/radius
   craters+=.023*np.exp(-((d-1)/.16)**2)-.034*np.exp(-(d/.72)**4)
  height+=craters
 if i==2:
  # A long-lived vortex perturbs the band structure near the survey latitude.
  dx=np.arctan2(np.sin(lon-2.7),np.cos(lon-2.7));dy=lat+.31
  d=np.sqrt((dx/.25)**2+(dy/.105)**2);swirl=(1+np.cos(d*19+warp*5))*.5
  col=blend(col,[200,138,119],np.exp(-d*d)*(.56+.33*swirl))
 else:
  gy,gx=np.gradient(height);relief=np.clip((gx*8+gy*12),-.21,.22)
  land=np.ones_like(v) if i==0 else sat((v+.035)*35)
  col*=1+(relief*land)[...,None]
 rough=sat(.5+height*.75)
 save(f'relief-{i}.webp',rough*255)
 cloudAlpha=sat((cloud-.14)*1.20)**1.45*(.37 if i==0 else .57)
 save(f'weather-{i}.webp',np.dstack([np.full_like(v,234),np.full_like(v,229),np.full_like(v,218),cloudAlpha*255]))
 save(f'world-{i}.webp',col)
 col=blend(col,[234,229,218],cloudAlpha)
 # Spherical, pre-lit disc for devices without WebGL.
 size=768;Y,X=np.mgrid[0:size,0:size];X=(X-size/2)/(size*.46);Y=(size/2-Y)/(size*.46);r2=X*X+Y*Y;Z=np.sqrt(sat(1-r2));U=((np.arctan2(X,Z)/(2*np.pi)+.44)%1*w).astype(int);V=(np.arccos(np.clip(Y,-1,1))/np.pi*(h-1)).astype(int)
 lam=X*(-.73)+Y*.49+Z*.22;lighting=.086+1.05*sat(lam)**.77;rim=(1-Z)**3*sat(lam+.43)
 rgb=col[V,U]*lighting[...,None]+rim[...,None]*[94,144,163];alpha=sat((1-np.sqrt(r2))*size*.5);save(f'disc-{i}.webp',np.dstack([rgb,alpha*255]))

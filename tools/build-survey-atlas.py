"""Extract survey sites and elevation samples from the same textures used on the globe."""
from pathlib import Path
import base64
import json
import numpy as np
from PIL import Image

root=Path(__file__).resolve().parents[1]/'dist'
maps,sites=[],[]
for family in range(4):
    relief=Image.open(root/'art'/f'relief-{family}.webp').convert('L')
    low=relief.resize((160,80),Image.Resampling.BOX)
    maps.append(base64.b64encode(low.tobytes()).decode())
    elevation=np.asarray(relief)
    color=np.asarray(Image.open(root/'art'/f'world-{family}.webp').convert('RGB')).astype(float)
    choices=[]
    for band in range(8):
        # Distribute expeditions by longitude. For coastal worlds choose cells
        # whose surrounding 16-km-scale texels contain both sea and dry land.
        if family in (1,3):
            wet=(color[:,:,2]>color[:,:,0]*1.28)
            span=10
            edge=wet!=np.roll(wet,span,axis=1)
            score=edge.astype(float)*2+(~wet).astype(float)
        else:
            score=np.abs(np.gradient(elevation.astype(float),axis=0))
        x0=int((.06+band*.115)*relief.width);x1=min(relief.width-1,x0+int(.075*relief.width))
        y0=int(.31*relief.height);y1=int(.65*relief.height)
        y,x=np.unravel_index(np.argmax(score[y0:y1,x0:x1]),(y1-y0,x1-x0))
        u=(x+x0+.5)/relief.width;v=(y+y0+.5)/relief.height
        choices.append([round(90-180*v,3),round(360*u-180,3)])
    sites.append(choices)
(root/'survey-atlas-data.mjs').write_text('export const elevations='+json.dumps(maps)+';\nexport const sites='+json.dumps(sites)+';\n')

"""Fit a single-hidden-layer flight controller by supervised regression."""
import json
from pathlib import Path
import numpy as np
rng=np.random.default_rng(951)
x=rng.uniform(-1,1,(24000,3))
w=rng.normal(0,1.8,(3,64));bias=rng.uniform(-1,1,64)
def hidden(a):return np.column_stack((np.ones(len(a)),np.tanh(a@w+bias)))
h=hidden(x);y=np.clip(x*np.array([5.0,6.0,7.0]),-1,1)
v=np.linalg.solve(h.T@h+.0003*np.eye(65),h.T@y)
test=rng.uniform(-1,1,(2000,3));print('held-out RMSE',np.mean((np.clip(hidden(test)@v,-1,1)-np.clip(test*[5,6,7],-1,1))**2)**.5)
out=Path(__file__).resolve().parents[1]/'dist/pilot-weights.mjs'
out.write_text('export const weights='+json.dumps([a.round(7).tolist() for a in [w,bias,v]],separators=(',',':'))+';\n')

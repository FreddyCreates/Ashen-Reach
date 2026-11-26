"""Blender offline reference views for the GPU-free renderer; input from export-models.mjs."""
import bpy,sys,json,math
from pathlib import Path
from mathutils import Vector
source,destination=sys.argv[sys.argv.index('--')+1:]
models=json.loads(Path(source).read_text()); out=Path(destination)
bpy.ops.wm.read_factory_settings(use_empty=True); sc=bpy.context.scene
sc.render.engine='CYCLES';sc.cycles.samples=42;sc.cycles.use_denoising=False
sc.render.image_settings.file_format='PNG';sc.render.film_transparent=True
sc.world=bpy.data.worlds.new('Starfield fill');sc.world.use_nodes=True
sc.world.node_tree.nodes['Background'].inputs[0].default_value=(.35,.44,.56,1)
sc.world.node_tree.nodes['Background'].inputs[1].default_value=.68
def track(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
def lamp(name,p,power,color,size):
 a=bpy.data.lights.new(name,'AREA');a.energy=power;a.color=color;a.shape='DISK';a.size=size
 o=bpy.data.objects.new(name,a);sc.collection.objects.link(o);o.location=p;track(o,(0,0,0))
lamp('Long softbox',(-3,1,8),1050,(1,.84,.68),5);lamp('Cool rim',(4,-5,5),1500,(.47,.69,1),4);lamp('Bow bounce',(-1,7,2),380,(.8,.92,1),4)
cam=bpy.data.objects.new('Camera',bpy.data.cameras.new('Camera'));sc.collection.objects.link(cam);sc.camera=cam
def build(model):
 obs=[]
 for part in model:
  arr=part['p'];idx=part['i'];me=bpy.data.meshes.new(part['name']);me.from_pydata([(arr[j],-arr[j+2],arr[j+1]) for j in range(0,len(arr),3)],[],[idx[j:j+3] for j in range(0,len(idx),3)]);me.update()
  o=bpy.data.objects.new(part['name'],me);sc.collection.objects.link(o);obs.append(o)
  m=bpy.data.materials.new(part['name']);m.use_nodes=True;n=m.node_tree.nodes;bs=n.get('Principled BSDF');color=(*part['color'],1);bs.inputs['Base Color'].default_value=color;bs.inputs['Metallic'].default_value=.55;bs.inputs['Roughness'].default_value=.37
  if part['name'].startswith('light'):
   for key in ['Emission Color','Emission']:
    if key in bs.inputs:bs.inputs[key].default_value=color
   bs.inputs['Emission Strength'].default_value=2
  noise=n.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=175;bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.13;bump.inputs['Distance'].default_value=.012;m.node_tree.links.new(noise.outputs['Fac'],bump.inputs['Height']);m.node_tree.links.new(bump.outputs['Normal'],bs.inputs['Normal'])
  if part['name'].startswith('glass'):
   bs.inputs['Roughness'].default_value=.14;bs.inputs['Metallic'].default_value=.76
  if part['name'].startswith('plate'):
   ramp=n.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.25;ramp.color_ramp.elements[0].color=tuple(x*.64 for x in color[:3])+(1,)
   ramp.color_ramp.elements[1].position=.77;ramp.color_ramp.elements[1].color=tuple(min(1,x*1.12+.016) for x in color[:3])+(1,)
   m.node_tree.links.new(noise.outputs['Fac'],ramp.inputs['Fac']);m.node_tree.links.new(ramp.outputs['Color'],bs.inputs['Base Color'])
  o.data.materials.append(m)
 return obs
def render(name,res,loc,target,lens,ortho=False):
 sc.render.resolution_x,sc.render.resolution_y=res;sc.render.resolution_percentage=100;cam.location=loc;track(cam,target);cam.data.type='ORTHO' if ortho else 'PERSP';cam.data.lens=lens;cam.data.ortho_scale=lens;sc.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
for i,model in enumerate(models['ships']):
 obs=build(model)
 if i<3:render('hero-'+str(i),(1000,700),(5.7,6.7,4.35),(0,.15,.05),7.9,True)
 if i<3:
  for f in range(1,12):
   a=math.atan2(5.7,6.7)-f*math.tau/12
   render(f'turn-{i}-{f}',(680,476),(8.8*math.sin(a),8.8*math.cos(a),4.35),(0,.15,.05),7.9,True)
 render('flight-'+str(i),(360,360),(0,-6,5),(0,0,0),7.2,True)
 for o in obs:bpy.data.objects.remove(o,do_unlink=True)

// Presentation only. Bedrock, canonical positions and the y=0 collision datum
// remain owned by planet-geography / surface-expedition, not the renderer.
import * as T from './three.module.js';

const lightByFamily=[
 {haze:0xb6a18f,density:.0025,sky:0xcceaff,ground:0x3a302b,sun:0xffd6a4},
 {haze:0x91b0b6,density:.0021,sky:0xc3dfe8,ground:0x39483d,sun:0xffd9a1,water:0x163d45},
 {haze:0xb6a9c3,density:.0026,sky:0xe3d5f0,ground:0x403144,sun:0xf6ddce},
 {haze:0x8d9a9b,density:.0024,sky:0xb7cad2,ground:0x494339,sun:0xffc193,water:0x243b42}
].map(Object.freeze);
export const surfaceLightFor=bodyId=>lightByFamily[bodyId%4]??lightByFamily[0];

export function makeCoastalWater(bodyId,light=surfaceLightFor(bodyId)){
 if(!light.water)return null;
 const waterColor=new T.Color(light.water), skyColor=new T.Color(light.sky);
 const material=new T.ShaderMaterial({
  fog:true,
  uniforms:T.UniformsUtils.merge([T.UniformsLib.fog,{uSea:{value:waterColor},uSky:{value:skyColor},uTime:{value:0}}]),
  vertexShader:`
   #include <common>
   #include <fog_pars_vertex>
   varying vec3 vWorld;
   void main(){
    vWorld=(modelMatrix*vec4(position,1.)).xyz;
    vec4 mvPosition=viewMatrix*vec4(vWorld,1.);
    gl_Position=projectionMatrix*mvPosition;
    #include <fog_vertex>
   }`,
  fragmentShader:`
   #include <common>
   #include <fog_pars_fragment>
   uniform vec3 uSea,uSky;
   uniform float uTime;
   varying vec3 vWorld;
   void main(){
    vec3 ray=cameraPosition-vWorld;
    float fade=1.-smoothstep(42.,190.,length(ray));
    vec2 p=vWorld.xz;
    float a=dot(p,vec2(.64,.83))+uTime*1.35;
    float b=dot(p,vec2(-1.43,.29))-uTime*1.84;
    float c=dot(p,vec2(.2,2.08))+uTime*2.;
    vec3 n=normalize(vec3(fade*(.11*cos(a)-.047*cos(b)),1.,fade*(.09*cos(a)+.045*cos(c))));
    vec3 eye=normalize(ray);
    float grazing=pow(1.-max(0.,dot(eye,n)),4.);
    vec3 halfLight=normalize(vec3(-.58,.71,.40)+eye);
    float spark=pow(max(0.,dot(n,halfLight)),106.)*(.12+.38*fade);
    vec3 ink=mix(uSea*(.99+fade*.055*sin(a+b)),uSky,.075+.40*grazing);
    gl_FragColor=vec4(ink+vec3(1.,.80,.56)*spark,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
   }`
 });
 // Vertices stay on the canonical sea datum. Move the coverage window, not the ripple coordinates.
 const water=new T.Mesh(new T.PlaneGeometry(1150,1150),material);
 water.rotation.x=-Math.PI/2;water.userData.time=material.uniforms.uTime;
 return water;
}

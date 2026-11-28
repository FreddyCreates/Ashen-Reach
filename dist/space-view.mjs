import {renderSurvey} from './survey-view.mjs';
import * as T from './three.module.js';
import {random} from './universe.mjs';
import {shipModel,shipDetailModel,deckModel,surfaces} from './fleet-models.mjs';
import {applyLighting} from './mesh-light.mjs';
import {drawFallback} from './software-view.mjs';

let canvas = document.getElementById('view'), gl, ctx;
try {
  gl = new T.WebGLRenderer({canvas, antialias: true, powerPreference: 'high-performance'});
} catch {
  ctx = canvas.getContext('2d');
}

const scene = new T.Scene();
const camera = new T.PerspectiveCamera(54, 1, 0.08, 450);
const sky = new T.Group();
const deck = new T.Group();
const fleet = new T.Group();
const vessel = new T.Group();
const patrol = new T.Group();
const fire = new T.Group();
const fxGroup = new T.Group();

scene.add(sky, deck, fleet, fxGroup);
fleet.add(vessel, patrol, fire);

const fleetAssets = new Map(), detailAssets = new Map(), deckAssets = new Map();
const assets = new T.TextureLoader(), textures = new Map();

function texture(name) {
  if (!textures.has(name)) {
    const tex = assets.load('./art/' + name + '.webp');
    tex.colorSpace = T.SRGBColorSpace;
    textures.set(name, tex);
  }
  return textures.get(name);
}

function procedural(width, height, paint) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  paint(c.getContext('2d'), width, height);
  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  return tex;
}

// Lighting Setup with High Dynamic Range feeling
const key = new T.DirectionalLight(0xfffaec, 4.2);
key.position.set(-14, 8, 6);
const rim = new T.DirectionalLight(0x76caff, 2.8);
rim.position.set(8, 4, -10);
const hemi = new T.HemisphereLight(0xbfd7ea, 0x24303d, 1.4);
scene.add(key, rim, hemi);

// High-fidelity Planet Sphere & Atmosphere
const orb = new T.Mesh(new T.SphereGeometry(14, 96, 64), new T.MeshStandardMaterial({roughness: 0.95, metalness: 0.05}));
orb.position.set(12, 7, -53);
sky.add(orb);

// Atmospheric scattering shader with sun-direction awareness and dynamic world tints
const atmosphereShader = {
  uniforms: {
    sunDir: { value: new T.Vector3(-14, 8, 6).normalize() },
    rimColor: { value: new T.Color(0x3ea7d8) },
    glowColor: { value: new T.Color(0x89e2ff) }
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vEye;
    varying vec3 vWorldPos;
    void main() {
      vec4 p = modelViewMatrix * vec4(position, 1.0);
      vNormal = normalize(normalMatrix * normal);
      vEye = normalize(-p.xyz);
      vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * p;
    }
  `,
  fragmentShader: `
    uniform vec3 sunDir;
    uniform vec3 rimColor;
    uniform vec3 glowColor;
    varying vec3 vNormal;
    varying vec3 vEye;
    varying vec3 vWorldPos;
    void main() {
      float viewDot = max(0.0, dot(vNormal, vEye));
      float rim = pow(1.0 - viewDot, 4.5);
      float sunDot = max(0.0, dot(vNormal, sunDir));
      vec3 finalColor = mix(rimColor, glowColor, sunDot * 0.7);
      float alpha = rim * (0.35 + sunDot * 0.65);
      gl_FragColor = vec4(finalColor, alpha * 0.88);
    }
  `
};

const atmosphereMat = new T.ShaderMaterial({
  uniforms: atmosphereShader.uniforms,
  vertexShader: atmosphereShader.vertexShader,
  fragmentShader: atmosphereShader.fragmentShader,
  transparent: true,
  depthWrite: false,
  side: T.BackSide,
  blending: T.AdditiveBlending
});

const atmosphere = new T.Mesh(orb.geometry, atmosphereMat);
atmosphere.position.copy(orb.position);
atmosphere.scale.setScalar(1.025);
sky.add(atmosphere);

// Weather & cloud layer (dual altitude convective cloud decks)
const weather = new T.Mesh(orb.geometry, new T.MeshStandardMaterial({transparent: true, depthWrite: false, roughness: 1, opacity: 0.88}));
weather.position.copy(orb.position);
weather.scale.setScalar(1.012);
sky.add(weather);

// High-altitude cirrus / upper cloud band for realistic atmospheric depth
const cirrus = new T.Mesh(orb.geometry, new T.MeshStandardMaterial({transparent: true, depthWrite: false, roughness: 1, opacity: 0.42, blending: T.AdditiveBlending}));
cirrus.position.copy(orb.position);
cirrus.scale.setScalar(1.022);
sky.add(cirrus);

// Moon
const moon = new T.Mesh(new T.IcosahedronGeometry(1.35, 4), new T.MeshStandardMaterial({color: 0xc4bdae, roughness: 0.95}));
sky.add(moon);

// Planetary Rings
const rings = new T.Group();
rings.position.copy(orb.position);
rings.rotation.set(1.21, 0.16, -0.29);
sky.add(rings);
for (const [inner, outer, opacity] of [[17.1, 18.05, 0.16], [18.1, 19.9, 0.45], [20.05, 20.26, 0.6], [20.6, 22.3, 0.28], [22.4, 23.2, 0.14]]) {
  rings.add(new T.Mesh(new T.RingGeometry(inner, outer, 128), new T.MeshBasicMaterial({color: 0xd9cbb7, side: T.DoubleSide, transparent: true, opacity, depthWrite: false})));
}

// Asteroid belt
const belt = new T.InstancedMesh(new T.IcosahedronGeometry(0.18, 0), new T.MeshStandardMaterial({color: 0x8a847f, roughness: 0.92}), 110);
sky.add(belt);

// Orbital stations
const stationMat = new T.MeshStandardMaterial({color: 0xcfd6ce, metalness: 0.6, roughness: 0.4});
// Three colony job groups, up to 18 stations each, three parts per station.
const station = new T.InstancedMesh(new T.BoxGeometry(), stationMat, 3 * 18 * 3);
sky.add(station);

// Deep Starfield Background (Multi-layered colored stars)
const starCount = 2200;
const starGeo = new T.BufferGeometry();
const starPos = new Float32Array(starCount * 3);
const starCols = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  const rad = 240 + Math.random() * 80;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  starPos[i * 3] = rad * Math.sin(phi) * Math.cos(theta);
  starPos[i * 3 + 1] = rad * Math.sin(phi) * Math.sin(theta);
  starPos[i * 3 + 2] = rad * Math.cos(phi);

  // Stellar spectral distribution
  const temp = Math.random();
  let r = 1, g = 1, b = 1;
  if (temp < 0.25) { r = 0.65; g = 0.85; b = 1.0; } // Blue giant
  else if (temp < 0.6) { r = 1.0; g = 0.98; b = 0.92; } // Yellow-white
  else if (temp < 0.85) { r = 1.0; g = 0.82; b = 0.62; } // Amber
  else { r = 1.0; g = 0.55; b = 0.45; } // Red dwarf
  starCols[i * 3] = r;
  starCols[i * 3 + 1] = g;
  starCols[i * 3 + 2] = b;
}
starGeo.setAttribute('position', new T.BufferAttribute(starPos, 3));
starGeo.setAttribute('color', new T.BufferAttribute(starCols, 3));
const starMat = new T.PointsMaterial({size: 1.4, vertexColors: true, transparent: true, opacity: 0.85});
const starField = new T.Points(starGeo, starMat);
sky.add(starField);

// Volumetric Nebula Billboard
const nebulaMap = procedural(256, 256, (b, w, h) => {
  const g = b.createRadialGradient(w/2, h/2, 10, w/2, h/2, w/2);
  g.addColorStop(0, 'rgba(64, 160, 210, 0.28)');
  g.addColorStop(0.4, 'rgba(120, 70, 190, 0.18)');
  g.addColorStop(0.75, 'rgba(40, 30, 80, 0.08)');
  g.addColorStop(1, 'transparent');
  b.fillStyle = g;
  b.fillRect(0, 0, w, h);
});
const nebulaMat = new T.SpriteMaterial({map: nebulaMap, transparent: true, blending: T.AdditiveBlending, depthWrite: false});
const nebula = new T.Sprite(nebulaMat);
nebula.position.set(-60, 30, -180);
nebula.scale.set(160, 160, 1);
sky.add(nebula);

// World atmosphere presets
const worldAtmospheres = [
  { rim: 0xd98642, glow: 0xffba7b }, // Aurelia (Ferric amber)
  { rim: 0x33b8dd, glow: 0x9be8ff }, // Nacre (Oceanic cyan)
  { rim: 0xb454d6, glow: 0xf0a4ff }, // Veyra (Ammonia violet)
  { rim: 0x48c792, glow: 0x96f5cc }  // Orison (Basalt emerald)
];

let worldStamp = '', chosen = -1, deckChoice = -1, details = null;
function orbit(w) {
  const stamp = w.id + '/' + w.age;
  if (stamp === worldStamp) return;
  worldStamp = stamp;

  orb.material.map = texture('world-' + w.id % 4);
  orb.material.bumpMap = texture('relief-' + w.id % 4);
  orb.material.bumpMap.colorSpace = T.NoColorSpace;
  orb.material.bumpScale = w.id % 4 === 2 ? 0.018 : 0.12;

  weather.material.map = texture('weather-' + w.id % 4);
  weather.material.needsUpdate = true;
  cirrus.material.map = texture('weather-' + w.id % 4);
  cirrus.material.needsUpdate = true;
  moon.material.bumpMap = texture('relief-0');
  moon.material.bumpMap.colorSpace = T.NoColorSpace;
  moon.material.bumpScale = 0.09;

  rings.visible = w.id % 4 === 2;
  orb.material.needsUpdate = true;

  // Update atmosphere colors
  const atmo = worldAtmospheres[w.id % 4];
  atmosphereShader.uniforms.rimColor.value.setHex(atmo.rim);
  atmosphereShader.uniforms.glowColor.value.setHex(atmo.glow);

  const r = random(w.id + 440), o = new T.Object3D();
  let n = 0;
  for (let k = 0; k < 3; k++) {
    for (let i = 0; i < Math.min(18, w.buildings[k]); i++) {
      const a = r() * 6.283, rad = 16 + r() * 4.5;
      o.position.set(orb.position.x + Math.cos(a) * rad, 7 + Math.sin(a) * rad * 0.31, -53 + Math.sin(a) * rad);
      o.rotation.set(0.13, a, 0.08);
      for (const [x, y, z] of [[0.6, 0.65, 0.55], [2.4, 0.09, 0.52], [0.12, 1.3, 0.15]]) {
        o.scale.set(x, y, z);
        o.updateMatrix();
        station.setMatrixAt(n++, o.matrix);
      }
    }
  }

  for (let i = 0; i < belt.count; i++) {
    const angle = r() * Math.PI * 2, dist = 23 + r() * 7, sz = 0.4 + r() * 1.33;
    o.position.set(orb.position.x + Math.cos(angle) * dist, 7 + Math.cos(angle) * 3 + r() * 1.4, -53 + Math.sin(angle) * dist);
    o.rotation.set(r() * 6, r() * 6, r() * 6);
    o.scale.set(sz, sz * (0.42 + r() * 0.7), sz * 0.7);
    o.updateMatrix();
    belt.setMatrixAt(i, o.matrix);
  }
  belt.instanceMatrix.needsUpdate = true;
  belt.computeBoundingSphere();
  station.count = n;
  station.instanceMatrix.needsUpdate = true;
  station.computeBoundingSphere();
}

// Spirit Visual Entity
const coreMap = procedural(96, 96, (b, w) => {
  const grad = b.createRadialGradient(w/2, w/2, 0, w/2, w/2, w/2);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.18, '#dffff2');
  grad.addColorStop(0.42, 'rgba(102, 255, 230, 0.55)');
  grad.addColorStop(0.75, 'rgba(40, 200, 180, 0.18)');
  grad.addColorStop(1, 'transparent');
  b.fillStyle = grad;
  b.fillRect(0, 0, w, w);
});

const spirit = new T.Group();
const sprite = new T.Sprite(new T.SpriteMaterial({map: coreMap, transparent: true, depthWrite: false, blending: T.AdditiveBlending}));
sprite.scale.setScalar(1.45);
spirit.add(sprite);

for (let i = 0; i < 3; i++) {
  const ring = new T.Mesh(new T.TorusGeometry(0.32 + i * 0.09, 0.016, 8, 48), new T.MeshBasicMaterial({color: 0x9effeb, transparent: true, opacity: 0.85}));
  ring.rotation.x = 0.55 + i * 0.6;
  ring.rotation.y = i * 0.4;
  spirit.add(ring);
}
fleet.add(spirit);

// Weapons Lasers
const laserGeo = new T.CylinderGeometry(0.045, 0.045, 1.4, 8);
laserGeo.rotateX(Math.PI / 2);
const beams = [0x7de6ff, 0xff7b60].map(color => new T.MeshBasicMaterial({color}));

// Coating and Textures
let coating;
function coat() {
  if (!coating) {
    const rand = random(712);
    coating = procedural(192, 192, (b, w, h) => {
      b.fillStyle = '#c6c6c6';
      b.fillRect(0, 0, w, h);
      for (let i = 0; i < 8500; i++) {
        const c = Math.round(160 + rand() * 85);
        b.fillStyle = 'rgb(' + c + ',' + c + ',' + c + ')';
        b.fillRect(rand() * w, rand() * h, rand() * 5 + 0.3, 0.55);
      }
    });
    coating.colorSpace = T.NoColorSpace;
    coating.wrapS = coating.wrapT = T.RepeatWrapping;
  }
  for (const m of surfaces.values()) {
    if (m.name.startsWith('plate') && !m.roughnessMap) {
      m.roughnessMap = coating;
      m.bumpMap = coating;
      m.bumpScale = 0.007;
      m.needsUpdate = true;
    }
  }
}

function asset(id) {
  if (!fleetAssets.has(id)) {
    fleetAssets.set(id, shipModel(id));
    coat();
    applyLighting(fleetAssets.get(id), 'ships', id);
  }
  return fleetAssets.get(id);
}

function inspectAsset(id) {
  if (!detailAssets.has(id)) {
    detailAssets.set(id, shipDetailModel(id));
    coat();
  }
  return detailAssets.get(id);
}

function instrumentation(ship) {
  const root = deckModel(ship);
  coat();
  applyLighting(root, 'decks', ship);
  const map = procedural(512, 256, (b, w, h) => {
    b.fillStyle = '#061a21';
    b.fillRect(0, 0, w, h);
    b.strokeStyle = '#163744';
    for (let i = 0; i < w; i += 22) {
      b.beginPath();
      b.moveTo(i, 0);
      b.lineTo(i, h);
      b.stroke();
    }
    b.fillStyle = '#9ddbd1';
    b.font = 'bold 25px monospace';
    b.fillText('ORBITAL NAV // ASTEN CORE', 17, 36);
    b.font = '15px monospace';
    b.fillText('TELEMETRY : AI ONLINE', 240, 74);
    b.strokeStyle = '#91c3bc';
    for (let i = 1; i < 4; i++) {
      b.beginPath();
      b.ellipse(116, 148, i * 29, i * 16, -0.37, 0, 6.29);
      b.stroke();
    }
    for (let i = 0; i < 8; i++) {
      b.fillStyle = i % 3 ? '#537b7f' : '#cbab7c';
      b.fillRect(240, 90 + i * 15, 43 + (i * 43) % 167, 4);
    }
  });

  const geometry = new T.PlaneGeometry(1.22, 0.68), mat = new T.MeshBasicMaterial({map});
  for (const s of [-1, 1]) {
    const screen = new T.Mesh(geometry, mat);
    screen.position.set(s * 2.37, 1.99, -6.997);
    screen.rotation.x = -0.18;
    root.add(screen);
  }
  return root;
}

// Particle Engine for Engine Trails and Sparks
const particleCount = 120;
const particleGeo = new T.BufferGeometry();
const particlePos = new Float32Array(particleCount * 3);
const particleAlpha = new Float32Array(particleCount);
const particleSizes = new Float32Array(particleCount);
const particlesData = Array.from({length: particleCount}, () => ({
  x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 1
}));
for (let i = 0; i < particleCount; i++) {
  particleAlpha[i] = 0;
  particleSizes[i] = 1.0;
}
particleGeo.setAttribute('position', new T.BufferAttribute(particlePos, 3));
particleGeo.setAttribute('alpha', new T.BufferAttribute(particleAlpha, 1));

const particleMat = new T.PointsMaterial({
  size: 2.2,
  color: 0x88eeff,
  transparent: true,
  opacity: 0.8,
  blending: T.AdditiveBlending,
  depthWrite: false
});
const particleSystem = new T.Points(particleGeo, particleMat);
fxGroup.add(particleSystem);

const impacts = new T.Group();
fleet.add(impacts);
const engines = new T.Group();
vessel.add(engines);

const exhaustMaterial = new T.MeshBasicMaterial({
  color: 0x6de5ff,
  transparent: true,
  opacity: 0.65,
  blending: T.AdditiveBlending,
  depthWrite: false
});
const plumeGeometry = new T.ConeGeometry(0.19, 1.15, 20);
plumeGeometry.rotateX(Math.PI / 2);
for (const side of [-1, 1]) {
  const plume = new T.Mesh(plumeGeometry, exhaustMaterial);
  engines.add(plume);
}

const impactMaterials = Array.from({length: 12}, (_, i) => new T.SpriteMaterial({
  map: coreMap,
  color: 0xffaa66,
  blending: T.AdditiveBlending,
  opacity: (i + 1) / 12,
  depthWrite: false,
  transparent: true
}));

let ratio = 1, last = 0, frames = 0, elapsed = 0;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (gl) {
  gl.toneMapping = T.ACESFilmicToneMapping;
  gl.toneMappingExposure = 1.25;
  scene.background = texture('dust-lane');
  const env = procedural(512, 256, (b, w, h) => {
    const grad = b.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#adbbc4');
    grad.addColorStop(0.45, '#4a5761');
    grad.addColorStop(0.61, '#14202a');
    grad.addColorStop(1, '#484d4c');
    b.fillStyle = grad;
    b.fillRect(0, 0, w, h);
    b.fillStyle = '#f8e2cb';
    b.fillRect(42, 40, 90, 20);
    b.fillStyle = '#b3d8e7';
    b.fillRect(320, 78, 115, 9);
  });
  env.mapping = T.EquirectangularReflectionMapping;
  scene.environment = env;
  scene.environmentIntensity = 0.95;
}

function resize() {
  const w = innerWidth, h = innerHeight;
  ratio = Math.min(devicePixelRatio, 1.65, Math.sqrt(2400000 / (w * h)));
  if (gl) {
    gl.setPixelRatio(ratio);
    gl.setSize(w, h, false);
  } else {
    canvas.width = w;
    canvas.height = h;
  }
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
resize();
addEventListener('resize', resize);

canvas.addEventListener('webglcontextlost', e => {
  e.preventDefault();
  const replacement = canvas.cloneNode(false);
  canvas.replaceWith(replacement);
  canvas = replacement;
  gl = null;
  ctx = canvas.getContext('2d');
  bindLook(canvas);
  resize();
});

let heroAngle = 0.73, drag = null, activeGame = null;
export let cameraMode = 'chase'; // 'chase' | 'cockpit'
export function setCameraMode(mode) { cameraMode = mode; }
export let cameraShake = 0;
export function addCameraShake(amount) { cameraShake = Math.min(1.2, cameraShake + amount); }

function stopLook() { drag = null; }
function bindLook(surface) {
  surface.onpointerdown = e => {
    if (!activeGame?.canLook || !['hangar', 'deck'].includes(activeGame.mode) || drag) return;
    drag = {x: e.clientX, y: e.clientY, id: e.pointerId};
    surface.setPointerCapture(e.pointerId);
  };
  surface.onpointermove = e => {
    if (!drag || drag.id !== e.pointerId || !activeGame?.canLook) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.x = e.clientX;
    drag.y = e.clientY;
    if (activeGame.mode === 'hangar') heroAngle += dx * 0.008;
    else {
      activeGame.yaw -= dx * 0.005;
      activeGame.pitch = T.MathUtils.clamp(activeGame.pitch + dy * 0.004, -0.7, 0.7);
    }
  };
  surface.onlostpointercapture = stopLook;
}
bindLook(canvas);

function sync(group, data, create, adjust) {
  while (group.children.length < data.length) group.add(create());
  while (group.children.length > data.length) group.remove(group.children[group.children.length - 1]);
  data.forEach((p, i) => {
    const o = group.children[i];
    o.position.set(p.x, p.y || 0, p.z);
    adjust?.(o, p);
  });
}

export function render(g, t) {
  activeGame = g;
  if (g.mode === 'survey') {
    renderSurvey(g.survey, gl, ctx, t);
    return;
  }
  const hangar = g.mode === 'hangar';
  if (!gl) {
    drawFallback(ctx, g, t, heroAngle);
    return;
  }

  const now = performance.now();
  if (last && now - last < 180) {
    elapsed += now - last;
    frames++;
  }
  last = now;
  if (frames >= 100) {
    if (elapsed / frames > 30 && ratio > 0.8) {
      ratio = Math.max(0.8, ratio * 0.86);
      gl.setPixelRatio(ratio);
    }
    frames = 0;
    elapsed = 0;
  }

  orbit(g.world);
  deck.visible = g.mode === 'deck';
  fleet.visible = !deck.visible;

  if (chosen !== g.ship) {
    vessel.clear();
    vessel.add(asset(g.ship).clone(), engines);
    details = null;
    chosen = g.ship;
  }

  // Nearby inspect and chase views get a material-batched detail layer.
  // Cockpit and deck never construct or draw close-range hull details.
  const showDetails = !deck.visible && (hangar || cameraMode === 'chase');
  if (showDetails && !details) {
    details = inspectAsset(g.ship).clone();
    vessel.add(details);
  }
  if (details) details.visible = showDetails;

  if (deck.visible && deckChoice !== g.ship) {
    if (!deckAssets.has(g.ship)) deckAssets.set(g.ship, instrumentation(g.ship));
    deck.clear();
    deck.add(deckAssets.get(g.ship));
    deckChoice = g.ship;
  }

  orb.rotation.y = 0.8 + g.world.id * 0.53 + (reduced ? 0 : t * 0.006);
  weather.rotation.y = orb.rotation.y + (reduced ? 0 : t * 0.0022);
  cirrus.rotation.y = orb.rotation.y - (reduced ? 0 : t * 0.0012);
  moon.position.set(12 + Math.cos(t * 0.008 + 0.4) * 26, 14, -54 + Math.sin(t * 0.008 + 0.4) * 26);
  camera.clearViewOffset();

  sky.position.y = hangar ? 0 : deck.visible ? 0 : -17;
  sky.rotation.y = hangar ? Math.PI - heroAngle : 0;

  // Shake trauma decay
  cameraShake = Math.max(0, cameraShake - 0.03);
  const shakeX = (Math.random() - 0.5) * cameraShake * 0.35;
  const shakeY = (Math.random() - 0.5) * cameraShake * 0.35;

  if (hangar) {
    const portrait = innerWidth / innerHeight < 0.94;
    const angle = heroAngle + (reduced ? 0 : Math.sin(t * 0.085) * 0.15);
    vessel.position.set(0, 0, 0);
    vessel.rotation.set(0, 0, 0);
    const d = portrait ? Math.max(6.65, 4.9 / camera.aspect) : 7.9;
    camera.position.set(Math.sin(angle) * d, d * 0.57, -Math.cos(angle) * d);
    camera.lookAt(0, 0.10, 0);
    camera.setViewOffset(innerWidth, innerHeight, portrait ? 0 : -innerWidth * 0.16, innerHeight * (portrait ? 0.15 : 0.015), innerWidth, innerHeight);
  } else if (deck.visible) {
    camera.position.set(g.x + shakeX, 1.65 + shakeY, g.z);
    camera.rotation.order = 'YXZ';
    camera.rotation.set(g.pitch, g.yaw, 0);
  } else {
    vessel.position.set(g.x, 0, g.z);
    vessel.rotation.set(0, 0, -g.bank * 0.28);

    if (cameraMode === 'cockpit') {
      // First person cockpit view
      camera.position.set(g.x + shakeX, 0.65 + shakeY, g.z - 0.3);
      camera.lookAt(g.x, 0.6, g.z - 15);
    } else {
      // Third person chase cam with inertia & camera shake
      camera.position.set(g.x * 0.85 + shakeX, 6.8 + shakeY, g.z + 8.5);
      camera.lookAt(g.x, 0.15, g.z - 4.5);
    }
  }

  patrol.visible = fire.visible = !hangar;
  if (!hangar && !deck.visible) {
    sync(patrol, g.enemies, () => {
      const o = asset(3).clone();
      o.scale.setScalar(0.68);
      o.rotation.y = Math.PI;
      return o;
    });
    sync(fire, g.shots, () => new T.Mesh(laserGeo, beams[0]), (o, p) => {
      o.material = beams[Number(p.enemy)];
      o.rotation.y = Math.atan2(p.dx, p.dz);
    });
  }

  engines.visible = !hangar && !deck.visible;
  engines.children.forEach((o, i) => {
    o.position.set((i ? 1 : -1) * [0.91, 1.49, 1.2][g.ship], 0.038, 2.50);
    o.scale.z = 0.95 + 0.35 * Math.sin(t * 26 + i);
  });

  // Spawn thruster particle trail
  if (engines.visible && Math.random() < 0.6) {
    const idx = Math.floor(Math.random() * particleCount);
    const p = particlesData[idx];
    const side = Math.random() < 0.5 ? 1 : -1;
    const offset = side * [0.91, 1.49, 1.2][g.ship];
    p.x = g.x + offset + (Math.random() - 0.5) * 0.2;
    p.y = 0.038 + (Math.random() - 0.5) * 0.1;
    p.z = g.z + 2.6;
    p.vx = (Math.random() - 0.5) * 0.3;
    p.vy = (Math.random() - 0.5) * 0.2;
    p.vz = 5 + Math.random() * 6;
    p.life = 0.45;
    p.maxLife = 0.45;
  }

  // Update particles
  const positions = particleGeo.attributes.position.array;
  for (let i = 0; i < particleCount; i++) {
    const p = particlesData[i];
    if (p.life > 0) {
      p.life -= 0.016;
      p.x += p.vx * 0.016;
      p.y += p.vy * 0.016;
      p.z += p.vz * 0.016;
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    } else {
      positions[i * 3 + 1] = -999;
    }
  }
  particleGeo.attributes.position.needsUpdate = true;

  impacts.visible = engines.visible;
  if (impacts.visible) {
    sync(impacts, g.impacts, () => new T.Sprite(impactMaterials[0]), (o, p) => {
      const age = 1 - p.life / p.duration;
      o.material = impactMaterials[Math.min(11, Math.floor((1 - age) * 12))];
      o.scale.setScalar(0.55 + age * (p.duration > 0.3 ? 3.8 : 1.35));
    });
  }

  spirit.visible = g.spirit > 0 && !hangar;
  spirit.position.set(g.x + 1.9, 1 + Math.sin(t * 4) * 0.28, g.z);
  spirit.rotation.y = t * 2.2;
  spirit.rotation.x = Math.sin(t * 2) * 0.15;

  if (deck.visible) {
    if (spirit.parent !== scene) scene.add(spirit);
    spirit.visible = true;
    spirit.position.set(-1.65, 1.55, -5.35);
    spirit.rotation.y = t * 0.7;
  } else if (spirit.parent !== fleet) {
    fleet.add(spirit);
  }

  gl.render(scene, camera);
}

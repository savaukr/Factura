// generate.js — builds index.html with embedded assets
const fs = require('fs');
const path = require('path');

const ASSETS = path.join(__dirname, 'assets');
const fbxB64   = fs.readFileSync(path.join(ASSETS, 'models.fbx')).toString('base64');
const grassB64 = fs.readFileSync(path.join(ASSETS, 'Grass.png')).toString('base64');
const mainB64  = fs.readFileSync(path.join(ASSETS, 'Main_texture.png')).toString('base64');

const html = `<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<title>Казковий потяг</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#000;overflow:hidden;touch-action:none;font-family:system-ui,sans-serif}
canvas{display:block;width:100vw;height:100vh}
#ui{
  position:fixed;top:0;left:0;width:100%;pointer-events:none;
  display:flex;flex-direction:column;align-items:flex-start;gap:6px;padding:14px
}
.badge{
  background:rgba(0,0,0,.55);color:#fff;padding:6px 14px;
  border-radius:20px;font-size:16px;font-weight:600;backdrop-filter:blur(4px)
}
#addWagon{
  pointer-events:auto;margin-top:auto;position:fixed;bottom:24px;left:50%;
  transform:translateX(-50%);padding:14px 36px;font-size:18px;font-weight:700;
  background:linear-gradient(135deg,#f9c74f,#f3722c);color:#fff;border:none;
  border-radius:40px;cursor:pointer;box-shadow:0 4px 18px rgba(0,0,0,.4);
  transition:transform .1s,opacity .2s
}
#addWagon:active{transform:translateX(-50%) scale(.94)}
#addWagon:disabled{opacity:.4;cursor:default}
#hint{
  position:fixed;bottom:100px;left:50%;transform:translateX(-50%);
  color:#fff;font-size:15px;font-weight:600;text-shadow:0 2px 6px rgba(0,0,0,.7);
  opacity:1;transition:opacity 1s
}
</style>
</head>
<body>
<canvas id="c"></canvas>
<div id="ui">
  <div class="badge" id="passengers">&#128100; Пасажири у потязі: 0</div>
  <div class="badge" id="stationInfo">&#127968; На зупинці: 0</div>
  <div class="badge" id="wagonInfo">&#128650; Вагони: 2 / 5</div>
</div>
<button id="addWagon">+ Вагон</button>
<div id="hint">Утримуй екран — потяг їде</div>

<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.min.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/",
    "fflate": "https://cdn.jsdelivr.net/npm/fflate@0.8.2/esm/browser.js"
  }
}
</script>
<script type="module">
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

// ── EMBEDDED ASSETS ────────────────────────────────────────────────────────
const FBX_B64   = '${fbxB64}';
const GRASS_B64 = '${grassB64}';
const MAIN_B64  = '${mainB64}';

// ── CONSTANTS ──────────────────────────────────────────────────────────────
const TRACK_RADIUS          = 18;
const TRACK_SEGS            = 80;
const TRAIN_SPEED           = 0.055;   // track-t units / second
const WAGON_GAP_T           = 0.072;   // spacing in track-t (≈5.1 world-units)
const MAX_WAGONS            = 5;
const MAX_PLATFORM_PSGR     = 10;
const PSGR_SPAWN_INTERVAL   = 2;       // seconds
const STATION_T             = 0.0;     // station at angle 0 → (R, 0, 0)
const STATION_THRESHOLD     = 0.035;
const SWAY_FREQ             = 2.2;     // rad / sec
const SWAY_MAX_DEG          = 2;
const SWAY_RAD              = SWAY_MAX_DEG * Math.PI / 180;
const BOARDING_SPEED        = 5;       // world-units / second
const CAMERA_OFFSET         = new THREE.Vector3(0, 14, -20);
const PLATFORM_X_OFFSET     = 6;      // platform is this far from track edge

// ── RENDERER / SCENE / CAMERA ─────────────────────────────────────────────
const canvas   = document.getElementById('canvasId');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;

const scene  = new THREE.Scene();
scene.background = new THREE.Color(0x90d4f5);
scene.fog        = new THREE.FogExp2(0x90d4f5, 0.012);

const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.2, 300);
// Station world position (train starts here)
const STATION_WORLD = new THREE.Vector3(TRACK_RADIUS, 0, 0);
camera.position.copy(STATION_WORLD).add(CAMERA_OFFSET);
camera.lookAt(STATION_WORLD.x, 1.5, STATION_WORLD.z);
const CAM_QUAT = camera.quaternion.clone(); // freeze camera rotation

window.addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});
renderer.setSize(innerWidth, innerHeight, false);

// ── LIGHTING ───────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xfff5e0, 0.75));
scene.add(new THREE.HemisphereLight(0x87ceeb, 0x3d8c40, 0.6));

const sun = new THREE.DirectionalLight(0xfffbe8, 1.4);
sun.position.set(25, 40, 15);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(2048);
Object.assign(sun.shadow.camera, { near:0.5, far:120, left:-35, right:35, top:35, bottom:-35 });
scene.add(sun);

// ── TEXTURES ───────────────────────────────────────────────────────────────
function makeTexture(b64, mime, repeat, flipY) {
  const img = new Image();
  img.src = \`data:\${mime};base64,\${b64}\`;
  const tex = new THREE.Texture(img);
  tex.flipY = (flipY !== false);
  if (repeat) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(...repeat); }
  img.onload = () => { tex.needsUpdate = true; };
  return tex;
}

const grassTex = makeTexture(GRASS_B64, 'image/png', [12, 12], true);
const mainTex  = makeTexture(MAIN_B64,  'image/png', null, false);

// ── GROUND ─────────────────────────────────────────────────────────────────
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(120, 120),
  new THREE.MeshLambertMaterial({ map: grassTex })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ── TRACK ──────────────────────────────────────────────────────────────────
function makeCircleCurve(R, N) {
  const pts = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * R, 0, Math.sin(a) * R));
  }
  return new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.0);
}

const trackCurve = makeCircleCurve(TRACK_RADIUS, TRACK_SEGS);

// Rails
const railMat = new THREE.MeshLambertMaterial({ color: 0xaaaaaa, metalness: 0.3 });
function addRail(side) {
  const pts = [];
  for (let i = 0; i <= 512; i++) {
    const t = i / 512;
    const p   = trackCurve.getPointAt(t);
    const tan = trackCurve.getTangentAt(t);
    const right = new THREE.Vector3(-tan.z, 0, tan.x);
    pts.push(p.clone().addScaledVector(right, side * 0.42).setY(0.06));
  }
  const rc  = new THREE.CatmullRomCurve3(pts, true);
  const geo = new THREE.TubeGeometry(rc, 512, 0.055, 5, true);
  const m   = new THREE.Mesh(geo, railMat);
  m.receiveShadow = true;
  scene.add(m);
}
addRail(-1); addRail(1);

// Sleepers
const sleeperGeo = new THREE.BoxGeometry(1.3, 0.07, 0.18);
const sleeperMat = new THREE.MeshLambertMaterial({ color: 0x5a3a10 });
for (let i = 0; i < 120; i++) {
  const t  = i / 120;
  const p  = trackCurve.getPointAt(t);
  const tn = trackCurve.getTangentAt(t);
  const s  = new THREE.Mesh(sleeperGeo, sleeperMat);
  s.position.copy(p).setY(0.025);
  s.rotation.y = Math.atan2(tn.x, tn.z);
  s.receiveShadow = true;
  scene.add(s);
}

// ── PLATFORM ───────────────────────────────────────────────────────────────
const STATION_TRACK_POS = trackCurve.getPointAt(STATION_T);
const PLATFORM_POS = STATION_TRACK_POS.clone().add(new THREE.Vector3(PLATFORM_X_OFFSET + 2, 0, 0));

const platMat = new THREE.MeshLambertMaterial({ color: 0xd4b483 });
const platform = new THREE.Mesh(new THREE.BoxGeometry(9, 0.4, 4), platMat);
platform.position.copy(PLATFORM_POS).setY(0.2);
platform.castShadow = platform.receiveShadow = true;
scene.add(platform);

// Roof
const roofMat = new THREE.MeshLambertMaterial({ color: 0x8b5e3c });
const roof = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.12, 4.6), roofMat);
roof.position.copy(PLATFORM_POS).setY(3.0);
scene.add(roof);
// Pillars
for (const xd of [-3.5, 0, 3.5]) {
  const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3, 8), roofMat);
  pil.position.set(PLATFORM_POS.x + xd, 1.5, PLATFORM_POS.z);
  pil.castShadow = true;
  scene.add(pil);
}
// Station name sign
const signMat = new THREE.MeshLambertMaterial({ color: 0xffe878 });
const sign = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.6, 0.08), signMat);
sign.position.set(PLATFORM_POS.x, 2.6, PLATFORM_POS.z + 2.3);
scene.add(sign);

// ── FBX LOADING ────────────────────────────────────────────────────────────
const protoModels = {};   // raw prototypes from FBX

function b64ToBuffer(b64) {
  const bin   = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

function applyMainTex(obj) {
  obj.traverse(c => {
    if (!c.isMesh) return;
    const mats = Array.isArray(c.material) ? c.material : [c.material];
    mats.forEach(m => { m.map = mainTex; m.needsUpdate = true; });
    c.castShadow = c.receiveShadow = true;
  });
}

function loadFBX() {
  return new Promise(resolve => {
    const blob    = new Blob([b64ToBuffer(FBX_B64)], { type: 'application/octet-stream' });
    const blobUrl = URL.createObjectURL(blob);

    const mgr = new THREE.LoadingManager();
    mgr.setURLModifier(url => {
      const name = url.split(/[\\/]/).pop().toLowerCase();
      if (name.includes('grass'))       return \`data:image/png;base64,\${GRASS_B64}\`;
      if (name.includes('main_texture') || name.includes('main')) return \`data:image/png;base64,\${MAIN_B64}\`;
      return url;
    });

    new FBXLoader(mgr).load(blobUrl, fbxRoot => {
      URL.revokeObjectURL(blobUrl);

      applyMainTex(fbxRoot);

      const targets = ['Locomotive_EU', 'Carriage_EU',
        ...Array.from({length:10}, (_,i) => \`G_Character_\${i+1}\`)];

      fbxRoot.traverse(child => {
        if (targets.includes(child.name) && !protoModels[child.name]) {
          protoModels[child.name] = child;
        }
      });

      // Fallback name search on meshes
      if (!protoModels['Locomotive_EU']) {
        fbxRoot.traverse(c => {
          if (!c.isMesh) return;
          const n = c.name;
          if (n.includes('Locomotive') && !protoModels['Locomotive_EU'])
            protoModels['Locomotive_EU'] = c.parent ?? c;
          if (n.includes('Carriage') && !protoModels['Carriage_EU'])
            protoModels['Carriage_EU'] = c.parent ?? c;
          const gm = n.match(/G_Character_(\d+)/);
          if (gm && !protoModels[\`G_Character_\${gm[1]}\`])
            protoModels[\`G_Character_\${gm[1]}\`] = c.parent ?? c;
        });
      }

      // Auto-scale: measure Locomotive bounding box → fit to ~2.5 world-units length
      const locoProto = protoModels['Locomotive_EU'];
      if (locoProto) {
        const box = new THREE.Box3().setFromObject(locoProto);
        const sz  = new THREE.Vector3();
        box.getSize(sz);
        const longest = Math.max(sz.x, sz.z);
        if (longest > 0.01) {
          const autoScale = 2.6 / longest;
          Object.values(protoModels).forEach(m => m.scale.setScalar(autoScale));
          console.log('Auto-scale:', autoScale.toFixed(4), 'longest:', longest.toFixed(2));
        }
      }

      console.log('FBX models:', Object.keys(protoModels).join(', '));
      resolve(true);
    }, undefined, err => {
      console.warn('FBX load failed, using fallback geometry:', err);
      makeFallbackModels();
      resolve(false);
    });
  });
}

function makeFallbackModels() {
  function locoMesh(color) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.75, 2.6),
      new THREE.MeshLambertMaterial({ color }));
    body.position.y = 0.375; body.castShadow = true; g.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.5, 1.0),
      new THREE.MeshLambertMaterial({ color: 0xcc4422 }));
    cab.position.set(0, 1.0, 0.7); cab.castShadow = true; g.add(cab);
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.5, 8),
      new THREE.MeshLambertMaterial({ color: 0x333333 }));
    stack.position.set(-0.2, 1.1, -0.5); g.add(stack);
    for (const [xi, zi] of [[-0.5, 0.85],[0.5, 0.85],[-0.5,-0.85],[0.5,-0.85]]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 12),
        new THREE.MeshLambertMaterial({ color: 0x222222 }));
      w.rotation.z = Math.PI/2; w.position.set(xi, 0.22, zi); g.add(w);
    }
    return g;
  }
  function carriageMesh() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.75, 2.6),
      new THREE.MeshLambertMaterial({ color: 0x4466cc }));
    body.position.y = 0.375; body.castShadow = true; g.add(body);
    for (const [xi, zi] of [[-0.5, 0.85],[0.5, 0.85],[-0.5,-0.85],[0.5,-0.85]]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 12),
        new THREE.MeshLambertMaterial({ color: 0x222222 }));
      w.rotation.z = Math.PI/2; w.position.set(xi, 0.22, zi); g.add(w);
    }
    return g;
  }
  protoModels['Locomotive_EU'] = locoMesh(0xff5533);
  protoModels['Carriage_EU']   = carriageMesh();
  const psgrColors = [0xe74c3c,0x3498db,0x2ecc71,0xf39c12,0x9b59b6,0x1abc9c,0xe67e22,0x34495e,0xec407a,0x00bcd4];
  for (let i = 1; i <= 10; i++) {
    const pg = new THREE.Group();
    const tor = new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,0.55,8),
      new THREE.MeshLambertMaterial({ color: psgrColors[i-1] }));
    tor.position.y = 0.5; tor.castShadow = true; pg.add(tor);
    const hd = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8),
      new THREE.MeshLambertMaterial({ color: 0xf5cba7 }));
    hd.position.y = 1.0; pg.add(hd);
    protoModels[\`G_Character_\${i}\`] = pg;
  }
}

// ── GAME STATE ─────────────────────────────────────────────────────────────
const state = {
  isHolding:        false,
  trainProgress:    STATION_T + 0.001,
  wagonCount:       2,
  passengersInTrain:0,
  swayPhase:        0,
  passengerTimer:   0,
  isAtStation:      false,
  hintVisible:      true,
};

const wagons            = [];
const stationPassengers = [];
const boardingPassengers= [];

// ── TRAIN ──────────────────────────────────────────────────────────────────
function wagonType(idx, total) {
  return (idx === 0 || idx === total - 1) ? 'Locomotive_EU' : 'Carriage_EU';
}

function cloneProto(name) {
  const src = protoModels[name];
  if (!src) return new THREE.Group();
  const c = src.clone(true);
  applyMainTex(c);
  return c;
}

function buildTrain() {
  wagons.forEach(w => scene.remove(w.group));
  wagons.length = 0;

  for (let i = 0; i < state.wagonCount; i++) {
    const type    = wagonType(i, state.wagonCount);
    const flipped = (i === state.wagonCount - 1) && state.wagonCount > 1;
    const mesh    = cloneProto(type);

    const group = new THREE.Group();
    group.add(mesh);
    scene.add(group);
    wagons.push({ group, mesh, swayAngle: 0, flipped });
  }
}

function addWagon() {
  if (state.wagonCount >= MAX_WAGONS) return;
  state.wagonCount++;
  buildTrain();
  updateUI();
}

// ── PASSENGERS ─────────────────────────────────────────────────────────────
function randomPassengerKey() {
  return \`G_Character_\${Math.ceil(Math.random() * 10)}\`;
}

function spawnPassenger() {
  if (stationPassengers.length >= MAX_PLATFORM_PSGR) return;
  const mesh = cloneProto(randomPassengerKey());
  const px = PLATFORM_POS.x + (Math.random() - 0.5) * 7;
  const pz = PLATFORM_POS.z + (Math.random() - 0.5) * 3;
  mesh.position.set(px, 0.4, pz);
  scene.add(mesh);
  stationPassengers.push({ mesh });
}

function startBoarding() {
  if (!stationPassengers.length) return;
  const trainDoor = wagons[0]
    ? wagons[0].group.position.clone().setY(0.4)
    : STATION_WORLD.clone().setY(0.4);

  stationPassengers.forEach(p => {
    boardingPassengers.push({ mesh: p.mesh, target: trainDoor.clone() });
  });
  stationPassengers.length = 0;
  updateUI();
}

function updateBoarding(dt) {
  for (let i = boardingPassengers.length - 1; i >= 0; i--) {
    const p   = boardingPassengers[i];
    const dir = p.target.clone().sub(p.mesh.position);
    const d   = dir.length();
    if (d < 0.25) {
      scene.remove(p.mesh);
      boardingPassengers.splice(i, 1);
      state.passengersInTrain++;
      updateUI();
    } else {
      dir.normalize();
      p.mesh.position.addScaledVector(dir, BOARDING_SPEED * dt);
      p.mesh.rotation.y = Math.atan2(dir.x, dir.z);
    }
  }
}

// ── WAGON POSITIONS ────────────────────────────────────────────────────────
const _qBase = new THREE.Quaternion();
const _qSway = new THREE.Quaternion();
const _axY   = new THREE.Vector3(0, 1, 0);
const _axZ   = new THREE.Vector3(0, 0, 1);

function updateWagonPositions() {
  for (let i = 0; i < wagons.length; i++) {
    const w = wagons[i];
    const t = ((state.trainProgress - i * WAGON_GAP_T) % 1 + 1) % 1;
    const pos = trackCurve.getPointAt(t);
    const tan = trackCurve.getTangentAt(t);

    w.group.position.copy(pos);

    // Heading: face along tangent, flip rear wagon 180°
    const heading = Math.atan2(tan.x, tan.z) + (w.flipped ? Math.PI : 0);

    // Sway target (yaw oscillation ±2°, alternating per wagon)
    if (state.isHolding) {
      const sign   = i % 2 === 0 ? 1 : -1;
      const target = sign * Math.sin(state.swayPhase) * SWAY_RAD;
      w.swayAngle  = w.swayAngle + (target - w.swayAngle) * 0.18;
    } else {
      w.swayAngle *= 0.90; // smooth decay to 0
    }

    // Apply combined rotation: base heading + sway (around local Y)
    _qBase.setFromAxisAngle(_axY, heading);
    _qSway.setFromAxisAngle(_axY, w.swayAngle);
    w.group.quaternion.copy(_qBase).multiply(_qSway);
  }
}

// ── STATION CHECK ──────────────────────────────────────────────────────────
function checkStation() {
  const t    = state.trainProgress;
  const raw  = Math.abs(t - STATION_T);
  const dist = Math.min(raw, 1 - raw);
  const wasAt = state.isAtStation;
  state.isAtStation = !state.isHolding && dist < STATION_THRESHOLD;
  if (state.isAtStation && !wasAt) startBoarding();
}

// ── INPUT ──────────────────────────────────────────────────────────────────
canvas.addEventListener('pointerdown', () => {
  state.isHolding = true;
  if (state.hintVisible) {
    state.hintVisible = false;
    const hint = document.getElementById('hint');
    hint.style.opacity = '0';
    setTimeout(() => hint.remove(), 1100);
  }
}, { passive: true });

canvas.addEventListener('pointerup',     () => { state.isHolding = false; }, { passive: true });
canvas.addEventListener('pointercancel', () => { state.isHolding = false; }, { passive: true });
document.addEventListener('keydown', e => { if (e.code==='Space') { e.preventDefault(); state.isHolding=true; } });
document.addEventListener('keyup',   e => { if (e.code==='Space') state.isHolding=false; });
document.getElementById('addWagon').addEventListener('click', addWagon);

// ── UI ─────────────────────────────────────────────────────────────────────
function updateUI() {
  document.getElementById('passengers').textContent  = \`\\u{1F9D1} Пасажири у потязі: \${state.passengersInTrain}\`;
  document.getElementById('stationInfo').textContent = \`\\u{1F3E0} На зупинці: \${stationPassengers.length}\`;
  document.getElementById('wagonInfo').textContent   = \`\\u{1F682} Вагони: \${state.wagonCount} / \${MAX_WAGONS}\`;
  const btn = document.getElementById('addWagon');
  btn.disabled = state.wagonCount >= MAX_WAGONS;
}

// ── MAIN LOOP ──────────────────────────────────────────────────────────────
const clock = new THREE.Clock();

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (state.isHolding) {
    state.trainProgress = (state.trainProgress + TRAIN_SPEED * dt) % 1;
    state.swayPhase    += SWAY_FREQ * dt;
  }

  state.passengerTimer += dt;
  if (state.passengerTimer >= PSGR_SPAWN_INTERVAL) {
    state.passengerTimer = 0;
    spawnPassenger();
    updateUI();
  }

  checkStation();
  updateBoarding(dt);
  updateWagonPositions();

  // Camera: translate only, rotation frozen
  const headPos = wagons.length ? wagons[0].group.position : STATION_WORLD;
  camera.position.set(
    headPos.x + CAMERA_OFFSET.x,
    CAMERA_OFFSET.y,
    headPos.z + CAMERA_OFFSET.z
  );
  camera.quaternion.copy(CAM_QUAT);

  renderer.render(scene, camera);
}

// ── INIT ───────────────────────────────────────────────────────────────────
async function init() {
  await loadFBX();
  buildTrain();
  // Spawn initial passengers
  for (let i = 0; i < 4; i++) spawnPassenger();
  updateUI();
  tick();
}

init().catch(console.error);
</script>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, 'index.html'), html);
const size = fs.statSync(path.join(__dirname, 'index.html')).size;
console.log('index.html generated:', (size / 1024).toFixed(1), 'KB');

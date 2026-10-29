// Ο καιρός του Πέτρου — μικρό παιχνίδι για παιδί 2,5 ετών.
// Τρία κουμπιά (ήλιος, βροχή, χιόνι) αλλάζουν τον κόσμο. Καμία αποτυχία, κανένα κείμενο.
// Μετά από ~5 λεπτά πέφτει ήρεμα η νύχτα και ο Πέτρος λέει αντίο.
import * as THREE from '../lib/three/three.module.min.js';
import { Sound } from './sound.js';
import { makePetros, makeDog } from './heroes.js';

const q = new URLSearchParams(location.search);
const PLAY_SECONDS = Number(q.get('t')) || 300;          // ?t=20 μόνο για δοκιμές

// ---------- βασικά ----------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fd3f4);
scene.fog = new THREE.Fog(0x8fd3f4, 22, 60);
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 120);
const LOOK = new THREE.Vector3(0, 1.75, 0);
camera.position.set(0, 2.3, 8.2);

const lam = c => new THREE.MeshLambertMaterial({ color: c });
const basic = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, ...o });
const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); scene.add(m); return m; };

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // Στο κινητό (όρθιο) θέλουμε να χωράει ~4 μονάδες πλάτος εκεί που στέκεται ο Πέτρος.
  const dist = camera.position.z - 2.2;
  const needH = Math.max(3.7 / camera.aspect, 5.4);
  camera.fov = Math.min(2 * Math.atan(needH / 2 / dist) * 180 / Math.PI, 78);
  camera.updateProjectionMatrix();
  camera.lookAt(LOOK);
}
addEventListener('resize', resize);
resize();

// ---------- φως ----------
const hemi = new THREE.HemisphereLight(0xffffff, 0x6f9a52, 1.2);
const sunLight = new THREE.DirectionalLight(0xfff2d6, 1.6);
sunLight.position.set(4, 9, 6);
scene.add(hemi, sunLight);

// ---------- αυλή ----------
const groundMat = lam(0x86c95b);
const ground = mesh(new THREE.CircleGeometry(60, 48), groundMat); ground.rotation.x = -Math.PI / 2;
const hillMat = lam(0x9fd46c);
for (const [x, z, r] of [[-14, -26, 13], [10, -30, 16], [26, -22, 10]]) { const h = mesh(new THREE.SphereGeometry(r, 32, 16), hillMat, x, -r * 0.55, z); h.scale.y = 0.75; }
const path = mesh(new THREE.PlaneGeometry(1.1, 6), lam(0xe6cf9f), -2.2, 0.01, -0.5); path.rotation.x = -Math.PI / 2;

// σπιτάκι
const house = new THREE.Group(); house.position.set(-2.6, 0, -4.2); scene.add(house);
const add = (parent, geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
add(house, new THREE.BoxGeometry(2.6, 2, 2.2), lam(0xfff1d6), 0, 1, 0);
const roofMat = lam(0xd65a45);
const roof = add(house, new THREE.ConeGeometry(2.25, 1.35, 4), roofMat, 0, 2.66, 0); roof.rotation.y = Math.PI / 4; roof.scale.z = 0.92;
add(house, new THREE.BoxGeometry(0.34, 0.8, 0.34), roofMat, 0.6, 3.1, -0.2);
add(house, new THREE.BoxGeometry(0.7, 1.15, 0.06), lam(0x8a5a3b), 0.45, 0.58, 1.11);
const winMat = lam(0x9fd6ef);
add(house, new THREE.BoxGeometry(0.62, 0.55, 0.06), winMat, -0.62, 1.2, 1.11);
add(house, new THREE.BoxGeometry(0.74, 0.07, 0.1), lam(0xffffff), -0.62, 0.9, 1.13);

// δέντρο
const tree = new THREE.Group(); tree.position.set(2.9, 0, -3.2); scene.add(tree);
add(tree, new THREE.CylinderGeometry(0.22, 0.3, 2.2, 10), lam(0x8a5a3b), 0, 1.1, 0);
const leafMat = lam(0x4fa34a);
for (const [x, y, z, r] of [[0, 2.7, 0, 1.15], [-0.75, 2.2, 0.2, 0.8], [0.75, 2.25, 0.1, 0.85], [0.1, 3.4, -0.1, 0.8]]) add(tree, new THREE.SphereGeometry(r, 18, 12), leafMat, x, y, z);

// φράχτης
const postGeo = new THREE.BoxGeometry(0.12, 0.7, 0.06), fenceMat = lam(0xffffff);
const posts = new THREE.InstancedMesh(postGeo, fenceMat, 26); scene.add(posts);
const tmp = new THREE.Object3D();
for (let i = 0; i < 26; i++) { const x = -9 + i * 0.72; tmp.position.set(x > -2.8 && x < -1.6 ? 99 : x, 0.35, -1.6); tmp.updateMatrix(); posts.setMatrixAt(i, tmp.matrix); }
for (const y of [0.25, 0.52]) { mesh(new THREE.BoxGeometry(6.4, 0.07, 0.04), fenceMat, -6, y, -1.62); mesh(new THREE.BoxGeometry(6.4, 0.07, 0.04), fenceMat, 1.6, y, -1.62); }

// λουλούδια (κρύβονται κάτω από το χιόνι)
const flowers = new THREE.Group(); scene.add(flowers);
const stemMat = lam(0x3f8a3a);
[[-1.7, 1.2, 0xff6b8b], [-1.2, 2.9, 0xffd23f], [1.9, 1.5, 0xff8c42], [2.4, 2.8, 0xb57bff], [-2.6, 2.4, 0xffffff], [0.6, 3.6, 0xff6b8b], [-0.9, 0.3, 0xb57bff], [3.2, 0.6, 0xffd23f]].forEach(([x, z, c]) => {
  const f = new THREE.Group(); f.position.set(x, 0, z);
  add(f, new THREE.CylinderGeometry(0.025, 0.025, 0.35, 6), stemMat, 0, 0.17, 0);
  add(f, new THREE.SphereGeometry(0.11, 10, 8), lam(c), 0, 0.38, 0);
  add(f, new THREE.SphereGeometry(0.05, 8, 6), lam(0xffe26b), 0, 0.4, 0.08);
  flowers.add(f);
});

// χιονάνθρωπος — φυτρώνει όταν στρώσει το χιόνι, λιώνει με τον ήλιο
const snowman = new THREE.Group(); snowman.position.set(-1.75, 0, 0.3); scene.add(snowman);
const snowMat = lam(0xffffff);
add(snowman, new THREE.SphereGeometry(0.55, 18, 12), snowMat, 0, 0.5, 0);
add(snowman, new THREE.SphereGeometry(0.4, 18, 12), snowMat, 0, 1.25, 0);
add(snowman, new THREE.SphereGeometry(0.29, 18, 12), snowMat, 0, 1.82, 0);
const carrot = add(snowman, new THREE.ConeGeometry(0.06, 0.3, 8), lam(0xff8c1a), 0, 1.8, 0.4); carrot.rotation.x = Math.PI / 2;
for (const s of [-1, 1]) add(snowman, new THREE.SphereGeometry(0.04, 8, 6), lam(0x222222), s * 0.1, 1.9, 0.26);
snowman.scale.setScalar(0.001);

// ήλιος, φεγγάρι, σύννεφα
const sun = mesh(new THREE.SphereGeometry(1.3, 24, 16), basic(0xffd84a), -3.6, 11, -16);
const sunGlow = mesh(new THREE.CircleGeometry(2.3, 32), basic(0xfff3a8, { transparent: true, opacity: 0.45 }), -3.6, 11, -16.6);
const moon = mesh(new THREE.SphereGeometry(1, 24, 16), basic(0xfff4c4), 3.2, 2, -16); moon.visible = false;
const cloudMat = lam(0xffffff);
const clouds = [[-6, 9.5, -10], [2, 10.5, -12], [-1, 13, -14], [6.5, 8.5, -11], [-9, 12, -13]].map(([x, y, z], i) => {
  const c = new THREE.Group(); c.position.set(x, y, z); c.userData = { x, y, speed: 0.15 + i * 0.04 };
  for (const [dx, dy, r] of [[0, 0, 1], [1, -0.2, 0.75], [-1, -0.25, 0.7], [0.4, 0.5, 0.7]]) add(c, new THREE.SphereGeometry(r, 14, 10), cloudMat, dx, dy, 0);
  scene.add(c); return c;
});

// αστέρια για το τέλος
const starGeo = new THREE.BufferGeometry();
const sp = []; for (let i = 0; i < 120; i++) sp.push((Math.random() - 0.5) * 50, 6 + Math.random() * 20, -20 - Math.random() * 5);
starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.18, transparent: true, opacity: 0 }));
scene.add(stars);

// ουράνιο τόξο — εμφανίζεται όταν βγαίνει ήλιος μετά από βροχή
const rainbow = new THREE.Group(); rainbow.position.set(0, -1, -18); scene.add(rainbow);
[0xff5a5a, 0xffa23a, 0xffe14a, 0x6cd36a, 0x4aa8ff, 0x9a6cff].forEach((c, i) =>
  rainbow.add(new THREE.Mesh(new THREE.TorusGeometry(10 - i * 0.45, 0.24, 6, 48, Math.PI), basic(c, { transparent: true, opacity: 0 }))));

// λακκούβες
const puddleMat = basic(0x6f93b8, { transparent: true, opacity: 0.75 });
const puddles = [[-1.2, 3.1, 1.1], [1.4, 3.4, 0.8], [0.3, 1.2, 0.7], [-2.8, 1.4, 0.9], [2.8, 2.2, 0.7]].map(([x, z, r]) => {
  const p = mesh(new THREE.CircleGeometry(r, 24), puddleMat, x, 0.02, z); p.rotation.x = -Math.PI / 2; p.scale.set(0.001, 0.6, 1); return p;
});

// σκιές κάτω από τους ήρωες
const shadowMat = basic(0x000000, { transparent: true, opacity: 0.16, depthWrite: false });
const blob = (r, x, z) => { const s = mesh(new THREE.CircleGeometry(r, 24), shadowMat, x, 0.03, z); s.rotation.x = -Math.PI / 2; s.scale.y = 0.45; return s; };

// ---------- ήρωες ----------
const BASE = 'img/';
const petros = makePetros(BASE), dog = makeDog(BASE);
const petrosRig = new THREE.Group(); petrosRig.position.set(-0.45, 0, 2.2); petrosRig.add(petros.group); scene.add(petrosRig);
const dogRig = new THREE.Group(); dogRig.position.set(1.05, 0, 2.5); dogRig.add(dog.group); scene.add(dogRig);
blob(0.55, -0.45, 2.25); blob(0.55, 1.05, 2.5);

// ---------- σωματίδια: βροχή, χιόνι, πιτσιλιές ----------
// Κινούμε μόνο τη μετατόπιση μέσα στον πίνακα κάθε instance — φτηνό ακόμη και σε παλιό κινητό.
function field(geo, mat, n, spread) {
  const m = new THREE.InstancedMesh(geo, mat, n); m.count = 0; m.frustumCulled = false;
  const p = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    tmp.position.set(0, -99, 0); tmp.updateMatrix(); m.setMatrixAt(i, tmp.matrix);
    p[i * 4] = (Math.random() - 0.5) * spread.x; p[i * 4 + 1] = Math.random() * spread.y; p[i * 4 + 2] = spread.z0 + Math.random() * spread.z; p[i * 4 + 3] = Math.random() * 6.28;
  }
  scene.add(m); return { m, p, n, spread };
}
const RAIN_N = 700, SNOW_N = 650;
const rain = field(new THREE.PlaneGeometry(0.035, 0.42), basic(0xdbe8f5, { transparent: true, opacity: 0.75 }), RAIN_N, { x: 12, y: 12, z0: -8, z: 11.5 });
const snow = field(new THREE.CircleGeometry(0.07, 8), basic(0xffffff), SNOW_N, { x: 12, y: 12, z0: -8, z: 11.5 });

const SPL_N = 24;
const splash = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 6, 4), basic(0x9cc4e6), SPL_N); splash.frustumCulled = false; scene.add(splash);
const splV = Array.from({ length: SPL_N }, () => ({ x: 0, y: -9, z: 0, vx: 0, vy: 0, vz: 0 }));

function moveField(f, active, dt, fall, wobble) {
  const a = f.m.instanceMatrix.array, p = f.p, s = f.spread;
  f.m.count = active;
  for (let i = 0; i < active; i++) {
    const k = i * 4;
    p[k + 1] -= fall * dt * (0.8 + (i % 5) * 0.1);
    if (p[k + 1] < 0) { p[k + 1] += s.y; p[k] = (Math.random() - 0.5) * s.x; }
    p[k + 3] += dt;
    a[i * 16 + 12] = p[k] + (wobble ? Math.sin(p[k + 3] * 1.3 + i) * wobble : p[k + 1] * 0.06);
    a[i * 16 + 13] = p[k + 1];
    a[i * 16 + 14] = p[k + 2];
  }
  f.m.instanceMatrix.needsUpdate = true;
}

// ---------- καιρός ----------
const C = c => new THREE.Color(c);
const PRESET = {
  sun:   { sky: C(0x8fd3f4), hemi: 1.2, dir: 1.6, sun: 1, cloud: C(0xffffff), cloudY: 0, rain: 0, snow: 0, light: 1 },
  rain:  { sky: C(0x8d9aab), hemi: 0.8, dir: 0.35, sun: 0, cloud: C(0x8a95a3), cloudY: -2.2, rain: 1, snow: 0, light: 0.82 },
  snow:  { sky: C(0xc9d6e3), hemi: 1.45, dir: 0.5, sun: 0, cloud: C(0xe9eef4), cloudY: -1.4, rain: 0, snow: 1, light: 0.95 },
  night: { sky: C(0x1d2a4a), hemi: 0.35, dir: 0.08, sun: 0, cloud: C(0x3a4766), cloudY: 0, rain: 0, snow: 0, light: 0.55 },
};
const cur = { sky: C(0x8fd3f4), hemi: 1.2, dir: 1.6, sun: 1, cloud: C(0xffffff), cloudY: 0, rain: 0, snow: 0, light: 1 };
let weather = 'sun', target = PRESET.sun;
let snowCover = 0, puddle = 0, rainbowT = 0;
const GREEN = C(0x86c95b), HILL = C(0x9fd46c), WHITE = C(0xf4f8fb), ROOF = C(0xd65a45), LEAF = C(0x4fa34a);

function approach(dt, k = 1.6) {
  const a = 1 - Math.exp(-dt * k);
  for (const key in cur) {
    if (cur[key] instanceof THREE.Color) cur[key].lerp(target[key], a);
    else cur[key] += (target[key] - cur[key]) * a;
  }
}

// ---------- κινήσεις ηρώων ----------
const anim = { hop: 0, dogHop: 0, spin: 0, spinTo: null };
function hopPetros() {
  if (anim.hop > 0) return;
  anim.hop = 0.6; snd.hop();
  if (puddle > 0.3) setTimeout(() => { splashAt(petrosRig.position); snd.splash(); }, 520);
}
function hopDog() { if (anim.dogHop > 0) return; anim.dogHop = 0.5; dog.excite(); snd.woof(); }
function splashAt(pos) {
  splV.forEach(s => { const a = Math.random() * 6.28, v = 1 + Math.random() * 2; Object.assign(s, { x: pos.x, y: 0.1, z: pos.z + 0.2, vx: Math.cos(a) * v, vz: Math.sin(a) * v * 0.6, vy: 2 + Math.random() * 2.5 }); });
}

function setWeather(w) {
  const btns = document.querySelectorAll('#weather button');
  btns.forEach(b => b.classList.toggle('on', b.dataset.w === w));
  snd.chime(w);
  if (w === weather) { hopPetros(); hopDog(); return; }
  if (w === 'sun' && weather === 'rain' && puddle > 0.2) rainbowT = 14;
  weather = w; target = PRESET[w];
  anim.spin = 0.8; anim.spinTo = w; snd.sparkle();
  dog.excite();
}

// ---------- αγγίγματα ----------
const snd = new Sound();
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
let playing = false, ended = false;

document.getElementById('weather').addEventListener('pointerdown', e => {
  const b = e.target.closest('button'); if (!b || !playing) return;
  e.preventDefault(); snd.resume();
  b.classList.add('press'); setTimeout(() => b.classList.remove('press'), 150);
  setWeather(b.dataset.w);
});

canvas.addEventListener('pointerdown', e => {
  if (!playing) return;
  snd.resume();
  ptr.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  if (ray.intersectObject(petrosRig, true).length) hopPetros();
  else if (ray.intersectObject(dogRig, true).length) hopDog();
  else if (weather === 'snow') snd.tinkle(0.12);
  else if (weather === 'sun') snd.birdSong();
  else snd.drip();
});

document.getElementById('play').addEventListener('click', () => {
  snd.start();
  document.getElementById('start').classList.add('gone');
  playing = true;
  setWeather('sun');
});

// Έξοδος για τον ενήλικα: κράτα πατημένο 1,5″
const exit = document.getElementById('exit');
let exitTimer = null;
exit.addEventListener('pointerdown', e => { e.preventDefault(); exit.classList.add('hold'); exitTimer = setTimeout(() => { location.href = '../../'; }, 1500); });
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) exit.addEventListener(ev, () => { exit.classList.remove('hold'); clearTimeout(exitTimer); });
exit.addEventListener('contextmenu', e => e.preventDefault());

document.addEventListener('visibilitychange', () => { if (document.hidden) snd.suspend(); else if (playing) snd.resume(); });

// ---------- τέλος ----------
let playTime = 0, endT = 0;
function goodnight() {
  ended = true; playing = false;
  weather = 'night'; target = PRESET.night;
  document.getElementById('weather').classList.add('off');
  moon.visible = true;
  anim.spin = 0.8; anim.spinTo = 'bye';      // πιτζάμες και «αντίο»
  petros.wave(true); snd.goodnight();
}

// ---------- βρόχος ----------
const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  if (playing) { playTime += dt; if (playTime > PLAY_SECONDS) goodnight(); }
  if (ended) {
    endT += dt;
    if (endT > 9 && !document.getElementById('end').classList.contains('show')) {
      const end = document.getElementById('end'); end.hidden = false; requestAnimationFrame(() => end.classList.add('show'));
    }
    if (endT > 14) { renderer.setAnimationLoop(null); return; }   // ησυχία — σταματά και η μπαταρία
  }

  approach(dt);
  // συσσώρευση χιονιού και νερού
  snowCover = THREE.MathUtils.clamp(snowCover + dt * (weather === 'snow' ? 1 / 14 : weather === 'sun' ? -1 / 6 : -1 / 25), 0, 1);
  puddle = THREE.MathUtils.clamp(puddle + dt * (weather === 'rain' ? 1 / 8 : weather === 'sun' ? -1 / 16 : -1 / 30), 0, 1);
  rainbowT = Math.max(0, rainbowT - dt);

  scene.background.copy(cur.sky); scene.fog.color.copy(cur.sky);
  hemi.intensity = cur.hemi; sunLight.intensity = cur.dir;
  sun.position.y = -5 + cur.sun * 16; sunGlow.position.y = sun.position.y;
  sun.scale.setScalar(1 + Math.sin(t * 1.5) * 0.03); sunGlow.material.opacity = 0.45 * cur.sun;
  if (moon.visible) moon.position.y = Math.min(moon.position.y + dt * 0.6, 9);
  stars.material.opacity = Math.max(0, (0.6 - cur.hemi) * 3);
  cloudMat.color.copy(cur.cloud); cloudMat.emissive.copy(cur.cloud).multiplyScalar(0.6);
  clouds.forEach(c => {
    c.userData.x += c.userData.speed * dt; if (c.userData.x > 12) c.userData.x = -12;
    c.position.set(c.userData.x, c.userData.y + cur.cloudY, c.position.z);
    c.scale.setScalar(0.75 + (1 - cur.sun) * 0.6);
  });

  groundMat.color.copy(GREEN).lerp(WHITE, snowCover);
  hillMat.color.copy(HILL).lerp(WHITE, snowCover);
  groundMat.emissive.setScalar(snowCover * 0.3); hillMat.emissive.setScalar(snowCover * 0.25);
  roofMat.color.copy(ROOF).lerp(WHITE, snowCover * 0.85);
  leafMat.color.copy(LEAF).lerp(WHITE, snowCover * 0.55);
  path.visible = snowCover < 0.5;
  flowers.children.forEach((f, i) => f.scale.setScalar(Math.max(0.001, 1 - snowCover * 1.6) * (1 + Math.sin(t * 2 + i) * 0.04)));
  snowman.scale.setScalar(Math.max(0.001, (snowCover - 0.45) / 0.55 * 0.8));
  puddles.forEach((p, i) => { const s = Math.max(0.001, puddle * (1 + Math.sin(t * 3 + i) * 0.03)); p.scale.set(s, s * 0.6, 1); });
  puddleMat.color.setHex(snowCover > 0.3 ? 0xcfe3f2 : 0x6f93b8).multiplyScalar(cur.light);
  rainbow.children.forEach(r => (r.material.opacity = Math.min(rainbowT / 3, 1, (14 - rainbowT) / 2) * 0.55));

  moveField(rain, Math.round(cur.rain * RAIN_N), dt, 13, 0);
  moveField(snow, Math.round(cur.snow * SNOW_N), dt, 1.1, 0.35);
  splV.forEach((s, i) => {
    s.vy -= 12 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
    tmp.position.set(s.x, s.y > 0 ? s.y : -9, s.z); tmp.updateMatrix(); splash.setMatrixAt(i, tmp.matrix);
  });
  splash.instanceMatrix.needsUpdate = true;
  snd.set(cur.rain, cur.snow, cur.sun);
  snd.update(dt);

  // ήρωες: πηδηματάκι, στροφή για αλλαγή ρούχων
  if (anim.hop > 0) { anim.hop -= dt; const k = 1 - anim.hop / 0.6; petrosRig.position.y = Math.sin(Math.min(k, 1) * Math.PI) * 0.55; }
  else petrosRig.position.y = 0;
  if (anim.dogHop > 0) { anim.dogHop -= dt; const k = 1 - anim.dogHop / 0.5; dogRig.position.y = Math.sin(Math.min(k, 1) * Math.PI) * 0.4; }
  else dogRig.position.y = 0;
  if (anim.spin > 0) {
    anim.spin -= dt; const k = THREE.MathUtils.smootherstep(1 - Math.max(anim.spin, 0) / 0.8, 0, 1);
    petrosRig.rotation.y = k * Math.PI * 2;
    if (k > 0.25 && anim.spinTo) { petros.setOutfit(anim.spinTo); dog.setOutfit(anim.spinTo); anim.spinTo = null; }
  } else petrosRig.rotation.y = 0;
  petros.setLight?.(cur.light); dog.setLight?.(cur.light);
  petros.update(t, dt); dog.update(t, dt);

  camera.position.x = Math.sin(t * 0.2) * 0.12;
  camera.lookAt(LOOK);
  renderer.render(scene, camera);
}

petros.setOutfit('sun'); dog.setOutfit('sun');
renderer.setAnimationLoop(frame);

// offline: κρατάμε τα αρχεία του παιχνιδιού στη συσκευή
// (τοπικά μόνο με ?sw=1, για να μη μας σερβίρει παλιά αρχεία όσο δουλεύουμε)
if ('serviceWorker' in navigator && (location.protocol === 'https:' || q.has('sw'))) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

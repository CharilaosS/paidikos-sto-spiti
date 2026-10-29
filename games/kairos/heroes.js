// Πέτρος και Φουντούκης ως ζωγραφιές (διάφανα WebP, βγαλμένα με αναφορά το φύλλο χαρακτήρων R000)
// στημένες σαν χάρτινες φιγούρες μέσα στην 3D σκηνή. Μία εικόνα ανά ρούχο.
import * as THREE from '../lib/three/three.module.min.js';

const loader = new THREE.TextureLoader();

// images: { ρούχο: [αρχείο, ύψος σε μονάδες σκηνής] } — το ύψος διαφέρει ανά εικόνα ώστε ο ήρωας να έχει
// ίδιο μπόι (π.χ. η ομπρέλα και η φούντα του σκούφου προσθέτουν ύψος)· το πλάτος βγαίνει από την εικόνα.
function figure(images) {
  const geo = new THREE.PlaneGeometry(1, 1); geo.translate(0, 0.5, 0);
  const mat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.04 });
  const plane = new THREE.Mesh(geo, mat);
  const group = new THREE.Group(); group.add(plane);
  const textures = {};
  let current = null, height = 1;
  const fit = () => { const img = mat.map?.image; if (img?.width) plane.scale.set(height * img.width / img.height, height, 1); };
  for (const [k, [url]] of Object.entries(images)) {
    textures[k] = loader.load(url, () => { if (current === k) fit(); });
    textures[k].colorSpace = THREE.SRGBColorSpace;
    textures[k].anisotropy = 4;
  }
  return {
    group, plane, mat,
    show(k) { current = k; height = images[k][1]; mat.map = textures[k]; mat.needsUpdate = true; fit(); },
    get height() { return height; },
  };
}

export function makePetros(base) {
  const f = figure({ sun: [`${base}petros-sun.webp`, 2.05], rain: [`${base}petros-rain.webp`, 2.35], snow: [`${base}petros-snow.webp`, 2.22], bye: [`${base}petros-bye.webp`, 1.97] });
  let waving = false;
  return {
    group: f.group,
    setOutfit: w => f.show(w),
    setLight: k => f.mat.color.setScalar(k),
    wave(on) { waving = on; },
    update(t) {
      f.plane.scale.y = f.height * (1 + Math.sin(t * 2.2) * 0.012);
      f.plane.rotation.z = waving ? Math.sin(t * 2.5) * 0.05 : Math.sin(t * 0.9) * 0.015;
    },
  };
}

export function makeDog(base) {
  const f = figure({ sun: [`${base}fountoukis.webp`, 1.2], rain: [`${base}fountoukis-rain.webp`, 1.27], snow: [`${base}fountoukis-snow.webp`, 1.23] });
  let happy = 0;
  return {
    group: f.group,
    setOutfit: w => f.show(w === 'bye' ? 'sun' : w),
    setLight: k => f.mat.color.setScalar(k),
    excite() { happy = 1.5; },
    update(t, dt) {
      happy = Math.max(0, happy - dt);
      f.plane.rotation.z = happy ? Math.sin(t * 18) * 0.06 : Math.sin(t * 0.8) * 0.02;
      f.plane.scale.y = f.height * (1 + Math.sin(t * 2.6) * 0.012);
    },
  };
}

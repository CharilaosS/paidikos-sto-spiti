// Offline: την πρώτη φορά που ανοίγει το παιχνίδι κρατάμε όλα του τα αρχεία στη συσκευή.
// Μετά σερβίρουμε από εκεί αμέσως και ανανεώνουμε σιωπηλά στο παρασκήνιο όταν υπάρχει ίντερνετ.
// Όταν αλλάζει κάτι στο παιχνίδι, ανέβαζε το VERSION.
const VERSION = 'kairos-v1';
const FILES = [
  './', 'index.html', 'kairos.css', 'game.js', 'sound.js', 'heroes.js', 'manifest.webmanifest',
  '../lib/three/three.module.min.js',
  'img/petros-sun.webp', 'img/petros-rain.webp', 'img/petros-snow.webp', 'img/petros-bye.webp',
  'img/fountoukis.webp', 'img/fountoukis-rain.webp', 'img/fountoukis-snow.webp',
  'img/icon-180.png', 'img/icon-192.png', 'img/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('kairos-') && k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(async cache => {
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
    if (hit) { e.waitUntil(net); return hit; }
    return net;
  }));
});

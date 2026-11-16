/* Service worker: membuat form bisa dibuka tanpa sinyal dan mengirim antrean di latar belakang.
   Naikkan angka VERSI setiap kali index.html atau config.js diubah. */
var VERSI = 'c86-v2';
var BERKAS = ['./', 'index.html', 'config.js', 'jspdf.umd.min.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
importScripts('config.js');

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSI).then(function (c) { return c.addAll(BERKAS); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSI; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
// Berkas form: ambil dari simpanan HP dulu, perbarui diam-diam bila ada sinyal.
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== self.location.origin) return;
  e.respondWith(caches.open(VERSI).then(function (c) {
    return c.match(e.request, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(e.request).then(function (r) { if (r && r.ok) c.put(e.request, r.clone()); return r; });
      if (hit) { e.waitUntil(net.catch(function () {})); return hit; }
      return net;
    });
  }));
});

// ---- kirim antrean saat sinyal kembali (Background Sync, Android/Chrome)
function buka() {
  return new Promise(function (res, rej) {
    var r = indexedDB.open('c86', 2);
    r.onupgradeneeded = function () {
      var db = r.result;
      if (!db.objectStoreNames.contains('antre')) db.createObjectStore('antre', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('riwayat')) db.createObjectStore('riwayat', { keyPath: 'id' });
    };
    r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); };
  });
}
function op(db, mode, fn) {
  return new Promise(function (res, rej) {
    var t = db.transaction('antre', mode), q = fn(t.objectStore('antre'));
    t.oncomplete = function () { res(q && q.result); }; t.onerror = t.onabort = function () { rej(t.error); };
  });
}
function kirimAntre() {
  if (!/^https:\/\//.test(self.CONFIG.FLOW_URL || '')) return Promise.resolve();
  return buka().then(function (db) {
    return op(db, 'readonly', function (s) { return s.getAll(); }).then(function (list) {
      var i = 0;
      function next() {
        if (i >= list.length) return;
        var p = list[i++];
        return fetch(self.CONFIG.FLOW_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(p) })
          .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
          .then(function (j) { if (!j || !j.ok) return; return op(db, 'readwrite', function (s) { return s.delete(p.id); }); })
          .then(next);
      }
      return next();
    });
  }).then(function () {
    return self.clients.matchAll().then(function (cs) { cs.forEach(function (c) { c.postMessage('antre-berubah'); }); });
  });
}
self.addEventListener('sync', function (e) { if (e.tag === 'kirim-antre') e.waitUntil(kirimAntre()); });

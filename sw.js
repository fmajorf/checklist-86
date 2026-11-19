/* Service worker: membuat form bisa dibuka tanpa sinyal dan mengirim antrean di latar belakang.
   Naikkan angka VERSI setiap kali index.html atau config.js diubah. */
var BERKAS = ['./', 'index.html', 'config.js', 'jspdf.umd.min.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
importScripts('config.js');
// Awalan simpanan khusus aplikasi ini (dari ID di config.js). Naikkan angka versi setiap ada perubahan file.
var ID = self.CONFIG.ID || 'mpd';
var AWALAN = ID + '-';
var VERSI = AWALAN + 'v12';
var NAMA_DB = 'c86' + (ID === 'mpd' ? '' : '-' + ID);

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSI).then(function (c) { return c.addAll(BERKAS.map(function (u) { return new Request(u, { cache: 'reload' }); })); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf(AWALAN) === 0 && k !== VERSI; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
// Berkas form: ambil dari simpanan HP dulu, perbarui diam-diam bila ada sinyal.
// Respons disalin ulang agar bersih dari tanda "redirected", yang ditolak Safari/iPhone saat membuka halaman.
function bersih(r) {
  return r.blob().then(function (b) { return new Response(b, { status: 200, statusText: 'OK', headers: r.headers }); });
}
function perbarui(c, kunci, req) {
  return fetch(req, { cache: 'no-cache' }).then(function (r) { if (r && r.ok) return c.put(kunci, r.clone()).then(function () { return r; }); return r; });
}
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== self.location.origin) return;
  // Membuka aplikasi (dari ikon atau alamat apa pun di dalam folder ini) selalu dilayani dari index.html tersimpan.
  var navigasi = e.request.mode === 'navigate';
  e.respondWith(caches.open(VERSI).then(function (c) {
    var kunci = navigasi ? 'index.html' : e.request;
    return c.match(kunci, { ignoreSearch: true }).then(function (hit) {
      var net = perbarui(c, kunci, navigasi ? 'index.html' : e.request);
      if (hit) { e.waitUntil(net.catch(function () {})); return bersih(hit); }
      return net;
    });
  }).catch(function () { return fetch(e.request); }));
});

// ---- kirim antrean saat sinyal kembali (Background Sync, Android/Chrome)
function buka() {
  return new Promise(function (res, rej) {
    var r = indexedDB.open(NAMA_DB, 2);
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

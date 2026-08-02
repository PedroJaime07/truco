/* Service worker do Placar de Mesa.
   Estratégia: rede primeiro, cache como reserva — o app abre offline
   sem correr o risco de servir uma versão velha quando há internet. */

var CACHE = 'placar-mesa-v1';

var ARQUIVOS = [
  './',
  'index.html',
  'truco.html',
  'fodinha.html',
  'css/style.css',
  'js/storage.js',
  'js/ui.js',
  'js/menu.js',
  'js/truco.js',
  'js/fodinha.js',
  'manifest.webmanifest',
  'icon.svg'
];

self.addEventListener('install', function (evento) {
  evento.waitUntil(
    caches.open(CACHE)
      .then(function (cache) { return cache.addAll(ARQUIVOS); })
      .then(function () { return self.skipWaiting(); })
      .catch(function () { /* se um arquivo falhar, segue sem quebrar a instalação */ })
  );
});

self.addEventListener('activate', function (evento) {
  evento.waitUntil(
    caches.keys().then(function (chaves) {
      return Promise.all(chaves.map(function (chave) {
        if (chave !== CACHE) return caches.delete(chave);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (evento) {
  var req = evento.request;
  if (req.method !== 'GET') return;

  evento.respondWith(
    fetch(req)
      .then(function (resposta) {
        /* guarda uma cópia fresca dos arquivos do próprio app */
        if (resposta && resposta.ok && new URL(req.url).origin === self.location.origin) {
          var copia = resposta.clone();
          caches.open(CACHE).then(function (cache) { cache.put(req, copia); });
        }
        return resposta;
      })
      .catch(function () {
        return caches.match(req).then(function (cacheado) {
          return cacheado || caches.match('index.html');
        });
      })
  );
});

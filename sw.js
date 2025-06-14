const CACHE_NAME = 'calendario-cache-v2';
const OFFLINE_PAGE = '/index.html';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  './icon-192x192.png',
  './icon-512x512.png',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  // Adicione outros assets estáticos aqui (CSS, JS, fonts)
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cacheando recursos estáticos');
        return cache.addAll(ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((err) => console.error('Erro durante instalação:', err))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => 
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('Removendo cache antigo:', key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Ignora requisições não-GET e de outros domínios
  if (event.request.method !== 'GET' || 
      !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Estratégia: Cache First, com atualização em background
        const fetchAndUpdate = async () => {
          try {
            const networkResponse = await fetch(event.request);
            
            // Atualiza o cache se a resposta for válida
            if (networkResponse.status === 200) {
              const cache = await caches.open(CACHE_NAME);
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          } catch (err) {
            // Fallback para páginas HTML quando offline
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_PAGE);
            }
            throw err;
          }
        };

        // Retorna resposta em cache imediatamente
        // Enquanto atualiza o cache em background
        return cachedResponse || fetchAndUpdate();
      })
      .catch(() => {
        // Fallback adicional para páginas
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_PAGE);
        }
      })
  );
});

/* Service worker do Criartere (PWA).
   - Páginas: rede primeiro; sem conexão, usa o index.html salvo (o app abre offline).
   - Arquivos do build (/assets/*, com hash no nome) e ícones: cache primeiro.
   - Supabase e qualquer outro domínio: nunca passam pelo cache (dados sempre atuais). */
const VERSAO = 'criartere-v5'
const ESSENCIAIS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSAO).then((cache) => cache.addAll(ESSENCIAIS)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(chaves.filter((c) => c !== VERSAO).map((c) => caches.delete(c))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // Navegação (abrir/recarregar uma página do app)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copia = resp.clone()
          caches.open(VERSAO).then((cache) => cache.put('/index.html', copia))
          return resp
        })
        .catch(() => caches.match('/index.html')),
    )
    return
  }

  // Arquivos estáticos
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(req).then(
        (cache) =>
          cache ||
          fetch(req).then((resp) => {
            if (resp.ok) {
              const copia = resp.clone()
              caches.open(VERSAO).then((c) => c.put(req, copia))
            }
            return resp
          }),
      ),
    )
  }
})

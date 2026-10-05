/*
 * Lencana service worker (B152) — membuat situs bisa dipasang di HP dan membuka cangkangnya saat jaringan putus.
 *
 * Yang di-cache, dan hanya ini:
 *  - cangkang halaman (`index.html`), jaringan lebih dulu — versi baru selalu menang, salinan dipakai hanya saat offline;
 *  - berkas build ber-hash (`assets/<nama>-<hash>.js|css`), cache lebih dulu — namanya berubah setiap isinya berubah;
 *  - ikon aplikasi.
 * Yang TIDAK PERNAH disentuh: semua yang beda asal — signer, RPC chain, tepi (dokumen kredensial dan daftar status), Privy,
 * font — karena status kredensial dan jawaban bertanda tangan harus selalu segar; `/signer` (proxy dev); permintaan Range;
 * dan gambar besar tanpa hash. Mengganti strategi ini = membuka kembali baris B152 di vault.
 */
const VERSION = 'lencana-sw-v1'
const SHELL = `${VERSION}-shell`
const BUILD = `${VERSION}-build`
const SCOPE = new URL(self.registration.scope)
const SHELL_URL = new URL('./', SCOPE).href
const HASHED = /\/assets\/[^/]+-[A-Za-z0-9_-]{8}\.(?:js|css)$/
const ICON = /\/icons\/[^/]+\.png$/

const putSafe = (cacheName, req, res) => caches.open(cacheName).then((c) => c.put(req, res)).catch(() => {})

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL)
    const res = await fetch(new Request(SHELL_URL, { cache: 'reload' }))
    if (!res.ok) return
    await shell.put(SHELL_URL, res.clone())
    // berkas ber-hash yang dirujuk cangkang ikut disimpan, supaya kunjungan offline pertama pun bisa menyalakan aplikasi
    const html = await res.text()
    const urls = [...new Set([...html.matchAll(/(?:src|href)="([^"]*assets\/[^"]+-[A-Za-z0-9_-]{8}\.(?:js|css))"/g)].map((m) => new URL(m[1], SHELL_URL).href))]
    const build = await caches.open(BUILD)
    await Promise.all(urls.map((u) => build.add(u).catch(() => {})))
  })().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(`${VERSION}-`)).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()))
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET' || req.headers.has('range')) return
  const url = new URL(req.url)
  if (url.origin !== SCOPE.origin || url.pathname.startsWith('/signer')) return

  if (req.mode === 'navigate') {
    event.respondWith(fetch(req)
      .then((res) => { if (res.ok) putSafe(SHELL, SHELL_URL, res.clone()); return res })
      .catch(() => caches.match(SHELL_URL).then((hit) => hit || Response.error())))
    return
  }

  if (HASHED.test(url.pathname) || ICON.test(url.pathname)) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && res.status === 200) putSafe(BUILD, req, res.clone())
      return res
    })))
  }
})

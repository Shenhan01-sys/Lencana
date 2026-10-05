// Lencana-B152 status=TERBUKA 2026-10-05 — situs bisa dipasang di HP: manifest + ikon + service worker (web/public/sw.js) yang hanya menyimpan cangkang halaman, berkas build ber-hash, dan ikon — tidak pernah signer, RPC chain, atau dokumen tepi. Buktikan ulang: build + vite preview, Page.getInstallabilityErrors kosong, cangkang tampil saat offline (vault B152). JANGAN dibalik/diulang tanpa membuka kembali baris B152 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/**
 * `pwa.ts` — pendaftaran service worker (B152).
 *
 * Hanya di build produksi: server dev Vite menyajikan modul tanpa hash dengan HMR, dan service worker yang menangkap navigasi
 * di sana hanya membuat halaman basi. Gagal mendaftar tidak boleh mengganggu halaman — situs tetap jalan tanpa mode offline.
 */
export function registerServiceWorker (): void {
  if (import.meta.env?.DEV || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((e: unknown) => console.warn('service worker tidak terpasang:', e))
  })
}

import { defineConfig } from 'vite'

/**
 * Basis path relatif supaya hasil `dist/` bisa dibuka dari mana saja: file statis di
 * host apa pun, `vite preview`, atau sekadar di-drag ke browser. Submission hackathon
 * tidak boleh bergantung pada satu host.
 */
/**
 * Uji dari HP lewat terowongan (ngrok, 3 Okt): host terowongan diizinkan, dan signer lokal disajikan di ASAL YANG SAMA lewat
 * `/signer` — dari HP, `127.0.0.1:8787` adalah HP itu sendiri. Berlaku untuk server dev dan `vite preview`; isi build tidak berubah.
 * Terowongan sebaiknya ke `vite preview` (build `dist-tunnel`, tanpa live-reload): server dev memuat ulang seluruh halaman
 * setiap kali koneksi live-reload-nya putus — dan peramban HP memutusnya setiap kali tab ditinggal.
 */
const tunnel = {
  allowedHosts: ['.ngrok-free.app', '.ngrok-free.dev', '.ngrok.app', '.ngrok.dev'],
  proxy: { '/signer': { target: 'http://127.0.0.1:8787', changeOrigin: true, rewrite: (p: string) => p.replace(/^\/signer/, '') } },
}

export default defineConfig({
  base: './',
  build: { outDir: 'dist', sourcemap: true, target: 'es2022' },
  server: { port: 5173, host: '127.0.0.1', ...tunnel },
  preview: { port: 4173, host: '127.0.0.1', ...tunnel },
})

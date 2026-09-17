import { defineConfig } from 'vite'

/**
 * Basis path relatif supaya hasil `dist/` bisa dibuka dari mana saja: file statis di
 * host apa pun, `vite preview`, atau sekadar di-drag ke browser. Submission hackathon
 * tidak boleh bergantung pada satu host.
 */
export default defineConfig({
  base: './',
  build: { outDir: 'dist', sourcemap: true, target: 'es2022' },
  server: { port: 5173, host: '127.0.0.1' },
})

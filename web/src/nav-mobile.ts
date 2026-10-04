// Lencana-B149 status=SELESAI 2026-10-05 —menu hamburger navbar di layar HP: tombol + panel yang dibangun ulang dari tautan navbar yang hidup, pemilih bahasa pindah ke panel, tertutup saat tautan/Esc/latar/rute berganti. Buktikan ulang: audit 375 px semua rute (T76). JANGAN dibalik/diulang tanpa membuka kembali baris B149 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/**
 * `nav-mobile.ts` — menu hamburger navbar di layar HP (B149).
 *
 * Di ≤ 860 px `style.css` menyembunyikan `.nav-links` di semua halaman tanpa pengganti: pengguna HP tidak bisa mencapai
 * Kursus / Periksa Bukti / Pusat Kepercayaan / Penerbit / Dasbor dari navbar. Modul ini menambah tombol hamburger dan panel
 * menu. Panel dibangun ULANG setiap dibuka dari tautan navbar yang hidup — teks per bahasa, tautan Dasbor yang baru muncul
 * sesudah login, dan tanda aktif tetap diurus `main.ts`; di sini hanya dibaca, jadi tidak ada daftar menu kedua yang bisa basi.
 * Pemilih bahasa ikut ke panel: tombolnya meneruskan klik ke tombol EN/ID asli, supaya logika bahasa tetap satu.
 * Tidak ada markup baru di `index.html` dan tidak ada aturan baru di `style.css` (berkas pemelihara front-end).
 */
import './nav-mobile.css'

const MOBILE = '(max-width: 860px)'

export function mountMobileNav (): void {
  const header = document.querySelector<HTMLElement>('header.app-navbar')
  const actions = header?.querySelector<HTMLElement>('.nav-actions')
  const links = header?.querySelector<HTMLElement>('.nav-links')
  if (!header || !actions || !links || header.querySelector('.nav-burger')) return

  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'nav-burger'
  btn.setAttribute('aria-label', 'Menu')
  btn.setAttribute('aria-expanded', 'false')
  btn.setAttribute('aria-controls', 'nav-drawer')
  btn.innerHTML = '<span></span><span></span><span></span>'
  actions.appendChild(btn)

  const drawer = document.createElement('nav')
  drawer.id = 'nav-drawer'
  drawer.className = 'nav-drawer'
  drawer.setAttribute('aria-label', 'Menu')
  drawer.hidden = true
  const backdrop = document.createElement('div')
  backdrop.className = 'nav-drawer-backdrop'
  backdrop.hidden = true
  document.body.append(backdrop, drawer)

  const isOpen = () => btn.getAttribute('aria-expanded') === 'true'
  const close = () => {
    if (!isOpen()) return
    btn.setAttribute('aria-expanded', 'false')
    document.documentElement.classList.remove('nav-open')
    drawer.hidden = true
    backdrop.hidden = true
  }

  const build = () => {
    const items: HTMLElement[] = []
    for (const a of links.querySelectorAll<HTMLAnchorElement>('a')) {
      if (a.classList.contains('hidden') || a.hidden) continue
      const item = document.createElement('a')
      item.href = a.getAttribute('href') ?? '#/'
      item.textContent = a.textContent?.trim() ?? ''
      item.className = `nav-drawer-link${a.classList.contains('active') ? ' active' : ''}`
      if (a.classList.contains('active')) item.setAttribute('aria-current', 'page')
      item.addEventListener('click', close)
      items.push(item)
    }
    const langRow = document.createElement('div')
    langRow.className = 'nav-drawer-lang'
    langRow.setAttribute('role', 'group')
    langRow.setAttribute('aria-label', 'Language')
    for (const id of ['lang-en', 'lang-id']) {
      const orig = document.getElementById(id)
      if (!orig) continue
      const b = document.createElement('button')
      b.type = 'button'
      b.textContent = orig.textContent?.trim() ?? ''
      b.className = `nav-drawer-langbtn${orig.classList.contains('active') ? ' active' : ''}`
      b.setAttribute('aria-pressed', orig.classList.contains('active') ? 'true' : 'false')
      // Klik diteruskan ke tombol asli (main.ts setLanguage), lalu panel dibangun ulang dengan teks bahasa baru.
      b.addEventListener('click', () => { (orig as HTMLButtonElement).click(); build() })
      langRow.appendChild(b)
    }
    const net = header.querySelector('#badge-name')?.textContent?.trim()
    drawer.replaceChildren(...items, langRow, ...(net ? [Object.assign(document.createElement('small'), { className: 'nav-drawer-net', textContent: net })] : []))
  }

  const open = () => {
    build()
    drawer.style.top = `${Math.round(header.getBoundingClientRect().bottom)}px`
    btn.setAttribute('aria-expanded', 'true')
    document.documentElement.classList.add('nav-open')
    drawer.hidden = false
    backdrop.hidden = false
    drawer.querySelector<HTMLElement>('a, button')?.focus()
  }

  btn.addEventListener('click', () => (isOpen() ? close() : open()))
  backdrop.addEventListener('click', close)
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) { close(); btn.focus() } })
  window.addEventListener('hashchange', close)
  window.matchMedia(MOBILE).addEventListener('change', (e) => { if (!e.matches) close() })
}

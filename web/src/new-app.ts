/**
 * `new-app.ts` — wadah halaman baru dari cabang FE `dex/lencana-ui`: beranda/katalog (`pages/landing.ts`),
 * ruang kelas (`pages/class.ts`), dan — sejak port ke core 1 Okt malam (FE7) — `#/me` yang dulu
 * digambar `lms.ts`. Aksi halaman belajar dipasang SEKALI di wadah ini (delegasi klik), lalu setiap
 * render ulang cukup mengganti isinya.
 */
import { renderLanding } from './pages/landing'
import { bindLearningActions, renderClass, renderMe } from './pages/class'

const currentHash = (): string => (window.location.hash || '#/').toLowerCase().split('?')[0]

export function mountNewApp (routeHash: string): void {
  let appEl = document.getElementById('page-new-app')
  if (!appEl) {
    appEl = document.createElement('div')
    appEl.className = 'page-view'
    appEl.id = 'page-new-app'
    const firstPage = document.querySelector('.page-view')
    firstPage?.parentNode?.insertBefore(appEl, firstPage)
  }
  const rerender = () => mountNewApp(currentHash())
  if (!appEl.dataset.bound) {
    bindLearningActions(appEl, rerender)
    appEl.dataset.bound = '1'
  }

  appEl.innerHTML = ''

  if (routeHash === '#/' || routeHash === '' || routeHash === '#' || routeHash === '#/courses' || routeHash === '#courses' || routeHash === '#catalog') {
    appEl.appendChild(renderLanding())
    if (routeHash.includes('catalog') || routeHash.includes('courses')) {
      setTimeout(() => {
        const cat = document.getElementById('catalog')
        if (cat) cat.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  } else if (routeHash.startsWith('#/class/')) {
    appEl.appendChild(renderClass(routeHash, rerender))
  } else if (routeHash === '#/me') {
    appEl.appendChild(renderMe())
  }
}

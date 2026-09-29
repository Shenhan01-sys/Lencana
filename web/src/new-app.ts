import { renderLanding } from './pages/landing';
import { renderClass } from './pages/class';

export function mountNewApp(routeHash: string) {
  let appEl = document.getElementById('page-new-app');
  if (!appEl) {
    appEl = document.createElement('div');
    appEl.className = 'page-view';
    appEl.id = 'page-new-app';
    const firstPage = document.querySelector('.page-view');
    firstPage?.parentNode?.insertBefore(appEl, firstPage);
  }
  
  appEl.innerHTML = '';
  
  if (routeHash === '#/' || routeHash === '') {
    appEl.appendChild(renderLanding());
  } else if (routeHash.startsWith('#/class/')) {
    appEl.appendChild(renderClass(routeHash));
  }
}

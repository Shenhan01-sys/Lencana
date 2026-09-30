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
  
  if (routeHash === '#/' || routeHash === '' || routeHash === '#/courses' || routeHash === '#courses' || routeHash === '#catalog') {
    appEl.appendChild(renderLanding());
    if (routeHash.includes('catalog') || routeHash.includes('courses')) {
      setTimeout(() => {
        const cat = document.getElementById('catalog');
        if (cat) cat.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  } else if (routeHash.startsWith('#/class/')) {
    appEl.appendChild(renderClass(routeHash));
  }
}

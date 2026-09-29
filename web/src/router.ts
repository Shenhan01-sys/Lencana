export type Route = {
  path: string;
  pattern: RegExp;
  keys: string[];
  handler: (params: Record<string, string>) => void | Promise<void>;
};

export const router = {
  routes: [] as Route[],
  
  on(path: string, handler: (params: Record<string, string>) => void | Promise<void>) {
    const keys: string[] = [];
    const pattern = path.replace(/:([^\/]+)/g, (_, key) => {
      keys.push(key);
      return '([^\\/]+)';
    });
    this.routes.push({
      path,
      pattern: new RegExp('^' + pattern + '$'),
      keys,
      handler
    });
  },

  async navigate(hash: string) {
    const path = hash.startsWith('#') ? hash.slice(1) : hash;
    const cleanPath = path.split('?')[0] || '/';
    
    for (const route of this.routes) {
      const match = cleanPath.match(route.pattern);
      if (match) {
        const params: Record<string, string> = {};
        route.keys.forEach((key, i) => {
          params[key] = match[i + 1];
        });
        await route.handler(params);
        return;
      }
    }
    // Handle 404
    const app = document.getElementById('app');
    if (app) app.innerHTML = `
      <div style="padding: 4rem; text-align: center;">
        <h1 style="color: var(--text-color);">404 - Halaman Tidak Ditemukan</h1>
        <p style="color: var(--text-muted);"><a href="#/">Kembali ke beranda</a></p>
      </div>
    `;
  },

  init() {
    window.addEventListener('hashchange', () => {
      this.navigate(window.location.hash);
    });
    // First load
    this.navigate(window.location.hash || '#/');
  }
};

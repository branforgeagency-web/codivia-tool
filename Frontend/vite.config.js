import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Old links point at /app.html (e.g. app.html?signup=1&dept=CARDIO).
// The app now lives at /index.html, so serve it for /app.html too.
function appHtmlAlias() {
  const rewrite = (req, _res, next) => {
    if (req.url === '/app.html' || req.url.startsWith('/app.html?')) {
      req.url = '/index.html' + req.url.slice('/app.html'.length);
    }
    next();
  };
  return {
    name: 'app-html-alias',
    configureServer(server) { server.middlewares.use(rewrite); },
    configurePreviewServer(server) { server.middlewares.use(rewrite); },
  };
}

export default defineConfig({
  plugins: [react(), appHtmlAlias()],
  // public/ (assets + chart/code data) is copied to dist/ untouched
  publicDir: 'public',
  server: { port: 8080 },
  preview: { port: 8080 },
  build: {
    outDir: 'dist',
    // keep bundled files apart from public/assets (logos, department images)
    assetsDir: 'bundle',
  },
});

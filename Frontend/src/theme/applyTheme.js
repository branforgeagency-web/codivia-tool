/* CODIVIA platform — writes the theme's CSS variables into the page (runs once at startup) */
import { cssVars } from './theme.js';

export function applyTheme() {
  const css = Object.entries(cssVars)
    .map(([selector, decls]) => {
      const body = Object.entries(decls)
        .map(([name, value]) => `${name}:${value}`)
        .join(';');
      return `${selector}{${body}}`;
    })
    .join('\n');
  let el = document.getElementById('cv-theme');
  if (!el) {
    el = document.createElement('style');
    el.id = 'cv-theme';
    document.head.prepend(el);
  }
  el.textContent = css;
}

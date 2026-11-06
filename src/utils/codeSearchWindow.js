/* CODIVIA platform — opens Code Search in its own browser window */
import { PATHS } from '../routes/paths.js';

// Open the full CODIVIA Code Search in a separate browser window.
// Returns the window handle, or null if the browser blocked the popup.
export function openCodeSearchWindow() {
  try {
    const url = PATHS.codeSearch;
    const w = Math.min(
      1100,
      Math.max(720, ((window.screen && window.screen.availWidth) || 1200) - 380),
    );
    const h = Math.min(
      860,
      Math.max(560, ((window.screen && window.screen.availHeight) || 900) - 90),
    );
    const left = window.screen && window.screen.availWidth ? window.screen.availWidth - w - 20 : 40;
    const feat =
      'width=' + w + ',height=' + h + ',left=' + left + ',top=40,resizable=yes,scrollbars=yes';
    const win = window.open(url, 'codivia_code_search', feat);
    if (win) {
      try {
        win.focus();
      } catch (e) {}
    }
    return win || null;
  } catch (err) {
    return null;
  }
}

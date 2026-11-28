import { post } from './apiHelper';
import { MEDIA_UPLOAD } from './endpoints';

// Media folders the backend accepts (backend/src/config/media.js) and their client-side checks,
// so a wrong file fails before it is sent. The server checks again.
export const MEDIA_FOLDERS = Object.freeze({
  charts: { extensions: ['.pdf', '.doc', '.docx', '.txt'], maxBytes: 10 * 1024 * 1024 },
  // Scans / photos attached to a chart's Media items (shown to students).
  chartMedia: { extensions: ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif'], maxBytes: 10 * 1024 * 1024 },
});

const extOf = (name) => {
  const m = /\.[^.]+$/.exec(name || '');
  return m ? m[0].toLowerCase() : '';
};

// Throws an Error with a readable message when the file isn't allowed in the folder.
export function checkMediaFile(file, folder = 'charts') {
  const rules = MEDIA_FOLDERS[folder];
  if (!rules) throw new Error(`Unknown media folder "${folder}".`);
  if (!file) throw new Error('Choose a file to upload.');
  if (!rules.extensions.includes(extOf(file.name))) {
    throw new Error('Unsupported file type. Use ' + rules.extensions.join(', ').toUpperCase().replace(/\./g, '') + '.');
  }
  if (file.size > rules.maxBytes) throw new Error(`File exceeds the ${Math.round(rules.maxBytes / 1048576)} MB limit.`);
}

// Upload one file to S3 through POST /media-upload (multipart/form-data).
// Resolves to { key, url, name, size, mimeType, folder }.
export async function uploadMedia(file, { folder = 'charts', signal } = {}) {
  checkMediaFile(file, folder);
  const form = new FormData();
  form.append('folder', folder);
  form.append('file', file, file.name);
  return post(MEDIA_UPLOAD, form, signal ? { signal } : undefined);
}

// POST /media-upload: files stored in the S3 bucket (config.s3).
// Each folder lists the file types it accepts and its size limit, so a new use (e.g. images)
// is one more entry here.
const MEDIA_FOLDERS = Object.freeze({
  charts: Object.freeze({
    label: 'Chart record files',
    maxBytes: 10 * 1024 * 1024,
    types: Object.freeze({
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
    }),
  }),
});

const MEDIA_FOLDER_LIST = Object.freeze(Object.keys(MEDIA_FOLDERS));
const DEFAULT_MEDIA_FOLDER = 'charts';
// Largest limit of any folder: multer's hard cap before the per-folder check.
const MEDIA_MAX_BYTES = Math.max(...Object.values(MEDIA_FOLDERS).map((f) => f.maxBytes));

module.exports = { MEDIA_FOLDERS, MEDIA_FOLDER_LIST, DEFAULT_MEDIA_FOLDER, MEDIA_MAX_BYTES };

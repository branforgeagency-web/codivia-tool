const crypto = require('crypto');
const path = require('path');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const config = require('../config/config');
const { MEDIA_FOLDERS, DEFAULT_MEDIA_FOLDER } = require('../config/media');
const ApiError = require('../utils/ApiError');
const httpStatus = require('../utils/httpStatus');

let client;
const s3 = () => {
  if (!client) {
    const { region, accessKeyId, secretAccessKey } = config.s3;
    // Without keys in .env the SDK falls back to its default chain (AWS profile, instance role…).
    client = new S3Client({
      region,
      ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
    });
  }
  return client;
};

// "Chest Pain (final).PDF" -> "chest-pain-final.pdf"
const safeName = (name) => {
  const ext = path.extname(name || '').toLowerCase();
  const base = path
    .basename(name || 'file', path.extname(name || ''))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return (base || 'file') + ext;
};

const publicUrl = (key) => `${config.s3.publicUrl}/${key.split('/').map(encodeURIComponent).join('/')}`;

// Upload one multer file (memory storage) to <folder>/<yyyy>/<mm>/<random>-<name>.
// Returns what the caller stores: { key, url, name, size, mimeType, folder }.
const uploadFile = async (file, folder = DEFAULT_MEDIA_FOLDER) => {
  const rules = MEDIA_FOLDERS[folder];
  if (!rules) throw new ApiError(httpStatus.BAD_REQUEST, `Unknown media folder "${folder}"`);
  if (!file || !file.buffer || !file.size) throw new ApiError(httpStatus.BAD_REQUEST, 'Choose a file to upload.');

  const ext = path.extname(file.originalname || '').toLowerCase();
  const contentType = rules.types[ext];
  if (!contentType) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Unsupported file type. Allowed: ${Object.keys(rules.types).join(', ')}`);
  }
  if (file.size > rules.maxBytes) {
    throw new ApiError(httpStatus.PAYLOAD_TOO_LARGE, `File exceeds the ${Math.round(rules.maxBytes / 1048576)} MB limit.`);
  }

  const now = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const key = `${folder}/${now.getUTCFullYear()}/${month}/${crypto.randomUUID()}-${safeName(file.originalname)}`;

  try {
    await s3().send(
      new PutObjectCommand({
        Bucket: config.s3.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: contentType,
        ContentDisposition: `inline; filename="${safeName(file.originalname)}"`,
      })
    );
  } catch (error) {
    const reason = error && (error.name || error.Code) ? ` (${error.name || error.Code})` : '';
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, `Could not store the file in S3${reason}.`);
  }

  return {
    key,
    url: publicUrl(key),
    name: file.originalname,
    size: file.size,
    mimeType: contentType,
    folder,
  };
};

// Best-effort delete (e.g. an upload that was replaced); never throws.
const deleteFile = async (key) => {
  if (!key) return false;
  try {
    await s3().send(new DeleteObjectCommand({ Bucket: config.s3.bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
};

module.exports = { uploadFile, deleteFile, publicUrl, safeName };

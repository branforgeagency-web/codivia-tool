const { publicUrl } = require('../services/media.service');

// chart.clinical with a URL on each attached Media file (only the S3 key is stored), so the
// workspace and the admin form can show the scan / photo. Returns clinical unchanged otherwise.
const withMediaUrls = (clinical) => {
  if (!clinical || !Array.isArray(clinical.media)) return clinical;
  return {
    ...clinical,
    media: clinical.media.map((m) => (m.file && m.file.key ? { ...m, file: { ...m.file, url: publicUrl(m.file.key) } } : m)),
  };
};

module.exports = { withMediaUrls };

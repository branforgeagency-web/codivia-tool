const requestMeta = (req) => ({ ip: req.ip, userAgent: (req.get('user-agent') || '').slice(0, 300) });

module.exports = requestMeta;

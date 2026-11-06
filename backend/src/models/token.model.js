const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const { ObjectId } = mongoose.Schema.Types;

// Refresh tokens only. The raw token is never stored, just its sha256 hash.
const tokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true, unique: true, private: true },
    user: { type: ObjectId, ref: 'User', required: true, index: true },
    family: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    replacedByHash: { type: String, default: null, private: true },
    createdByIp: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: true }
);

// MongoDB removes expired tokens on its own.
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
tokenSchema.plugin(toJSON);

module.exports = mongoose.model('Token', tokenSchema);

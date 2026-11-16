const { ReferenceList } = require('../models');
const ApiError = require('../utils/ApiError');
const httpStatus = require('../utils/httpStatus');

// Reference lists for the coding workspace and the admin upload, from the `referencelists`
// collection. They change rarely, so they are cached briefly in memory.
const CACHE_TTL_MS = 5 * 60 * 1000;
let cache = null;
let loadedAt = 0;

const loadAll = async () => {
  if (cache && Date.now() - loadedAt < CACHE_TTL_MS) return cache;
  const rows = await ReferenceList.find().sort({ order: 1 }).lean();
  const lists = Object.fromEntries(rows.map((r) => [r._id, r.items]));
  // Never cache "not seeded yet", so seeding takes effect without a restart.
  if (rows.length) {
    cache = lists;
    loadedAt = Date.now();
  }
  return lists;
};

// { workTypes: [...], poa: [...], dispositions: [...], ... }
const getWorkQueueReference = async () => {
  const lists = await loadAll();
  if (!Object.keys(lists).length) {
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE || 503, 'Reference lists are not set up yet (run npm run seed:reference)');
  }
  return lists;
};

// One list's items ([] if it does not exist).
const getList = async (key) => (await loadAll())[key] || [];
const hasValue = async (key, value) => (await getList(key)).some((i) => i.value === value);

const clearCache = () => {
  cache = null;
};

module.exports = { getWorkQueueReference, getList, hasValue, clearCache };

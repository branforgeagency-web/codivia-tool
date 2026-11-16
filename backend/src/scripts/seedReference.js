// Seeds the reference lists the coding workspace and admin upload use (dispositions, POA, E/M levels,
// modifiers, MS-DRGs, remit codes, defer reasons, transfer queues …) into `referencelists`.
// Safe to re-run: each list is replaced by key.
//
// Usage: npm run seed:reference
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { ReferenceList } = require('../models');
const lists = require('../data/workQueueReference.data');

const seed = async () => {
  await connectDB();
  for (const list of lists) {
    await ReferenceList.findOneAndReplace({ _id: list._id }, list, { upsert: true, runValidators: true });
    console.log(`${list._id}: ${list.items.length} items`);
  }
  console.log(`Seeded ${lists.length} reference lists.`);
};

seed()
  .then(() => mongoose.disconnect())
  .catch(async (err) => {
    console.error(err);
    await mongoose.disconnect();
    process.exit(1);
  });

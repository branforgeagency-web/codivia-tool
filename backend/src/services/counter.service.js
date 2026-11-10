const { Counter } = require('../models');

// Atomic, so two sign-ups at the same moment never get the same number.
const nextSequence = async (name) => {
  const counter = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  return counter.seq;
};

module.exports = { nextSequence };

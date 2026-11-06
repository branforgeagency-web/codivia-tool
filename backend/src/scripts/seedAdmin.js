const mongoose = require('mongoose');
const connectDB = require('../config/db');
const config = require('../config/config');
const { ROLES } = require('../config/roles');
const { PASSWORD_POLICY, isStrongPassword } = require('../config/passwordPolicy');
const { User } = require('../models');

// Idempotent: does nothing if a user with ADMIN_EMAIL already exists.
const seedAdmin = async ({ name, email, password } = config.seedAdmin) => {
  if (!email || !password) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env');
  if (!isStrongPassword(password)) throw new Error(`ADMIN_PASSWORD: ${PASSWORD_POLICY.message}`);

  if (await User.isEmailTaken(email)) {
    console.log(`Admin already exists: ${email}`);
    return null;
  }
  const admin = await User.create({ name, email, password, role: ROLES.ADMIN });
  console.log(`Admin created: ${admin.email}`);
  return admin;
};

const run = async () => {
  let exitCode = 0;
  try {
    await connectDB();
    await seedAdmin();
  } catch (err) {
    console.error(`Seeding failed:\n${err.message}`);
    exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
  process.exit(exitCode);
};

if (require.main === module) run();

module.exports = { seedAdmin };

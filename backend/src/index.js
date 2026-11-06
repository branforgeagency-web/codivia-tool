const mongoose = require('mongoose');
const app = require('./app');
const config = require('./config/config');
const connectDB = require('./config/db');

let server;

const start = async () => {
  try {
    await connectDB();
    server = app.listen(config.port, () => {
      console.log(`Server running on http://localhost:${config.port} (${config.env})`);
    });
  } catch (err) {
    console.error('Could not start server:', err.message);
    process.exit(1);
  }
};

const shutdown = async (signal) => {
  console.log(`${signal} received, shutting down`);
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.connection.close();
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  shutdown('unhandledRejection');
});

start();

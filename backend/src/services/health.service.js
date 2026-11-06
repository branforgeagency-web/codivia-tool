const mongoose = require('mongoose');

const DB_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

const getStatus = () => {
  const database = DB_STATES[mongoose.connection.readyState] || 'unknown';
  return {
    healthy: database === 'connected',
    status: database === 'connected' ? 'ok' : 'degraded',
    database,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  };
};

module.exports = { getStatus };

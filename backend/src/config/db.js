const mongoose = require('mongoose');
const config = require('./config');

const connectDB = async () => {
  await mongoose.connect(config.mongo.url);
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
};

mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
mongoose.connection.on('error', (err) => console.error('MongoDB error:', err.message));

module.exports = connectDB;

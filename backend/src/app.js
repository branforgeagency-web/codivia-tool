const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const config = require('./config/config');
const routes = require('./routes/v1');
const { notFound, errorConverter, errorHandler } = require('./middlewares/error');

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: config.cors.origins, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use('/api/v1', routes);

app.use(notFound);
app.use(errorConverter);
app.use(errorHandler);

module.exports = app;

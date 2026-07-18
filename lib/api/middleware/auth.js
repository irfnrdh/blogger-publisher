'use strict';

const { getOrCreateApiKey } = require('../../multiconfig');

function apiKeyAuth(req, res, next) {
  const key = req.headers['x-api-key'];
  const validKey = getOrCreateApiKey();
  if (!key || key !== validKey) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing X-API-Key header.' });
  }
  next();
}

module.exports = { apiKeyAuth };

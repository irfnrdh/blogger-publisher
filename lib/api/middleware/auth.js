'use strict';

const crypto = require('crypto');
const { getOrCreateApiKey } = require('../../multiconfig');

function apiKeyAuth(req, res, next) {
  // Allow OAuth callback from Google (they don't have our API Key)
  if (req.originalUrl.startsWith('/api/accounts/_callback')) {
    return next();
  }

  const key = req.headers['x-api-key'];
  const validKey = getOrCreateApiKey();

  // Reject immediately if missing (no timing info leaked for empty key)
  if (!key) {
    return res.status(401).json({ error: 'Unauthorized: Missing X-API-Key header.' });
  }

  // Use timing-safe comparison to prevent timing attacks
  let isValid = false;
  try {
    const keyBuf = Buffer.from(key);
    const validBuf = Buffer.from(validKey);
    // buffers must be same length for timingSafeEqual
    if (keyBuf.length === validBuf.length) {
      isValid = crypto.timingSafeEqual(keyBuf, validBuf);
    }
  } catch (_) {
    isValid = false;
  }

  if (!isValid) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API Key.' });
  }

  next();
}

module.exports = { apiKeyAuth };

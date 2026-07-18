'use strict';

/**
 * Shared auth client builder for all API routes.
 * Single source of truth — avoids duplication across routes.
 */

const { google } = require('googleapis');
const { loadConfig } = require('../../config');
const { getAccountCredentials, saveAccountCredentials } = require('../../multiconfig');

// Cache config at module level — avoid disk read on every request
let _cachedConfig = null;
function getCachedConfig() {
  if (!_cachedConfig) _cachedConfig = loadConfig();
  return _cachedConfig;
}

/**
 * Build an authenticated Google OAuth2 client for a given account.
 * Automatically saves refreshed tokens via the 'tokens' event.
 *
 * @param {string} accountId
 * @param {object} creds - account credentials object with .tokens
 * @param {number} [port=1826] - API server port (for redirect URI)
 * @returns {google.auth.OAuth2}
 */
function buildAuthClient(accountId, creds, port = 1826) {
  const config = getCachedConfig();
  const REDIRECT_URI = `http://localhost:${port}/api/accounts/_callback`;

  const oauth2Client = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    REDIRECT_URI
  );
  oauth2Client.setCredentials(creds.tokens);

  // Auto-save refreshed tokens so sessions never expire silently
  oauth2Client.on('tokens', (newTokens) => {
    const existing = getAccountCredentials(accountId) || {};
    saveAccountCredentials(accountId, {
      tokens: { ...existing.tokens, ...newTokens }
    });
  });

  return oauth2Client;
}

module.exports = { buildAuthClient, getCachedConfig };

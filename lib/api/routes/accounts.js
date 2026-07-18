'use strict';

const express = require('express');
const { google } = require('googleapis');
const {
  listAccounts,
  getAccountCredentials,
  saveAccountCredentials,
  deleteAccount,
  getAccountBlogs,
  saveAccountBlogs,
  accountExists,
} = require('../../multiconfig');
const { loadConfig } = require('../../config');

const router = express.Router();

// Redirect URI yang HARUS didaftarkan di Google Cloud Console:
// http://localhost:1826/api/accounts/_callback
const REDIRECT_URI = 'http://localhost:1826/api/accounts/_callback';

/**
 * Build an authenticated OAuth2 client for a given account.
 * Auto-saves new tokens when access token is refreshed.
 */
function buildAuthClient(accountId, creds) {
  const config = loadConfig();
  const oauth2Client = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    REDIRECT_URI
  );
  oauth2Client.setCredentials(creds.tokens);

  // Auto-save refreshed tokens so they never expire silently
  oauth2Client.on('tokens', (newTokens) => {
    const existing = getAccountCredentials(accountId) || {};
    saveAccountCredentials(accountId, {
      tokens: { ...existing.tokens, ...newTokens }
    });
  });

  return oauth2Client;
}

// GET /api/accounts — list all registered accounts
router.get('/', (req, res) => {
  const accounts = listAccounts().map(id => ({
    accountId: id,
    authorized: (() => {
      const c = getAccountCredentials(id);
      return !!(c && c.tokens && c.tokens.refresh_token);
    })(),
    blogs: getAccountBlogs(id),
  }));
  res.json({ accounts });
});

// POST /api/accounts/:accountId/auth — create account slot AND start OAuth in one step
router.post('/:accountId/auth', async (req, res) => {
  const { accountId } = req.params;
  if (!accountId || !/^[a-zA-Z0-9_-]+$/.test(accountId)) {
    return res.status(400).json({ error: 'accountId must be alphanumeric (a-z, 0-9, _, -).' });
  }

  const config = loadConfig();
  if (!config.clientId || !config.clientSecret) {
    return res.status(500).json({
      error: 'CLIENT_ID and CLIENT_SECRET not configured.',
      hint: 'Run "blogger-publisher auth" first to set up global credentials.',
    });
  }

  const oauth2Client = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    REDIRECT_URI
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/blogger',
      'https://www.googleapis.com/auth/drive.file',
    ],
    prompt: 'consent',
    state: accountId,
  });

  // Pre-create the account slot
  if (!accountExists(accountId)) {
    saveAccountCredentials(accountId, { status: 'pending_auth' });
  }

  res.json({
    accountId,
    status: 'pending_auth',
    authUrl,
    instructions: [
      '1. Make sure this URL is in your Google Cloud Console authorized redirect URIs:',
      `   ${REDIRECT_URI}`,
      '2. Open authUrl in your browser.',
      '3. Log in with the Google account you want to authorize.',
      '4. The callback will automatically save credentials.',
    ],
  });
});

// POST /api/accounts — kept for backward compat, redirects to /:id/auth pattern
router.post('/', (req, res) => {
  const { accountId } = req.body;
  if (!accountId) return res.status(400).json({ error: 'accountId is required.' });
  res.json({
    message: `Use POST /api/accounts/${accountId}/auth to authorize this account.`,
    hint: 'Account creation and auth are combined into a single step.',
  });
});

// GET /api/accounts/_callback — OAuth2 callback handler
router.get('/_callback', async (req, res) => {
  const { code, state: accountId } = req.query;
  if (!code || !accountId) {
    return res.status(400).send('Missing code or state parameter.');
  }

  const config = loadConfig();
  const oauth2Client = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    REDIRECT_URI
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Fetch and cache all blogs for this account
    const blogger = google.blogger({ version: 'v3', auth: oauth2Client });
    const blogsRes = await blogger.blogs.listByUser({ userId: 'self' });
    const blogs = (blogsRes.data.items || []).map(b => ({
      blogId: b.id,
      name: b.name,
      url: b.url,
    }));

    saveAccountCredentials(accountId, { tokens });
    saveAccountBlogs(accountId, blogs);

    res.send(`
      <html><body style="font-family:sans-serif;text-align:center;padding:40px">
        <h2>✅ Account "${accountId}" authorized!</h2>
        <p>Found <strong>${blogs.length}</strong> blog(s):</p>
        <ul style="text-align:left;display:inline-block">
          ${blogs.map(b => `<li><strong>${b.name}</strong> — <a href="${b.url}">${b.url}</a></li>`).join('')}
        </ul>
        <p style="color:green">Credentials saved. You can close this tab.</p>
      </body></html>
    `);
  } catch (err) {
    res.status(500).send(`<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>❌ OAuth Error</h2><p>${err.message}</p><p><strong>Hint:</strong> Make sure <code>${REDIRECT_URI}</code> is registered in your Google Cloud Console OAuth client.</p></body></html>`);
  }
});

// DELETE /api/accounts/:accountId — remove an account and all its data
router.delete('/:accountId', (req, res) => {
  const { accountId } = req.params;
  if (accountId === '_callback') return res.status(400).json({ error: 'Invalid accountId.' });
  const deleted = deleteAccount(accountId);
  if (!deleted) return res.status(404).json({ error: `Account "${accountId}" not found.` });
  res.json({ accountId, status: 'deleted' });
});

// GET /api/accounts/:accountId/blogs — return cached blog list
router.get('/:accountId/blogs', (req, res) => {
  const { accountId } = req.params;
  if (!accountExists(accountId)) return res.status(404).json({ error: `Account "${accountId}" not found.` });

  const creds = getAccountCredentials(accountId);
  if (!creds || !creds.tokens) {
    return res.status(401).json({
      error: `Account "${accountId}" not authorized yet.`,
      hint: `Call POST /api/accounts/${accountId}/auth to start the OAuth flow.`
    });
  }

  const blogs = getAccountBlogs(accountId);
  res.json({ accountId, blogs });
});

// POST /api/accounts/:accountId/blogs/refresh — re-fetch blog list from Google
router.post('/:accountId/blogs/refresh', async (req, res) => {
  const { accountId } = req.params;
  if (!accountExists(accountId)) return res.status(404).json({ error: `Account "${accountId}" not found.` });

  const creds = getAccountCredentials(accountId);
  if (!creds || !creds.tokens) {
    return res.status(401).json({ error: `Account "${accountId}" not authorized.` });
  }

  try {
    const authClient = buildAuthClient(accountId, creds);
    const blogger = google.blogger({ version: 'v3', auth: authClient });
    const blogsRes = await blogger.blogs.listByUser({ userId: 'self' });
    const blogs = (blogsRes.data.items || []).map(b => ({
      blogId: b.id, name: b.name, url: b.url,
    }));
    saveAccountBlogs(accountId, blogs);
    res.json({ accountId, blogs, refreshed: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

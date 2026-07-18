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

// GET /api/accounts — list all registered accounts
router.get('/', (req, res) => {
  const accounts = listAccounts().map(id => ({
    accountId: id,
    hasCredentials: !!getAccountCredentials(id),
    blogs: getAccountBlogs(id),
  }));
  res.json({ accounts });
});

// POST /api/accounts — register a new account slot
router.post('/', (req, res) => {
  const { accountId } = req.body;
  if (!accountId || !/^[a-zA-Z0-9_-]+$/.test(accountId)) {
    return res.status(400).json({ error: 'accountId is required and must be alphanumeric.' });
  }
  if (accountExists(accountId)) {
    return res.status(409).json({ error: `Account "${accountId}" already exists.` });
  }
  // Create empty credentials placeholder
  saveAccountCredentials(accountId, { status: 'pending_auth' });
  res.json({ accountId, status: 'created', message: `Call POST /api/accounts/${accountId}/auth to start OAuth flow.` });
});

// DELETE /api/accounts/:accountId — remove an account
router.delete('/:accountId', (req, res) => {
  const { accountId } = req.params;
  const deleted = deleteAccount(accountId);
  if (!deleted) return res.status(404).json({ error: `Account "${accountId}" not found.` });
  res.json({ accountId, status: 'deleted' });
});

// POST /api/accounts/:accountId/auth — trigger OAuth flow for this account
router.post('/:accountId/auth', async (req, res) => {
  const { accountId } = req.params;
  const config = loadConfig();

  if (!config.clientId || !config.clientSecret) {
    return res.status(500).json({
      error: 'CLIENT_ID and CLIENT_SECRET not configured. Run "blogger-publisher auth" first to set up global config.'
    });
  }

  const oauth2Client = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    'http://localhost:1826/api/accounts/_callback'
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/blogger', 'https://www.googleapis.com/auth/drive.file'],
    prompt: 'consent',
    state: accountId,
  });

  res.json({
    accountId,
    authUrl,
    message: 'Open authUrl in browser to authorize this account. The callback will auto-save credentials.',
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
    'http://localhost:1826/api/accounts/_callback'
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Fetch list of blogs for this account and cache them
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
        <h2>✅ Account "${accountId}" authorized successfully!</h2>
        <p>Found ${blogs.length} blog(s).</p>
        <ul style="text-align:left;display:inline-block">${blogs.map(b => `<li>${b.name} — ${b.url}</li>`).join('')}</ul>
        <p>You can close this tab.</p>
      </body></html>
    `);
  } catch (err) {
    res.status(500).send(`<html><body><h2>❌ OAuth Error: ${err.message}</h2></body></html>`);
  }
});

// GET /api/accounts/:accountId/blogs — list blogs for account
router.get('/:accountId/blogs', async (req, res) => {
  const { accountId } = req.params;
  if (!accountExists(accountId)) return res.status(404).json({ error: `Account "${accountId}" not found.` });

  const creds = getAccountCredentials(accountId);
  if (!creds || creds.status === 'pending_auth') {
    return res.status(401).json({ error: `Account "${accountId}" not authorized yet. Call POST /api/accounts/${accountId}/auth` });
  }

  // Return cached blogs; optionally refresh
  const blogs = getAccountBlogs(accountId);
  res.json({ accountId, blogs });
});

module.exports = router;

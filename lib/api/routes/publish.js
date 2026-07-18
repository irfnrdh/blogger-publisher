'use strict';

const express = require('express');
const { google } = require('googleapis');
const { BloggerPublisherCore } = require('../../sdk/core');
const { getAccountCredentials, accountExists } = require('../../multiconfig');
const { loadConfig } = require('../../config');

const router = express.Router();

function buildAuthClient(creds) {
  const config = loadConfig();
  const oauth2Client = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    'http://localhost:1826/api/accounts/_callback'
  );
  oauth2Client.setCredentials(creds.tokens);
  return oauth2Client;
}

// POST /api/publish — publish a single file (with SSE stream for progress)
router.post('/', async (req, res) => {
  const { accountId, blogId, filePath } = req.body;

  if (!accountId || !blogId || !filePath) {
    return res.status(400).json({ error: 'accountId, blogId, and filePath are required.' });
  }
  if (!accountExists(accountId)) {
    return res.status(404).json({ error: `Account "${accountId}" not found.` });
  }

  const creds = getAccountCredentials(accountId);
  if (!creds || creds.status === 'pending_auth') {
    return res.status(401).json({ error: `Account "${accountId}" not authorized. Run auth flow first.` });
  }

  // Set up SSE for real-time progress streaming to Pro Dashboard
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const authClient = buildAuthClient(creds);
    const publisher = new BloggerPublisherCore({ authClient, blogId });

    publisher.on('progress', (event) => send(event));

    const result = await publisher.publishFile(filePath);

    send({ type: 'complete', result });
    res.end();
  } catch (err) {
    send({ type: 'error', message: err?.response?.data?.error?.message || err.message });
    res.end();
  }
});

// POST /api/publish/bulk — publish all .md files in a directory
router.post('/bulk', async (req, res) => {
  const { accountId, blogId, targetDir } = req.body;

  if (!accountId || !blogId || !targetDir) {
    return res.status(400).json({ error: 'accountId, blogId, and targetDir are required.' });
  }
  if (!accountExists(accountId)) {
    return res.status(404).json({ error: `Account "${accountId}" not found.` });
  }

  const creds = getAccountCredentials(accountId);
  if (!creds || creds.status === 'pending_auth') {
    return res.status(401).json({ error: `Account "${accountId}" not authorized.` });
  }

  // SSE stream
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const authClient = buildAuthClient(creds);
    const publisher = new BloggerPublisherCore({ authClient, blogId });

    publisher.on('progress', (event) => send(event));

    const result = await publisher.publishDirectory(targetDir);

    send({ type: 'complete', result });
    res.end();
  } catch (err) {
    send({ type: 'error', message: err?.response?.data?.error?.message || err.message });
    res.end();
  }
});

module.exports = router;

'use strict';

const express = require('express');
const { google } = require('googleapis');
const { BloggerPublisherCore } = require('../../sdk/core');
const { getAccountCredentials, accountExists } = require('../../multiconfig');
const { buildAuthClient } = require('../helpers/auth-client');
const { validatePath } = require('../helpers/validate-path');

const router = express.Router();

// POST /api/publish — publish a single file (with SSE stream for progress)
router.post('/', async (req, res) => {
  const { accountId, blogId, filePath } = req.body;

  if (!accountId || !blogId || !filePath) {
    return res.status(400).json({ error: 'accountId, blogId, and filePath are required.' });
  }

  const pathCheck = validatePath(filePath, 'file');
  if (!pathCheck.valid) {
    return res.status(400).json({ error: pathCheck.error });
  }
  const safeFilePath = pathCheck.resolved;

  if (!accountExists(accountId)) {
    return res.status(404).json({ error: `Account "${accountId}" not found.` });
  }

  const creds = getAccountCredentials(accountId);
  if (!creds || !creds.tokens) {
    return res.status(401).json({ error: `Account "${accountId}" not authorized. Call POST /api/accounts/${accountId}/auth first.` });
  }

  // Set up SSE for real-time progress streaming to Pro Dashboard
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let clientConnected = true;
  req.on('close', () => {
    clientConnected = false;
  });

  const send = (data) => {
    if (clientConnected) {
      try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch (_) {}
    }
  };

  try {
    const authClient = buildAuthClient(accountId, creds, req.socket.localPort);
    const publisher = new BloggerPublisherCore({ authClient, blogId });

    publisher.on('progress', (event) => send(event));

    const result = await publisher.publishFile(safeFilePath);

    send({ type: 'complete', result });
    if (clientConnected) res.end();
  } catch (err) {
    send({ type: 'error', message: err?.response?.data?.error?.message || err.message });
    if (clientConnected) res.end();
  }
});

// POST /api/publish/bulk — publish all .md files in a directory
router.post('/bulk', async (req, res) => {
  const { accountId, blogId, targetDir } = req.body;

  if (!accountId || !blogId || !targetDir) {
    return res.status(400).json({ error: 'accountId, blogId, and targetDir are required.' });
  }

  const pathCheck = validatePath(targetDir, 'directory');
  if (!pathCheck.valid) {
    return res.status(400).json({ error: pathCheck.error });
  }
  const safeTargetDir = pathCheck.resolved;

  if (!accountExists(accountId)) {
    return res.status(404).json({ error: `Account "${accountId}" not found.` });
  }

  const creds = getAccountCredentials(accountId);
  if (!creds || !creds.tokens) {
    return res.status(401).json({ error: `Account "${accountId}" not authorized. Call POST /api/accounts/${accountId}/auth first.` });
  }

  // SSE stream
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let clientConnected = true;
  req.on('close', () => {
    clientConnected = false;
  });

  const send = (data) => {
    if (clientConnected) {
      try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch (_) {}
    }
  };

  try {
    const authClient = buildAuthClient(accountId, creds, req.socket.localPort);
    const publisher = new BloggerPublisherCore({ authClient, blogId });

    publisher.on('progress', (event) => send(event));

    const result = await publisher.publishDirectory(safeTargetDir);

    send({ type: 'complete', result });
    if (clientConnected) res.end();
  } catch (err) {
    send({ type: 'error', message: err?.response?.data?.error?.message || err.message });
    if (clientConnected) res.end();
  }
});

module.exports = router;

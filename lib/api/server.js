'use strict';

const express = require('express');
const { getOrCreateApiKey } = require('../multiconfig');
const { apiKeyAuth } = require('./middleware/auth');
const accountsRouter = require('./routes/accounts');
const publishRouter = require('./routes/publish');
const { router: schedulesRouter, restoreSchedules } = require('./routes/schedules');
const pkg = require('../../package.json');

const DEFAULT_PORT = 1826;

function createApiServer() {
  const app = express();

  // ── Middleware ──────────────────────────────────────────────────────────────
  app.use(express.json());

  // CORS: localhost only
  app.use((req, res, next) => {
    const origin = req.headers.origin || '';
    if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  // ── Public routes (no auth required) ───────────────────────────────────────
  app.get('/api/status', (req, res) => {
    res.json({
      name: 'blogger-publisher Local API',
      version: pkg.version,
      status: 'running',
      port: DEFAULT_PORT,
      docs: `http://localhost:${DEFAULT_PORT}/api/status`,
    });
  });

  // ── Protected routes (API key required) ────────────────────────────────────
  app.use('/api/accounts', apiKeyAuth, accountsRouter);
  app.use('/api/publish', apiKeyAuth, publishRouter);
  app.use('/api/schedules', apiKeyAuth, schedulesRouter);

  // ── 404 handler ────────────────────────────────────────────────────────────
  app.use((req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
  });

  // ── Global error handler ───────────────────────────────────────────────────
  app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    console.error('[API Error]', err.message);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  });

  return app;
}

function startApiServer(port = DEFAULT_PORT) {
  const app = createApiServer();
  const apiKey = getOrCreateApiKey();

  // Restore persisted schedules on boot
  restoreSchedules();

  // Bind to localhost only — not accessible from external network
  const server = app.listen(port, '127.0.0.1', () => {
    console.log('');
    console.log('┌─────────────────────────────────────────────────┐');
    console.log('│    🚀  Blogger Publisher — Local API Server      │');
    console.log('├─────────────────────────────────────────────────┤');
    console.log(`│  URL     : http://localhost:${port}               │`);
    console.log(`│  Version : v${pkg.version}                               │`);
    console.log('├─────────────────────────────────────────────────┤');
    console.log(`│  🔑 API Key: ${apiKey.substring(0, 20)}...     │`);
    console.log('│  (Full key saved at ~/.blogger-publisher/api.key)│');
    console.log('└─────────────────────────────────────────────────┘');
    console.log('');
    console.log('  Endpoints:');
    console.log(`  GET    http://localhost:${port}/api/status`);
    console.log(`  GET    http://localhost:${port}/api/accounts`);
    console.log(`  POST   http://localhost:${port}/api/publish`);
    console.log(`  GET    http://localhost:${port}/api/schedules`);
    console.log('');
    console.log('  Press Ctrl+C to stop.');
    console.log('');
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n⏹️  Shutting down API server...');
    server.close(() => process.exit(0));
  });

  return server;
}

module.exports = { createApiServer, startApiServer, DEFAULT_PORT };

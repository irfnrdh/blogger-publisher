'use strict';

const express = require('express');
const cron = require('node-cron');
const { google } = require('googleapis');
const { BloggerPublisherCore } = require('../../sdk/core');
const {
  addSchedule,
  removeSchedule,
  loadSchedules,
  getAccountCredentials,
  saveAccountCredentials,
  accountExists,
} = require('../../multiconfig');
const { loadConfig } = require('../../config');

const router = express.Router();

const REDIRECT_URI = 'http://localhost:1826/api/accounts/_callback';

// In-memory registry of running cron tasks { scheduleId: cronTask }
const runningTasks = {};

function buildAuthClient(accountId, creds) {
  const config = loadConfig();
  const oauth2Client = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    REDIRECT_URI
  );
  oauth2Client.setCredentials(creds.tokens);

  // Auto-save refreshed tokens
  oauth2Client.on('tokens', (newTokens) => {
    const existing = getAccountCredentials(accountId) || {};
    saveAccountCredentials(accountId, { tokens: { ...existing.tokens, ...newTokens } });
  });

  return oauth2Client;
}

function startScheduleTask(schedule) {
  if (!cron.validate(schedule.cron)) {
    console.warn(`[Scheduler] Invalid cron expression for schedule ${schedule.id}: ${schedule.cron}`);
    return;
  }

  const task = cron.schedule(schedule.cron, async () => {
    console.log(`[Scheduler] Running schedule ${schedule.id}: ${schedule.filePath || schedule.targetDir}`);
    try {
      const creds = getAccountCredentials(schedule.accountId);
      if (!creds || !creds.tokens) {
        console.error(`[Scheduler] Account "${schedule.accountId}" not authorized. Skipping.`);
        return;
      }
      const authClient = buildAuthClient(schedule.accountId, creds);
      const publisher = new BloggerPublisherCore({ authClient, blogId: schedule.blogId });

      publisher.on('progress', (e) => {
        console.log(`[Scheduler][${schedule.id}]`, e.type, e.message || e.file || '');
      });

      if (schedule.targetDir) {
        await publisher.publishDirectory(schedule.targetDir);
      } else {
        await publisher.publishFile(schedule.filePath);
      }
      console.log(`[Scheduler] Schedule ${schedule.id} completed.`);
    } catch (err) {
      console.error(`[Scheduler] Schedule ${schedule.id} failed:`, err.message);
    }
  });

  runningTasks[schedule.id] = task;
  console.log(`[Scheduler] Started schedule ${schedule.id} — cron: "${schedule.cron}"`);
}

function restoreSchedules() {
  const schedules = loadSchedules();
  schedules.forEach(startScheduleTask);
  console.log(`[Scheduler] Restored ${schedules.length} schedule(s).`);
}

// GET /api/schedules — list all schedules + running status
router.get('/', (req, res) => {
  const schedules = loadSchedules().map(s => ({
    ...s,
    isRunning: !!runningTasks[s.id],
  }));
  res.json({ schedules });
});

// GET /api/schedules/running — must be before /:id to avoid route conflict
router.get('/running', (req, res) => {
  const running = Object.keys(runningTasks);
  res.json({ running, count: running.length });
});

// POST /api/schedules — create a new schedule
router.post('/', (req, res) => {
  const { accountId, blogId, filePath, targetDir, cron: cronExpr, label } = req.body;

  if (!accountId || !blogId || !cronExpr) {
    return res.status(400).json({ error: 'accountId, blogId, and cron are required.' });
  }
  if (!filePath && !targetDir) {
    return res.status(400).json({ error: 'Either filePath or targetDir is required.' });
  }
  if (!cron.validate(cronExpr)) {
    return res.status(400).json({ error: `Invalid cron expression: "${cronExpr}"` });
  }
  if (!accountExists(accountId)) {
    return res.status(404).json({ error: `Account "${accountId}" not found.` });
  }

  const creds = getAccountCredentials(accountId);
  if (!creds || !creds.tokens) {
    return res.status(401).json({
      error: `Account "${accountId}" not authorized.`,
      hint: `Call POST /api/accounts/${accountId}/auth first.`
    });
  }

  const schedule = addSchedule({ accountId, blogId, filePath, targetDir, cron: cronExpr, label: label || '' });
  startScheduleTask(schedule);

  res.json({ schedule, isRunning: true });
});

// DELETE /api/schedules/:id — stop and remove a schedule
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  if (runningTasks[id]) {
    runningTasks[id].stop();
    delete runningTasks[id];
  }

  const removed = removeSchedule(id);
  if (!removed) return res.status(404).json({ error: `Schedule "${id}" not found.` });

  res.json({ id, status: 'stopped and removed' });
});

module.exports = { router, restoreSchedules };

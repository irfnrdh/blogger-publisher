'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const BASE_DIR = path.join(os.homedir(), '.blogger-publisher');
const ACCOUNTS_DIR = path.join(BASE_DIR, 'accounts');
const API_KEY_FILE = path.join(BASE_DIR, 'api.key');
const SCHEDULES_FILE = path.join(BASE_DIR, 'schedules.json');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ─── API Key ──────────────────────────────────────────────────────────────────

function getOrCreateApiKey() {
  ensureDir(BASE_DIR);
  if (fs.existsSync(API_KEY_FILE)) {
    return fs.readFileSync(API_KEY_FILE, 'utf8').trim();
  }
  const key = 'bp_' + crypto.randomBytes(24).toString('hex');
  fs.writeFileSync(API_KEY_FILE, key, { mode: 0o600 });
  return key;
}

// ─── Accounts ─────────────────────────────────────────────────────────────────

function listAccounts() {
  ensureDir(ACCOUNTS_DIR);
  return fs.readdirSync(ACCOUNTS_DIR).filter(f => {
    return fs.statSync(path.join(ACCOUNTS_DIR, f)).isDirectory();
  });
}

function getAccountDir(accountId) {
  return path.join(ACCOUNTS_DIR, accountId);
}

function getAccountCredentials(accountId) {
  const credFile = path.join(getAccountDir(accountId), 'credentials.json');
  if (!fs.existsSync(credFile)) return null;
  return JSON.parse(fs.readFileSync(credFile, 'utf8'));
}

function saveAccountCredentials(accountId, credentials) {
  const dir = getAccountDir(accountId);
  ensureDir(dir);
  fs.writeFileSync(
    path.join(dir, 'credentials.json'),
    JSON.stringify(credentials, null, 2),
    { mode: 0o600 }
  );
}

function deleteAccount(accountId) {
  const dir = getAccountDir(accountId);
  if (!fs.existsSync(dir)) return false;
  fs.rmSync(dir, { recursive: true });
  return true;
}

function getAccountBlogs(accountId) {
  const blogsFile = path.join(getAccountDir(accountId), 'blogs.json');
  if (!fs.existsSync(blogsFile)) return [];
  return JSON.parse(fs.readFileSync(blogsFile, 'utf8'));
}

function saveAccountBlogs(accountId, blogs) {
  const dir = getAccountDir(accountId);
  ensureDir(dir);
  fs.writeFileSync(path.join(dir, 'blogs.json'), JSON.stringify(blogs, null, 2));
}

function accountExists(accountId) {
  return fs.existsSync(getAccountDir(accountId));
}

// ─── Schedules ────────────────────────────────────────────────────────────────

function loadSchedules() {
  if (!fs.existsSync(SCHEDULES_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(SCHEDULES_FILE, 'utf8'));
  } catch (_) {
    return [];
  }
}

function saveSchedules(schedules) {
  ensureDir(BASE_DIR);
  fs.writeFileSync(SCHEDULES_FILE, JSON.stringify(schedules, null, 2));
}

function addSchedule(schedule) {
  const schedules = loadSchedules();
  const id = crypto.randomBytes(8).toString('hex');
  const newSchedule = { id, createdAt: new Date().toISOString(), ...schedule };
  schedules.push(newSchedule);
  saveSchedules(schedules);
  return newSchedule;
}

function removeSchedule(id) {
  const schedules = loadSchedules();
  const filtered = schedules.filter(s => s.id !== id);
  if (filtered.length === schedules.length) return false;
  saveSchedules(filtered);
  return true;
}

module.exports = {
  BASE_DIR,
  getOrCreateApiKey,
  listAccounts,
  getAccountDir,
  getAccountCredentials,
  saveAccountCredentials,
  deleteAccount,
  getAccountBlogs,
  saveAccountBlogs,
  accountExists,
  loadSchedules,
  saveSchedules,
  addSchedule,
  removeSchedule,
};

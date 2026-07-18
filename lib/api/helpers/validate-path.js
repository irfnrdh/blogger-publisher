'use strict';

/**
 * Path validation helper for API routes.
 * Prevents path traversal attacks via filePath/targetDir in request body.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

// Allowed base directories for file operations
const ALLOWED_BASE_DIRS = [
  os.homedir(),         // user's home directory
  process.cwd(),        // current working directory
];

/**
 * Validate that a given path is safe to use.
 * Rejects absolute paths outside allowed directories and path traversal attempts.
 *
 * @param {string} inputPath - The path from request body
 * @param {'file'|'directory'} [type='file'] - Expected type
 * @returns {{ valid: boolean, resolved: string, error?: string }}
 */
function validatePath(inputPath, type = 'file') {
  if (!inputPath || typeof inputPath !== 'string') {
    return { valid: false, error: 'Path must be a non-empty string.' };
  }

  // Reject null bytes
  if (inputPath.includes('\0')) {
    return { valid: false, error: 'Path contains invalid characters.' };
  }

  const resolved = path.resolve(inputPath);

  // Check existence first
  if (!fs.existsSync(resolved)) {
    return { valid: false, error: `Path does not exist: ${resolved}` };
  }

  // Resolve symlinks to get actual real path
  let real;
  try {
    real = fs.realpathSync(resolved);
  } catch (err) {
    return { valid: false, error: `Error resolving path: ${err.message}` };
  }

  // Must start with an allowed base dir
  const isAllowed = ALLOWED_BASE_DIRS.some(base => real.startsWith(base + path.sep) || real === base);
  if (!isAllowed) {
    return { valid: false, error: `Path is outside allowed directories: ${real}` };
  }

  // Check type
  const stat = fs.statSync(real);
  if (type === 'file' && !stat.isFile()) {
    return { valid: false, error: `Path is not a file: ${real}` };
  }
  if (type === 'directory' && !stat.isDirectory()) {
    return { valid: false, error: `Path is not a directory: ${real}` };
  }

  return { valid: true, resolved: real };
}

module.exports = { validatePath };

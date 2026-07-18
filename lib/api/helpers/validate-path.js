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

  // Must start with an allowed base dir
  const isAllowed = ALLOWED_BASE_DIRS.some(base => resolved.startsWith(base + path.sep) || resolved === base);
  if (!isAllowed) {
    return { valid: false, error: `Path is outside allowed directories: ${inputPath}` };
  }

  // Check existence
  if (!fs.existsSync(resolved)) {
    return { valid: false, error: `Path does not exist: ${resolved}` };
  }

  // Check type
  const stat = fs.statSync(resolved);
  if (type === 'file' && !stat.isFile()) {
    return { valid: false, error: `Path is not a file: ${resolved}` };
  }
  if (type === 'directory' && !stat.isDirectory()) {
    return { valid: false, error: `Path is not a directory: ${resolved}` };
  }

  return { valid: true, resolved };
}

module.exports = { validatePath };

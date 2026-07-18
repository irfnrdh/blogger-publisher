'use strict';

/**
 * blogger-publisher SDK public entry point.
 *
 * Usage in Pro projects:
 * @example
 * const { BloggerPublisherCore, getAuthClient, loadConfig } = require('blogger-publisher');
 *
 * const config = loadConfig();
 * const auth = getAuthClient(config);
 * const publisher = new BloggerPublisherCore({ authClient: auth, blogId: config.blogId });
 *
 * publisher.on('progress', (e) => console.log(e.type, e.message));
 * const result = await publisher.publishFile('./my-article.md');
 * console.log(result); // { status: 'published', url: 'https://...', postId: '123' }
 */

const { BloggerPublisherCore } = require('./sdk/core');
const { getAuthenticatedClient } = require('./auth');
const { loadConfig } = require('./config');
const { uploadImage } = require('./uploader');
const { createMcpServer } = require('./mcp/server');

module.exports = {
  // Core Publishing SDK
  BloggerPublisherCore,

  // Auth & Config utilities (needed to construct the SDK)
  getAuthClient: getAuthenticatedClient,
  loadConfig,

  // CDN Uploader (usable standalone)
  uploadImage,

  // MCP Server factory
  createMcpServer,
};

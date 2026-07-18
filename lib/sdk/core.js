'use strict';

const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { marked } = require('marked');
const matter = require('gray-matter');
const { globSync } = require('glob');
const crypto = require('crypto');
const { FrontmatterSchema } = require('../schema');
const { uploadImage } = require('../uploader');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * BloggerPublisherCore - The pure SDK class.
 * No console.log, no process.exit, no hardcoded config.
 * All behavior is communicated via Events + structured return data.
 *
 * @example
 * const publisher = new BloggerPublisherCore({ authClient, blogId });
 * publisher.on('progress', (e) => console.log(e.message));
 * const result = await publisher.publishFile('/path/to/article.md');
 */
class BloggerPublisherCore extends EventEmitter {
  /**
   * @param {object} options
   * @param {object} options.authClient - Authenticated Google OAuth2 client.
   * @param {string} options.blogId    - Default Blog ID to publish to.
   * @param {object} [options.hooks]   - Optional lifecycle hooks for Pro features.
   * @param {Function} [options.hooks.beforePublish] - Called with parsed meta before publish.
   * @param {Function} [options.hooks.afterPublish]  - Called with result after publish.
   */
  constructor({ authClient, blogId, hooks = {} }) {
    super();
    if (!authClient) throw new Error('[SDK] authClient is required.');
    if (!blogId) throw new Error('[SDK] blogId is required.');

    this.authClient = authClient;
    this.blogId = blogId;
    this.hooks = hooks;
    this.blogger = google.blogger({ version: 'v3', auth: authClient });
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  _emit(type, data) {
    this.emit('progress', { type, ...data });
  }

  async _processLocalImages(markdownContent, baseDir) {
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const matches = [...markdownContent.matchAll(imageRegex)];
    if (matches.length === 0) return markdownContent;

    let result = '';
    let lastIndex = 0;

    for (const match of matches) {
      const fullMatch = match[0];
      const altText = match[1];
      const imagePath = match[2];

      result += markdownContent.substring(lastIndex, match.index);
      lastIndex = match.index + fullMatch.length;

      if (
        !imagePath.startsWith('http://') &&
        !imagePath.startsWith('https://') &&
        !imagePath.startsWith('data:')
      ) {
        try {
          const decodedPath = decodeURIComponent(imagePath);
          const absoluteImagePath = path.resolve(baseDir, decodedPath);

          let realImagePath;
          try {
            realImagePath = fs.realpathSync(absoluteImagePath);
          } catch (err) {
            this._emit('warn', { message: `Image not found (${imagePath}): ${err.message}` });
            result += fullMatch;
            continue;
          }

          // Security check: cegah path traversal keluar dari baseDir (atau pwd jika tidak ada baseDir)
          const allowedBase = path.resolve(baseDir || process.cwd());
          if (!realImagePath.startsWith(allowedBase + path.sep) && realImagePath !== allowedBase) {
            this._emit('warn', { message: `[SECURITY] Path traversal blocked: ${imagePath}` });
            result += fullMatch;
            continue;
          }

          this._emit('image_upload_start', { imagePath });
          const cdnUrl = await uploadImage(this.authClient, realImagePath);
          this._emit('image_upload_done', { imagePath, cdnUrl });
          result += `![${altText}](${cdnUrl})`;
          continue;
        } catch (err) {
          this._emit('warn', { message: `Image upload skipped (${imagePath}): ${err.message}` });
        }
      }
      result += fullMatch;
    }

    result += markdownContent.substring(lastIndex);
    return result;
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Publish or update a single markdown file to Blogger.
   * @param {string} filePath - Absolute path to the .md file.
   * @param {object} [options]
   * @param {string} [options.blogId] - Override instance blogId.
   * @returns {Promise<PublishResult>}
   */
  async publishFile(filePath, options = {}) {
    const isStdin = filePath === '-';
    
    if (!isStdin) {
      const absolutePath = path.resolve(filePath);
      if (!fs.existsSync(absolutePath)) {
        throw new Error(`File not found: ${absolutePath}`);
      }
      const stat = fs.statSync(absolutePath);
      if (stat.isDirectory()) {
        throw new Error(`Cannot publish directory. Use publishDirectory() instead: ${absolutePath}`);
      }
    }

    const blogId = options.blogId || this.blogId;

    this._emit('start', { file: isStdin ? 'STDIN' : path.basename(filePath) });

    // Read content
    let rawContent = '';
    if (isStdin) {
      const chunks = [];
      for await (const chunk of process.stdin) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      rawContent = Buffer.concat(chunks).toString('utf8');
    } else {
      try {
        rawContent = fs.readFileSync(filePath, 'utf8');
      } catch (err) {
        throw new Error(`Cannot read file: ${filePath} — ${err.message}`);
      }
    }

    // Parse & Validate frontmatter
    let parsed = matter(rawContent);
    const validated = FrontmatterSchema.safeParse(parsed.data);
    if (!validated.success) {
      const issues = validated.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
      throw new Error(`Frontmatter validation failed: ${issues}`);
    }

    let meta = validated.data;

    // ── Lifecycle Hook: beforePublish (Pro extension point) ──
    if (this.hooks.beforePublish) {
      await this.hooks.beforePublish({ meta, filePath, rawContent });
    }

    // Handle delete status
    if (meta.status?.toLowerCase() === 'deleted') {
      if (meta.blogger_id) {
        this._emit('delete_start', { postId: meta.blogger_id });
        try {
          await this.blogger.posts.delete({ blogId, postId: meta.blogger_id });
          this._emit('delete_done', { postId: meta.blogger_id });
        } catch (err) {
          this._emit('warn', { message: `Delete failed (may already be removed): ${err.message}` });
        }
      }
      if (!isStdin) {
        try { fs.unlinkSync(filePath); } catch (err) {
          this._emit('warn', { message: `Could not delete local file: ${err.message}` });
        }
      }
      return { status: 'deleted', file: filePath };
    }

    // Process local images
    rawContent = await this._processLocalImages(rawContent, isStdin ? process.cwd() : path.dirname(filePath));
    parsed = matter(rawContent);
    meta = parsed.data;
    const markdownBody = parsed.content;
    const htmlContent = marked(markdownBody);

    // Build post body
    const title = meta.title || 'Untitled';
    const labels = meta.labels || [];
    const isDraft = meta.status?.toLowerCase() === 'draft';
    const publishedDate = meta.date ? new Date(meta.date).toISOString() : null;

    const postBody = { title, content: htmlContent, labels };
    if (meta.description) postBody.customMetaData = meta.description.substring(0, 150);
    if (publishedDate) postBody.published = publishedDate;

    // Content hash for change detection
    const dataToHash = `${title}|${meta.description || ''}|${meta.slug || ''}|${labels.join(',')}|${markdownBody}|${isDraft}|${publishedDate || ''}`;
    const currentHash = crypto.createHash('md5').update(dataToHash).digest('hex');

    const existingPostId = meta.blogger_id;

    // Update or Insert
    let result;

    if (existingPostId) {
      if (meta.content_hash === currentHash) {
        this._emit('skip', { file: path.basename(filePath), reason: 'No changes detected' });
        return { status: 'skipped', file: filePath, postId: existingPostId };
      }

      this._emit('update_start', { postId: existingPostId, title });
      const response = await this.blogger.posts.patch({
        blogId, postId: existingPostId, requestBody: postBody
      });

      try {
        if (isDraft) {
          await this.blogger.posts.revert({ blogId, postId: existingPostId });
        } else {
          await this.blogger.posts.publish({ blogId, postId: existingPostId });
        }
      } catch (_) { /* already in correct state */ }

      // Update frontmatter in file
      const nowIso = new Date().toISOString();
      if (/^updated_at:\s*/m.test(rawContent)) {
        rawContent = rawContent.replace(/^updated_at:\s*['"]?[^'"]+['"]?/m, `updated_at: "${nowIso}"`);
      } else {
        rawContent = rawContent.replace(/^(blogger_id:\s*['"]?[^'"]+['"]?)/m, `$1\nupdated_at: "${nowIso}"`);
      }
      if (/^content_hash:\s*/m.test(rawContent)) {
        rawContent = rawContent.replace(/^content_hash:\s*['"]?[^'"]+['"]?/m, `content_hash: "${currentHash}"`);
      } else {
        rawContent = rawContent.replace(/^(blogger_id:\s*['"]?[^'"]+['"]?)/m, `$1\ncontent_hash: "${currentHash}"`);
      }

      if (!isStdin) fs.writeFileSync(filePath, rawContent, 'utf8');

      result = { status: 'updated', file: filePath, postId: existingPostId, url: response.data.url };
    } else {
      this._emit('insert_start', { title });
      const initialTitle = meta.slug || title;
      const response = await this.blogger.posts.insert({
        blogId, isDraft, requestBody: { ...postBody, title: initialTitle }
      });

      const newPostId = response.data.id;
      let finalUrl = response.data.url;

      if (meta.slug) {
        const patchRes = await this.blogger.posts.patch({
          blogId, postId: newPostId, requestBody: { title }
        });
        finalUrl = patchRes.data.url;
      }

      let newContent = rawContent.startsWith('---')
        ? rawContent.replace(/^---\r?\n/, `---\nblogger_id: "${newPostId}"\ncontent_hash: "${currentHash}"\n`)
        : `---\nblogger_id: "${newPostId}"\ncontent_hash: "${currentHash}"\n---\n\n${rawContent}`;

      if (!isStdin) fs.writeFileSync(filePath, newContent, 'utf8');

      result = { status: 'published', file: filePath, postId: newPostId, url: finalUrl };
    }

    // ── Lifecycle Hook: afterPublish (Pro extension point) ──
    if (this.hooks.afterPublish) {
      await this.hooks.afterPublish(result);
    }

    this._emit('done', result);
    return result;
  }

  /**
   * Publish all markdown files in a directory.
   * @param {string} targetDir - Path to directory or single .md file.
   * @param {object} [options]
   * @returns {Promise<BulkResult>}
   */
  async publishDirectory(targetDir, options = {}) {
    if (targetDir === '-') {
      const result = await this.publishFile('-', options);
      return { total: 1, results: [result] };
    }

    if (!fs.existsSync(targetDir)) {
      throw new Error(`Target not found: ${targetDir}`);
    }

    const stat = fs.statSync(targetDir);
    let mdFiles = [];

    if (stat.isDirectory()) {
      mdFiles = globSync('**/*.md', { cwd: targetDir, absolute: true });
    } else if (targetDir.endsWith('.md')) {
      mdFiles = [path.resolve(targetDir)];
    }

    if (mdFiles.length === 0) {
      return { total: 0, results: [] };
    }

    this._emit('bulk_start', { total: mdFiles.length });
    const results = [];

    for (let i = 0; i < mdFiles.length; i++) {
      try {
        const result = await this.publishFile(mdFiles[i], options);
        results.push(result);
      } catch (err) {
        this._emit('error', { file: mdFiles[i], message: err.message });
        results.push({ status: 'error', file: mdFiles[i], error: err.message });
      }

      if (i < mdFiles.length - 1) {
        this._emit('delay', { seconds: 3 });
        await delay(3000);
      }
    }

    this._emit('bulk_done', { total: mdFiles.length, results });
    return { total: mdFiles.length, results };
  }
}

module.exports = { BloggerPublisherCore };

/**
 * @typedef {object} PublishResult
 * @property {'published'|'updated'|'skipped'|'deleted'|'error'} status
 * @property {string} file
 * @property {string} [postId]
 * @property {string} [url]
 * @property {string} [error]
 *
 * @typedef {object} BulkResult
 * @property {number} total
 * @property {PublishResult[]} results
 */

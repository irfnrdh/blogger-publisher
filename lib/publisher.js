'use strict';

/**
 * CLI Adapter for BloggerPublisherCore.
 * This file is the backward-compatible wrapper used by bin/cli.js.
 * All core logic now lives in lib/sdk/core.js.
 */

const pc = require('picocolors');
const path = require('path');
const { BloggerPublisherCore } = require('./sdk/core');
const { getAccountCredentials } = require('./multiconfig');
const { buildAuthClient } = require('./api/helpers/auth-client');
const { loadConfig } = require('./config');

// Translates SDK events → colored console.log for Terminal UX
function attachCliLogger(publisher) {
  publisher.on('progress', (e) => {
    switch (e.type) {
      case 'start':
        console.log(`\n========================================`);
        console.log(`📄 Memproses: ${e.file}`);
        break;
      case 'image_upload_start':
        console.log(pc.dim(`   🖼️  Mengupload gambar: ${e.imagePath}...`));
        break;
      case 'image_upload_done':
        console.log(pc.green(`   ✅ Gambar berhasil diupload.`));
        break;
      case 'skip':
        console.log(pc.yellow(`[SKIP] ${e.reason} — ${e.file}`));
        break;
      case 'delete_start':
        console.log(`[DELETE] Menghapus artikel dari Blogger (ID: ${e.postId})...`);
        break;
      case 'delete_done':
        console.log(pc.green(`✅ BERHASIL Dihapus dari Blogger.`));
        break;
      case 'update_start':
        console.log(`[UPDATE] Memperbarui: ${e.title} (ID: ${e.postId})...`);
        break;
      case 'insert_start':
        console.log(`[BARU] Mengunggah artikel baru: ${e.title}...`);
        break;
      case 'done':
        if (e.status === 'published') console.log(pc.green(`✅ BERHASIL Diunggah! URL: ${e.url || 'Draft'}`));
        if (e.status === 'updated')   console.log(pc.green(`✅ BERHASIL Diperbarui: ${e.url || 'Draft'}`));
        if (e.status === 'deleted')   console.log(pc.green(`🗑️  File lokal dan post Blogger dihapus.`));
        break;
      case 'delay':
        console.log(`⏳ Menunggu ${e.seconds} detik agar aman dari pemblokiran API...`);
        break;
      case 'bulk_start':
        console.log(`\nMenemukan ${e.total} file markdown. Memulai proses...\n`);
        break;
      case 'bulk_done':
        console.log(`\n🎉 PROSES BULK SELESAI!`);
        break;
      case 'warn':
        console.warn(pc.yellow(`⚠️  ${e.message}`));
        break;
      case 'error':
        console.error(pc.red(`❌ GAGAL memproses ${path.basename(e.file || '')}: ${e.message}`));
        break;
    }
  });
}

async function runBulkPublisher(targetDir, accountId, customBlogId) {
  if (!accountId) {
    console.error(pc.red('❌ GAGAL: Akun tidak dispesifikasikan. Gunakan flag --account <id>'));
    process.exitCode = 1;
    return;
  }

  const creds = getAccountCredentials(accountId);
  if (!creds) {
    console.error(pc.red(`❌ GAGAL: Kredensial untuk akun '${accountId}' tidak ditemukan. Jalankan 'blogger-publisher auth ${accountId}' terlebih dahulu.`));
    process.exitCode = 1;
    return;
  }

  const authClient = buildAuthClient(accountId, creds);
  const config = loadConfig();
  const blogId = customBlogId || config.blogId;

  if (!blogId) {
    console.error('❌ GAGAL: BLOG_ID tidak ditemukan! Spesifikasikan menggunakan flag --blog atau isi config.');
    process.exitCode = 1;
    return;
  }

  const publisher = new BloggerPublisherCore({ authClient, blogId });
  attachCliLogger(publisher);

  try {
    const result = await publisher.publishDirectory(targetDir);
    return result;
  } catch (err) {
    const msg = err?.response?.data?.error?.message || err?.message || String(err);
    console.error(pc.red(`\n❌ Error: ${msg}`));
    process.exitCode = 1;
  }
}

module.exports = { runBulkPublisher };

'use strict';

const { getAuthenticatedClient } = require('../auth');
const { loadConfig } = require('../config');
const { google } = require('googleapis');

function getBlogger() {
  const auth = getAuthenticatedClient();
  return google.blogger({ version: 'v3', auth });
}

const mcpResources = [
  {
    uri: 'blogger://blogs',
    name: 'Daftar Blog',
    description: 'Daftar semua blog milik akun yang terotentikasi.',
    mimeType: 'application/json',
    handler: async () => {
      const blogger = getBlogger();
      const res = await blogger.blogs.listByUser({ userId: 'self' });
      return JSON.stringify(res.data, null, 2);
    }
  },
  {
    uri: 'blogger://config',
    name: 'Konfigurasi Global',
    description: 'Konfigurasi saat ini dari ~/.blogger-publisher/config.json (tanpa token/secret).',
    mimeType: 'application/json',
    handler: async () => {
      const config = loadConfig();
      // Mask sensitive values
      const safe = {
        blogId: config.blogId,
        imageProvider: config.imageProvider,
        hasClientId: !!config.clientId,
        hasClientSecret: !!config.clientSecret,
        hasRefreshToken: !!config.refreshToken
      };
      return JSON.stringify(safe, null, 2);
    }
  }
];

const mcpPrompts = [
  {
    name: 'create_seo_post',
    description: 'Panduan untuk AI dalam membuat post blog yang SEO-friendly dan menarik.',
    arguments: [
      { name: 'topic', description: 'Topik atau judul artikel yang diinginkan.', required: true },
      { name: 'keywords', description: 'Kata kunci target (dipisahkan koma).', required: false },
      { name: 'tone', description: 'Gaya penulisan (formal, santai, teknis). Default: santai.', required: false }
    ],
    handler: ({ topic, keywords, tone }) => {
      return [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Buatkan sebuah artikel blog SEO-friendly dengan panduan berikut:
- Topik: ${topic}
- Kata kunci target: ${keywords || 'tidak ditentukan'}
- Gaya penulisan: ${tone || 'santai dan informatif'}

Struktur artikel:
1. Judul yang menarik dan mengandung kata kunci utama
2. Meta deskripsi (max 160 karakter)
3. Pendahuluan yang hook (100-150 kata)
4. 3-5 subjudul (H2) yang relevan dengan isi yang padat
5. Kesimpulan + CTA (Call to Action)
6. Saran label/tag untuk Blogger

Format output sebagai Markdown dengan frontmatter YAML:
\`\`\`
---
title: "..."
description: "..."
labels: [...]
status: "draft"
---
isi artikel...
\`\`\``
          }
        }
      ];
    }
  },
  {
    name: 'moderate_comments',
    description: 'Panduan untuk AI dalam memoderasi komentar blog secara cerdas.',
    arguments: [
      { name: 'blog_id', description: 'ID Blog yang komentarnya ingin dimoderasi.', required: true }
    ],
    handler: ({ blog_id }) => {
      return [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Lakukan moderasi komentar untuk blog ID: ${blog_id}.

Langkah-langkah:
1. Panggil tool \`list_all_comments\` dengan status "pending" untuk melihat semua komentar yang menunggu.
2. Untuk setiap komentar, analisa apakah:
   - Relevan dan sopan → gunakan \`approve_comment\`
   - Berisi link spam atau kata-kata promosi berlebihan → gunakan \`mark_comment_spam\`
   - Berisi ujaran kebencian atau konten berbahaya → gunakan \`delete_comment\`
3. Buat laporan ringkasan: berapa yang disetujui, ditandai spam, dan dihapus.`
          }
        }
      ];
    }
  },
  {
    name: 'blog_audit',
    description: 'Panduan untuk AI dalam mengaudit kesehatan konten sebuah blog.',
    arguments: [
      { name: 'blog_id', description: 'ID Blog yang akan diaudit.', required: true }
    ],
    handler: ({ blog_id }) => {
      return [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Lakukan audit konten blog ID: ${blog_id}.

Panduan audit:
1. Panggil \`get_blog_info\` untuk mendapatkan statistik dasar.
2. Panggil \`list_posts\` (status: live) untuk melihat post yang dipublish.
3. Panggil \`list_posts\` (status: draft) untuk melihat post draft yang belum dipublish.
4. Buat laporan audit yang mencakup:
   - Total post (published vs draft)
   - Estimasi frekuensi posting
   - 3 post terbaru beserta judulnya
   - Rekomendasi untuk meningkatkan konsistensi posting`
          }
        }
      ];
    }
  }
];

module.exports = { mcpResources, mcpPrompts };

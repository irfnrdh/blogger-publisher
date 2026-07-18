'use strict';

const { getAuthenticatedClient } = require('../../auth');
const { google } = require('googleapis');
const { marked } = require('marked');

function getBlogger() {
  const auth = getAuthenticatedClient();
  return google.blogger({ version: 'v3', auth });
}

const postTools = [
  {
    name: 'list_posts',
    description: 'Daftar semua post di sebuah blog. Bisa difilter berdasarkan status, label, atau query pencarian.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'ID blog.' },
        status: { type: 'string', enum: ['live', 'draft', 'scheduled'], description: 'Filter status post. Default: live.' },
        labels: { type: 'string', description: 'Filter berdasarkan label (dipisahkan koma).' },
        max_results: { type: 'number', description: 'Jumlah maksimum post yang dikembalikan. Default: 20.' },
        page_token: { type: 'string', description: 'Token untuk paginasi halaman berikutnya.' }
      },
      required: ['blog_id']
    },
    handler: async ({ blog_id, status, labels, max_results, page_token }) => {
      const blogger = getBlogger();
      const params = { blogId: blog_id, maxResults: max_results || 20, view: 'ADMIN' };
      if (status) params.status = status;
      if (labels) params.labels = labels;
      if (page_token) params.pageToken = page_token;
      const res = await blogger.posts.list(params);
      return res.data;
    }
  },
  {
    name: 'get_post',
    description: 'Ambil detail lengkap satu post berdasarkan Post ID.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'ID blog.' },
        post_id: { type: 'string', description: 'ID post.' }
      },
      required: ['blog_id', 'post_id']
    },
    handler: async ({ blog_id, post_id }) => {
      const blogger = getBlogger();
      const res = await blogger.posts.get({ blogId: blog_id, postId: post_id, view: 'ADMIN' });
      return res.data;
    }
  },
  {
    name: 'get_post_by_path',
    description: 'Ambil detail post berdasarkan path URL-nya (misal: /2024/01/judul-post.html).',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'ID blog.' },
        path: { type: 'string', description: 'Path URL post.' }
      },
      required: ['blog_id', 'path']
    },
    handler: async ({ blog_id, path }) => {
      const blogger = getBlogger();
      const res = await blogger.posts.getByPath({ blogId: blog_id, path });
      return res.data;
    }
  },
  {
    name: 'search_posts',
    description: 'Cari post di sebuah blog berdasarkan kata kunci.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'ID blog.' },
        query: { type: 'string', description: 'Kata kunci pencarian.' },
        max_results: { type: 'number', description: 'Jumlah hasil maksimum. Default: 10.' }
      },
      required: ['blog_id', 'query']
    },
    handler: async ({ blog_id, query, max_results }) => {
      const blogger = getBlogger();
      const res = await blogger.posts.search({ blogId: blog_id, q: query, maxResults: max_results || 10 });
      return res.data;
    }
  },
  {
    name: 'create_post',
    description: 'Buat post baru di sebuah blog. Konten bisa berupa Markdown atau HTML langsung.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'ID blog tujuan.' },
        title: { type: 'string', description: 'Judul post.' },
        content: { type: 'string', description: 'Isi konten dalam format Markdown atau HTML.' },
        labels: { type: 'array', items: { type: 'string' }, description: 'Label/tag untuk post.' },
        is_draft: { type: 'boolean', description: 'Jika true, post disimpan sebagai draft. Default: false (langsung publish).' },
        is_markdown: { type: 'boolean', description: 'Jika true, konten akan di-convert dari Markdown ke HTML. Default: true.' }
      },
      required: ['blog_id', 'title', 'content']
    },
    handler: async ({ blog_id, title, content, labels, is_draft, is_markdown }) => {
      const blogger = getBlogger();
      const htmlContent = (is_markdown !== false) ? marked(content) : content;
      const res = await blogger.posts.insert({
        blogId: blog_id,
        isDraft: is_draft !== false ? true : false,
        requestBody: { title, content: htmlContent, labels: labels || [] }
      });
      return res.data;
    }
  },
  {
    name: 'update_post',
    description: 'Perbarui judul, konten, atau label sebuah post yang sudah ada.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'ID blog.' },
        post_id: { type: 'string', description: 'ID post yang akan diperbarui.' },
        title: { type: 'string', description: 'Judul baru (opsional).' },
        content: { type: 'string', description: 'Konten baru dalam Markdown atau HTML (opsional).' },
        labels: { type: 'array', items: { type: 'string' }, description: 'Label baru (opsional, menggantikan label lama).' },
        is_markdown: { type: 'boolean', description: 'Jika true, konten di-convert dari Markdown. Default: true.' }
      },
      required: ['blog_id', 'post_id']
    },
    handler: async ({ blog_id, post_id, title, content, labels, is_markdown }) => {
      const blogger = getBlogger();
      const body = {};
      if (title) body.title = title;
      if (content) body.content = (is_markdown !== false) ? marked(content) : content;
      if (labels) body.labels = labels;
      const res = await blogger.posts.patch({ blogId: blog_id, postId: post_id, requestBody: body });
      return res.data;
    }
  },
  {
    name: 'publish_post',
    description: 'Publikasikan sebuah post yang berstatus draft ke publik.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'ID blog.' },
        post_id: { type: 'string', description: 'ID post yang akan dipublikasikan.' }
      },
      required: ['blog_id', 'post_id']
    },
    handler: async ({ blog_id, post_id }) => {
      const blogger = getBlogger();
      const res = await blogger.posts.publish({ blogId: blog_id, postId: post_id });
      return res.data;
    }
  },
  {
    name: 'revert_post',
    description: 'Kembalikan sebuah post yang sudah publish menjadi draft.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'ID blog.' },
        post_id: { type: 'string', description: 'ID post yang akan dikembalikan ke draft.' }
      },
      required: ['blog_id', 'post_id']
    },
    handler: async ({ blog_id, post_id }) => {
      const blogger = getBlogger();
      const res = await blogger.posts.revert({ blogId: blog_id, postId: post_id });
      return res.data;
    }
  },
  {
    name: 'delete_post',
    description: 'Hapus sebuah post secara permanen dari blog.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'ID blog.' },
        post_id: { type: 'string', description: 'ID post yang akan dihapus.' }
      },
      required: ['blog_id', 'post_id']
    },
    handler: async ({ blog_id, post_id }) => {
      const blogger = getBlogger();
      await blogger.posts.delete({ blogId: blog_id, postId: post_id });
      return { success: true, message: `Post ${post_id} berhasil dihapus dari blog ${blog_id}.` };
    }
  }
];

module.exports = { postTools };

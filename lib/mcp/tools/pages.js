'use strict';

const { getAuthenticatedClient } = require('../../auth');
const { google } = require('googleapis');

function getBlogger() {
  const auth = getAuthenticatedClient();
  return google.blogger({ version: 'v3', auth });
}

const pageTools = [
  {
    name: 'list_pages',
    description: 'Daftar semua halaman statis (Pages) di sebuah blog.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'ID blog.' },
        status: { type: 'string', enum: ['live', 'draft'], description: 'Filter berdasarkan status halaman.' }
      },
      required: ['blog_id']
    },
    handler: async ({ blog_id, status }) => {
      const blogger = getBlogger();
      const params = { blogId: blog_id, view: 'ADMIN' };
      if (status) params.status = status;
      const res = await blogger.pages.list(params);
      return res.data;
    }
  },
  {
    name: 'get_page',
    description: 'Ambil detail satu halaman statis berdasarkan Page ID.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'ID blog.' },
        page_id: { type: 'string', description: 'ID halaman.' }
      },
      required: ['blog_id', 'page_id']
    },
    handler: async ({ blog_id, page_id }) => {
      const blogger = getBlogger();
      const res = await blogger.pages.get({ blogId: blog_id, pageId: page_id, view: 'ADMIN' });
      return res.data;
    }
  },
  {
    name: 'create_page',
    description: 'Buat halaman statis baru di blog (misal: halaman Tentang Kami, Kontak, dll.).',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'ID blog.' },
        title: { type: 'string', description: 'Judul halaman.' },
        content: { type: 'string', description: 'Konten halaman dalam format HTML.' },
        is_draft: { type: 'boolean', description: 'Jika true, simpan sebagai draft. Default: false.' }
      },
      required: ['blog_id', 'title', 'content']
    },
    handler: async ({ blog_id, title, content, is_draft }) => {
      const blogger = getBlogger();
      const res = await blogger.pages.insert({
        blogId: blog_id,
        isDraft: is_draft || false,
        requestBody: { title, content }
      });
      return res.data;
    }
  },
  {
    name: 'update_page',
    description: 'Perbarui judul atau konten sebuah halaman statis.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'ID blog.' },
        page_id: { type: 'string', description: 'ID halaman yang akan diperbarui.' },
        title: { type: 'string', description: 'Judul baru (opsional).' },
        content: { type: 'string', description: 'Konten baru dalam HTML (opsional).' }
      },
      required: ['blog_id', 'page_id']
    },
    handler: async ({ blog_id, page_id, title, content }) => {
      const blogger = getBlogger();
      const body = {};
      if (title) body.title = title;
      if (content) body.content = content;
      const res = await blogger.pages.patch({ blogId: blog_id, pageId: page_id, requestBody: body });
      return res.data;
    }
  },
  {
    name: 'publish_page',
    description: 'Publikasikan sebuah halaman statis yang berstatus draft.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'ID blog.' },
        page_id: { type: 'string', description: 'ID halaman yang akan dipublikasikan.' }
      },
      required: ['blog_id', 'page_id']
    },
    handler: async ({ blog_id, page_id }) => {
      const blogger = getBlogger();
      const res = await blogger.pages.publish({ blogId: blog_id, pageId: page_id });
      return res.data;
    }
  },
  {
    name: 'delete_page',
    description: 'Hapus sebuah halaman statis secara permanen.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'ID blog.' },
        page_id: { type: 'string', description: 'ID halaman yang akan dihapus.' }
      },
      required: ['blog_id', 'page_id']
    },
    handler: async ({ blog_id, page_id }) => {
      const blogger = getBlogger();
      await blogger.pages.delete({ blogId: blog_id, pageId: page_id });
      return { success: true, message: `Halaman ${page_id} berhasil dihapus.` };
    }
  }
];

module.exports = { pageTools };

'use strict';

const { getAuthenticatedClient } = require('../../auth');
const { google } = require('googleapis');

function getBlogger() {
  const auth = getAuthenticatedClient();
  return google.blogger({ version: 'v3', auth });
}

const blogTools = [
  {
    name: 'list_blogs',
    description: 'Daftar semua blog yang dimiliki oleh akun Google yang terotentikasi.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    },
    handler: async () => {
      const blogger = getBlogger();
      const res = await blogger.blogs.listByUser({ userId: 'self' });
      return res.data;
    }
  },
  {
    name: 'get_blog',
    description: 'Ambil informasi lengkap satu blog berdasarkan Blog ID.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'ID unik blog di Blogger.' }
      },
      required: ['blog_id']
    },
    handler: async ({ blog_id }) => {
      const blogger = getBlogger();
      const res = await blogger.blogs.get({ blogId: blog_id });
      return res.data;
    }
  },
  {
    name: 'get_blog_by_url',
    description: 'Ambil informasi blog berdasarkan URL blog (misal: https://namaanda.blogspot.com).',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL publik dari blog.' }
      },
      required: ['url']
    },
    handler: async ({ url }) => {
      const blogger = getBlogger();
      const res = await blogger.blogs.getByUrl({ url });
      return res.data;
    }
  },
  {
    name: 'get_blog_info',
    description: 'Ambil statistik dan info mendalam sebuah blog (jumlah post, halaman, komentar).',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'ID unik blog di Blogger.' }
      },
      required: ['blog_id']
    },
    handler: async ({ blog_id }) => {
      const blogger = getBlogger();
      const res = await blogger.blogs.get({ blogId: blog_id, view: 'ADMIN' });
      const blog = res.data;
      return {
        id: blog.id,
        name: blog.name,
        url: blog.url,
        description: blog.description,
        posts: blog.posts,
        pages: blog.pages,
        locale: blog.locale,
        updated: blog.updated
      };
    }
  }
];

module.exports = { blogTools };

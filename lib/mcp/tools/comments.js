'use strict';

const { getAuthenticatedClient } = require('../../auth');
const { google } = require('googleapis');

function getBlogger() {
  const auth = getAuthenticatedClient();
  return google.blogger({ version: 'v3', auth });
}

const commentTools = [
  {
    name: 'list_comments',
    description: 'Daftar semua komentar pada satu post tertentu.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'ID blog.' },
        post_id: { type: 'string', description: 'ID post.' },
        status: { type: 'string', enum: ['live', 'emptied', 'pending', 'spam'], description: 'Filter berdasarkan status komentar.' },
        max_results: { type: 'number', description: 'Jumlah maksimum komentar. Default: 20.' }
      },
      required: ['blog_id', 'post_id']
    },
    handler: async ({ blog_id, post_id, status, max_results }) => {
      const blogger = getBlogger();
      const params = { blogId: blog_id, postId: post_id, maxResults: max_results || 20, view: 'ADMIN' };
      if (status) params.status = status;
      const res = await blogger.comments.list(params);
      return res.data;
    }
  },
  {
    name: 'list_all_comments',
    description: 'Daftar semua komentar dari seluruh post di sebuah blog, termasuk yang menunggu moderasi.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'ID blog.' },
        status: { type: 'string', enum: ['live', 'emptied', 'pending', 'spam'], description: 'Filter berdasarkan status.' },
        max_results: { type: 'number', description: 'Jumlah maksimum. Default: 20.' }
      },
      required: ['blog_id']
    },
    handler: async ({ blog_id, status, max_results }) => {
      const blogger = getBlogger();
      const params = { blogId: blog_id, maxResults: max_results || 20, view: 'ADMIN' };
      if (status) params.status = status;
      const res = await blogger.comments.listByBlog(params);
      return res.data;
    }
  },
  {
    name: 'get_comment',
    description: 'Ambil detail satu komentar berdasarkan Comment ID.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'ID blog.' },
        post_id: { type: 'string', description: 'ID post.' },
        comment_id: { type: 'string', description: 'ID komentar.' }
      },
      required: ['blog_id', 'post_id', 'comment_id']
    },
    handler: async ({ blog_id, post_id, comment_id }) => {
      const blogger = getBlogger();
      const res = await blogger.comments.get({ blogId: blog_id, postId: post_id, commentId: comment_id, view: 'ADMIN' });
      return res.data;
    }
  },
  {
    name: 'approve_comment',
    description: 'Setujui sebuah komentar yang sedang menunggu moderasi agar tampil ke publik.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'ID blog.' },
        post_id: { type: 'string', description: 'ID post.' },
        comment_id: { type: 'string', description: 'ID komentar yang akan disetujui.' }
      },
      required: ['blog_id', 'post_id', 'comment_id']
    },
    handler: async ({ blog_id, post_id, comment_id }) => {
      const blogger = getBlogger();
      const res = await blogger.comments.approve({ blogId: blog_id, postId: post_id, commentId: comment_id });
      return res.data;
    }
  },
  {
    name: 'mark_comment_spam',
    description: 'Tandai sebuah komentar sebagai spam.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'ID blog.' },
        post_id: { type: 'string', description: 'ID post.' },
        comment_id: { type: 'string', description: 'ID komentar yang akan ditandai spam.' }
      },
      required: ['blog_id', 'post_id', 'comment_id']
    },
    handler: async ({ blog_id, post_id, comment_id }) => {
      const blogger = getBlogger();
      const res = await blogger.comments.markAsSpam({ blogId: blog_id, postId: post_id, commentId: comment_id });
      return res.data;
    }
  },
  {
    name: 'delete_comment',
    description: 'Hapus sebuah komentar secara permanen.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'ID blog.' },
        post_id: { type: 'string', description: 'ID post.' },
        comment_id: { type: 'string', description: 'ID komentar yang akan dihapus.' }
      },
      required: ['blog_id', 'post_id', 'comment_id']
    },
    handler: async ({ blog_id, post_id, comment_id }) => {
      const blogger = getBlogger();
      await blogger.comments.delete({ blogId: blog_id, postId: post_id, commentId: comment_id });
      return { success: true, message: `Komentar ${comment_id} berhasil dihapus.` };
    }
  }
];

module.exports = { commentTools };

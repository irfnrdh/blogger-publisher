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
    description: 'List all comments on a specific post.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'The blog ID.' },
        post_id: { type: 'string', description: 'The post ID.' },
        status: { type: 'string', enum: ['live', 'emptied', 'pending', 'spam'], description: 'Filter by comment status.' },
        max_results: { type: 'number', description: 'Maximum number of comments to return. Default: 20.' }
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
    description: 'List all comments across all posts in a blog, including those pending moderation.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'The blog ID.' },
        status: { type: 'string', enum: ['live', 'emptied', 'pending', 'spam'], description: 'Filter by status.' },
        max_results: { type: 'number', description: 'Maximum number of comments. Default: 20.' }
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
    description: 'Get the details of a single comment by its Comment ID.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'The blog ID.' },
        post_id: { type: 'string', description: 'The post ID.' },
        comment_id: { type: 'string', description: 'The comment ID.' }
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
    description: 'Approve a comment that is pending moderation to make it publicly visible.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'The blog ID.' },
        post_id: { type: 'string', description: 'The post ID.' },
        comment_id: { type: 'string', description: 'The ID of the comment to approve.' }
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
    description: 'Mark a comment as spam.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'The blog ID.' },
        post_id: { type: 'string', description: 'The post ID.' },
        comment_id: { type: 'string', description: 'The ID of the comment to mark as spam.' }
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
    description: 'Permanently delete a comment from the blog.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'The blog ID.' },
        post_id: { type: 'string', description: 'The post ID.' },
        comment_id: { type: 'string', description: 'The ID of the comment to delete.' }
      },
      required: ['blog_id', 'post_id', 'comment_id']
    },
    handler: async ({ blog_id, post_id, comment_id }) => {
      const blogger = getBlogger();
      await blogger.comments.delete({ blogId: blog_id, postId: post_id, commentId: comment_id });
      return { success: true, message: `Comment ${comment_id} successfully deleted.` };
    }
  }
];

module.exports = { commentTools };

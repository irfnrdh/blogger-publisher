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
    description: 'List all posts on a blog. Can be filtered by status, labels, or search query.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'The blog ID.' },
        status: { type: 'string', enum: ['live', 'draft', 'scheduled'], description: 'Filter by post status. Default: live.' },
        labels: { type: 'string', description: 'Filter by labels (comma-separated).' },
        max_results: { type: 'number', description: 'Maximum number of posts to return. Default: 20.' },
        page_token: { type: 'string', description: 'Token for fetching the next page of results.' }
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
    description: 'Get the full details of a single post by its Post ID.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'The blog ID.' },
        post_id: { type: 'string', description: 'The post ID.' }
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
    description: 'Get a post by its URL path (e.g. /2024/01/my-post-title.html).',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'The blog ID.' },
        path: { type: 'string', description: 'The URL path of the post.' }
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
    description: 'Search for posts in a blog by keyword.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'The blog ID.' },
        query: { type: 'string', description: 'The search keyword.' },
        max_results: { type: 'number', description: 'Maximum number of results. Default: 10.' }
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
    description: 'Create a new post on a blog. Content can be Markdown or raw HTML.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'The target blog ID.' },
        title: { type: 'string', description: 'The post title.' },
        content: { type: 'string', description: 'Post content in Markdown or HTML format.' },
        labels: { type: 'array', items: { type: 'string' }, description: 'Labels/tags for the post.' },
        is_draft: { type: 'boolean', description: 'If true, save as draft. Default: false (publish immediately).' },
        is_markdown: { type: 'boolean', description: 'If true, content will be converted from Markdown to HTML. Default: true.' }
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
    description: 'Update the title, content, or labels of an existing post.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'The blog ID.' },
        post_id: { type: 'string', description: 'The ID of the post to update.' },
        title: { type: 'string', description: 'New title (optional).' },
        content: { type: 'string', description: 'New content in Markdown or HTML (optional).' },
        labels: { type: 'array', items: { type: 'string' }, description: 'New labels (optional, replaces existing labels).' },
        is_markdown: { type: 'boolean', description: 'If true, content is converted from Markdown. Default: true.' }
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
    description: 'Publish a draft post to make it publicly visible.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'The blog ID.' },
        post_id: { type: 'string', description: 'The ID of the post to publish.' }
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
    description: 'Revert a published post back to draft status.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'The blog ID.' },
        post_id: { type: 'string', description: 'The ID of the post to revert to draft.' }
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
    description: 'Permanently delete a post from the blog.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'The blog ID.' },
        post_id: { type: 'string', description: 'The ID of the post to delete.' }
      },
      required: ['blog_id', 'post_id']
    },
    handler: async ({ blog_id, post_id }) => {
      const blogger = getBlogger();
      await blogger.posts.delete({ blogId: blog_id, postId: post_id });
      return { success: true, message: `Post ${post_id} successfully deleted from blog ${blog_id}.` };
    }
  }
];

module.exports = { postTools };

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
    description: 'List all static pages on a blog.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'The blog ID.' },
        status: { type: 'string', enum: ['live', 'draft'], description: 'Filter by page status.' }
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
    description: 'Get the full details of a single static page by its Page ID.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'The blog ID.' },
        page_id: { type: 'string', description: 'The page ID.' }
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
    description: 'Create a new static page on a blog (e.g. About, Contact, Privacy Policy).',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'The blog ID.' },
        title: { type: 'string', description: 'The page title.' },
        content: { type: 'string', description: 'Page content in HTML format.' },
        is_draft: { type: 'boolean', description: 'If true, save as draft. Default: false.' }
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
    description: 'Update the title or content of an existing static page.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'The blog ID.' },
        page_id: { type: 'string', description: 'The ID of the page to update.' },
        title: { type: 'string', description: 'New title (optional).' },
        content: { type: 'string', description: 'New content in HTML (optional).' }
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
    description: 'Publish a static page that is currently in draft status.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'The blog ID.' },
        page_id: { type: 'string', description: 'The ID of the page to publish.' }
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
    description: 'Permanently delete a static page from the blog.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'The blog ID.' },
        page_id: { type: 'string', description: 'The ID of the page to delete.' }
      },
      required: ['blog_id', 'page_id']
    },
    handler: async ({ blog_id, page_id }) => {
      const blogger = getBlogger();
      await blogger.pages.delete({ blogId: blog_id, pageId: page_id });
      return { success: true, message: `Page ${page_id} successfully deleted.` };
    }
  }
];

module.exports = { pageTools };

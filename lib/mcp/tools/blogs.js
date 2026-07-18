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
    description: 'List all blogs owned by the authenticated Google account.',
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
    description: 'Get full details of a specific blog by its Blog ID.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'The unique ID of the Blogger blog.' }
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
    description: 'Get blog information by its public URL (e.g. https://yourblog.blogspot.com).',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The public URL of the blog.' }
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
    description: 'Get statistics and detailed info of a blog including total posts, pages, and locale.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'string', description: 'The unique ID of the Blogger blog.' }
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

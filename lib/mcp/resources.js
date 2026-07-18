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
    name: 'My Blogs',
    description: 'List of all blogs connected to the authenticated account.',
    mimeType: 'application/json',
    handler: async () => {
      const blogger = getBlogger();
      const res = await blogger.blogs.listByUser({ userId: 'self' });
      return JSON.stringify(res.data, null, 2);
    }
  },
  {
    uri: 'blogger://config',
    name: 'Global Configuration',
    description: 'Current configuration from ~/.blogger-publisher/config.json (sensitive values masked).',
    mimeType: 'application/json',
    handler: async () => {
      const config = loadConfig();
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
    description: 'Guide AI to write a well-structured, SEO-friendly blog post.',
    arguments: [
      { name: 'topic', description: 'The topic or title idea for the article.', required: true },
      { name: 'keywords', description: 'Target keywords (comma-separated).', required: false },
      { name: 'tone', description: 'Writing tone (formal, casual, technical). Default: casual.', required: false }
    ],
    handler: ({ topic, keywords, tone }) => {
      return [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Write an SEO-friendly blog article with the following guidelines:
- Topic: ${topic}
- Target keywords: ${keywords || 'not specified'}
- Writing tone: ${tone || 'casual and informative'}

Article structure:
1. A compelling title containing the main keyword
2. Meta description (max 160 characters)
3. Hook introduction (100-150 words)
4. 3-5 H2 subheadings with rich content
5. Conclusion + Call to Action
6. Suggested labels/tags for Blogger

Format the output as Markdown with YAML frontmatter:
\`\`\`
---
title: "..."
description: "..."
labels: [...]
status: "draft"
---
article content...
\`\`\``
          }
        }
      ];
    }
  },
  {
    name: 'moderate_comments',
    description: 'Guide AI to intelligently moderate blog comments.',
    arguments: [
      { name: 'blog_id', description: 'The Blog ID whose comments should be moderated.', required: true }
    ],
    handler: ({ blog_id }) => {
      return [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please moderate comments for blog ID: ${blog_id}.

Steps:
1. Call \`list_all_comments\` with status "pending" to see all awaiting comments.
2. For each comment, analyze:
   - Relevant and respectful → use \`approve_comment\`
   - Contains spam links or excessive promotion → use \`mark_comment_spam\`
   - Contains hate speech or harmful content → use \`delete_comment\`
3. Create a summary report: how many were approved, marked as spam, and deleted.`
          }
        }
      ];
    }
  },
  {
    name: 'blog_audit',
    description: 'Guide AI to perform a content health audit of a blog.',
    arguments: [
      { name: 'blog_id', description: 'The Blog ID to audit.', required: true }
    ],
    handler: ({ blog_id }) => {
      return [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please perform a content audit for blog ID: ${blog_id}.

Audit guide:
1. Call \`get_blog_info\` to get basic statistics.
2. Call \`list_posts\` (status: live) to see published posts.
3. Call \`list_posts\` (status: draft) to see unpublished drafts.
4. Create an audit report covering:
   - Total posts (published vs draft)
   - Estimated posting frequency
   - 3 most recent posts with their titles
   - Recommendations for improving posting consistency`
          }
        }
      ];
    }
  }
];

module.exports = { mcpResources, mcpPrompts };

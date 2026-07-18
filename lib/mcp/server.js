'use strict';

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} = require('@modelcontextprotocol/sdk/types.js');

const { blogTools } = require('./tools/blogs');
const { postTools } = require('./tools/posts');
const { pageTools } = require('./tools/pages');
const { commentTools } = require('./tools/comments');
const { mcpResources, mcpPrompts } = require('./resources');
const pkg = require('../../package.json');

// Gabungkan semua tools ke dalam satu registry
const allTools = [...blogTools, ...postTools, ...pageTools, ...commentTools];

async function createMcpServer() {
  const server = new Server(
    { name: 'blogger-publisher-mcp', version: pkg.version },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {}
      }
    }
  );

  // === TOOLS ===
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: allTools.map(({ name, description, inputSchema }) => ({
        name,
        description,
        inputSchema
      }))
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const tool = allTools.find(t => t.name === name);

    if (!tool) {
      return {
        content: [{ type: 'text', text: `❌ Tool tidak ditemukan: ${name}` }],
        isError: true
      };
    }

    try {
      const result = await tool.handler(args || {});
      return {
        content: [{
          type: 'text',
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      const msg = error?.response?.data?.error?.message || error?.message || String(error);
      return {
        content: [{ type: 'text', text: `❌ Error saat menjalankan ${name}: ${msg}` }],
        isError: true
      };
    }
  });

  // === RESOURCES ===
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: mcpResources.map(({ uri, name, description, mimeType }) => ({
        uri, name, description, mimeType
      }))
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    const resource = mcpResources.find(r => r.uri === uri);

    if (!resource) {
      throw new Error(`Resource tidak ditemukan: ${uri}`);
    }

    const content = await resource.handler();
    return {
      contents: [{
        uri,
        mimeType: resource.mimeType,
        text: content
      }]
    };
  });

  // === PROMPTS ===
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: mcpPrompts.map(({ name, description, arguments: args }) => ({
        name, description, arguments: args
      }))
    };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const prompt = mcpPrompts.find(p => p.name === name);

    if (!prompt) {
      throw new Error(`Prompt tidak ditemukan: ${name}`);
    }

    const messages = prompt.handler(args || {});
    return { messages };
  });

  return server;
}

module.exports = { createMcpServer };

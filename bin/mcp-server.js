#!/usr/bin/env node
'use strict';

const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { createMcpServer } = require('../lib/mcp/server');

async function main() {
  const server = await createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Server berjalan via STDIO, tidak ada output ke console (akan mengganggu JSON-RPC)
}

main().catch((error) => {
  process.stderr.write(`MCP Server Error: ${error.message}\n`);
  process.exit(1);
});

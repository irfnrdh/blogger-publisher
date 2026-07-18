#!/usr/bin/env node
'use strict';

const { startApiServer, DEFAULT_PORT } = require('../lib/api/server');

const args = process.argv.slice(2);
const portArg = args.find(a => a.startsWith('--port='));
const rawPort = portArg ? parseInt(portArg.split('=')[1], 10) : DEFAULT_PORT;

if (isNaN(rawPort) || rawPort < 1024 || rawPort > 65535) {
  console.error(`Invalid port: "${portArg}". Must be a number between 1024 and 65535.`);
  process.exit(1);
}

startApiServer(rawPort);

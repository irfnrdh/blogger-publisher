#!/usr/bin/env node
'use strict';

const { startApiServer, DEFAULT_PORT } = require('../lib/api/server');

const args = process.argv.slice(2);
const portArg = args.find(a => a.startsWith('--port='));
const port = portArg ? parseInt(portArg.split('=')[1], 10) : DEFAULT_PORT;

startApiServer(port);

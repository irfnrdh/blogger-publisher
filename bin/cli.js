#!/usr/bin/env node

const { program } = require('commander');
const { runAuthFlow } = require('../lib/auth');
const { runBulkPublisher } = require('../lib/publisher');
const path = require('path');
const pkg = require('../package.json');

program
  .name('blogger-publisher')
  .description('CLI tool untuk publikasi otomatis Markdown ke Blogger')
  .version(pkg.version);

program
  .command('auth')
  .description('Memulai proses otorisasi OAuth2 ke Google dan mencetak Refresh Token')
  .action(() => {
    runAuthFlow();
  });

program
  .command('publish')
  .description('Mem-publish semua file markdown di folder target ke Blogger')
  .argument('[target]', 'Folder atau file target (default: ./articles)', './articles')
  .action(async (target) => {
    const targetPath = path.resolve(process.cwd(), target);
    await runBulkPublisher(targetPath);
  });

program.parse(process.argv);

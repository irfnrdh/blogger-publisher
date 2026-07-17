#!/usr/bin/env node

const { program } = require('commander');
const { runAuthFlow } = require('../lib/auth');
const { runBulkPublisher } = require('../lib/publisher');
const { runPuller } = require('../lib/pull');
const { runInteractiveTui } = require('../lib/tui');
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
  .option('-b, --blog <id>', 'Spesifikasikan Blog ID (Override .env)')
  .action(async (target, options) => {
    const targetPath = path.resolve(process.cwd(), target);
    await runBulkPublisher(targetPath, options.blog);
  });

program
  .command('pull')
  .description('Men-download (Sync) semua artikel dari Blogger menjadi file Markdown')
  .argument('[target]', 'Folder target untuk menyimpan Markdown (default: ./articles)', './articles')
  .option('-b, --blog <id>', 'Spesifikasikan Blog ID (Override .env)')
  .action(async (target, options) => {
    const targetPath = path.resolve(process.cwd(), target);
    await runPuller(targetPath, options.blog);
  });

// If no command is provided, run the interactive TUI
if (!process.argv.slice(2).length) {
  runInteractiveTui().catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else {
  program.parse(process.argv);
}

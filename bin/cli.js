#!/usr/bin/env node

const { program } = require('commander');
const { runAuthFlow } = require('../lib/auth');
const { runBulkPublisher } = require('../lib/publisher');
const { runPuller } = require('../lib/pull');
const { runInteractiveTui } = require('../lib/tui');
const { checkUpdate } = require('../lib/updater');
const { ZodError } = require('zod');
const path = require('path');
const pkg = require('../package.json');

program
  .name('blogger-publisher')
  .description('CLI tool untuk publikasi otomatis Markdown ke Blogger')
  .version(pkg.version);

program
  .command('auth')
  .description('Memulai proses otorisasi OAuth2 ke Google dan mencetak Refresh Token')
  .argument('<accountId>', 'ID Akun yang akan diotorisasi (misal: my-blog)')
  .action((accountId) => {
    runAuthFlow(accountId);
  });

program
  .command('publish')
  .description('Mem-publish semua file markdown di folder target ke Blogger')
  .argument('[target]', 'Folder atau file target (default: ./articles)', './articles')
  .option('-a, --account <id>', 'Spesifikasikan Account ID')
  .option('-b, --blog <id>', 'Spesifikasikan Blog ID (Override .env)')
  .action(async (target, options) => {
    const targetPath = target === '-' ? '-' : path.resolve(process.cwd(), target);
    await runBulkPublisher(targetPath, options.account, options.blog);
  });

program
  .command('pull')
  .description('Men-download (Sync) semua artikel dari Blogger menjadi file Markdown')
  .argument('[target]', 'Folder target untuk menyimpan Markdown (default: ./articles)', './articles')
  .option('-a, --account <id>', 'Spesifikasikan Account ID')
  .option('-b, --blog <id>', 'Spesifikasikan Blog ID (Override .env)')
  .action(async (target, options) => {
    const targetPath = path.resolve(process.cwd(), target);
    await runPuller(targetPath, options.account, options.blog);
  });

program
  .command('serve')
  .description('Menjalankan Local API Server & Background Scheduler (Port: 1826)')
  .option('-p, --port <number>', 'Spesifikasikan Port', '1826')
  .action((options) => {
    const { startApiServer } = require('../lib/api/server');
    const port = parseInt(options.port, 10);
    if (isNaN(port) || port < 1024 || port > 65535) {
      console.error(`Invalid port: "${options.port}". Must be between 1024 and 65535.`);
      process.exit(1);
    }
    startApiServer(port);
  });

async function main() {
  const args = process.argv.slice(2);
  const isInteractive = !args.length;

  // Cek update terlebih dahulu
  await checkUpdate(isInteractive);

  if (isInteractive) {
    await runInteractiveTui();
  } else {
    await program.parseAsync(process.argv);
  }
}

main().catch((error) => {
  if (error?.response?.data?.error?.message) {
    console.error(`\n❌ API Error [${error.response.status}]: ${error.response.data.error.message}`);
  } else if (error instanceof ZodError) {
    console.error(`\n❌ Validation Error:`);
    error.issues.forEach(issue => console.error(`   - ${issue.path.join('.')}: ${issue.message}`));
  } else {
    console.error(`\n❌ Error: ${error.message || String(error)}`);
  }
  process.exitCode = 1;
});

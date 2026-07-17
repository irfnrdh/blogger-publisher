const p = require('@clack/prompts');
const pc = require('picocolors');
const path = require('path');
const { saveConfig } = require('./config');
const { runAuthFlow } = require('./auth');
const { runBulkPublisher } = require('./publisher');
const { runPuller } = require('./pull');

async function runScaffold() {
  p.intro(pc.bgCyan(pc.black(' 🏗️  Scaffolding Workspace Baru ')));

  // 1. Create articles/ and hello-world.md
  const articlesDir = path.join(process.cwd(), 'articles');
  if (!fs.existsSync(articlesDir)) {
    fs.mkdirSync(articlesDir, { recursive: true });
    const helloWorldContent = `---
title: "Hello World dari Blogger Publisher"
slug: "hello-world"
description: "Ini adalah artikel pertama saya."
labels: ["Welcome", "AI"]
status: "draft"
---

Selamat datang di **Blogger Publisher**! 🚀

Ini adalah contoh artikel pertama Anda. Anda bisa mengedit file ini, lalu jalankan \`blogger-publisher publish\` untuk mempublikasikannya secara otomatis!

Coba tambahkan gambar lokal Anda di folder \`images/\` dan panggil dengan \`![Gambar](../images/contoh.png)\`.`;
    fs.writeFileSync(path.join(articlesDir, 'hello-world.md'), helloWorldContent);
    p.note('Dibuat: folder articles/ dan hello-world.md', 'Setup Folder');
  }

  // 2. Create images/
  const imagesDir = path.join(process.cwd(), 'images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
    p.note('Dibuat: folder images/', 'Setup Folder');
  }

  // 3. Create .gitignore
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, "node_modules/\n.env\ncredentials.json\ntoken.json\narticles-pulled/\n.DS_Store\n*.log\n");
    p.note('Dibuat: .gitignore untuk keamanan', 'Setup Git');
  }

  // 4. Inject AGENT.md
  const agentSource = path.join(__dirname, '../AGENT.md');
  const agentDest = path.join(process.cwd(), 'AGENT.md');
  if (fs.existsSync(agentSource) && !fs.existsSync(agentDest)) {
    fs.copyFileSync(agentSource, agentDest);
    p.note('Dibuat: AGENT.md (Instruksi AI telah di-injeksi!)', 'Setup AI');
  }

  // 5. Interactive Setup for Global Config
  const envAnswers = await p.group(
    {
      clientId: () => p.text({
        message: 'Masukkan Google CLIENT_ID Anda (Kosongkan jika ingin isi nanti):',
        placeholder: 'xxxxxxxxxxx.apps.googleusercontent.com'
      }),
      clientSecret: () => p.text({
        message: 'Masukkan Google CLIENT_SECRET Anda:',
        placeholder: 'GOCSPX-xxxxxxx'
      }),
      blogId: () => p.text({
        message: 'Masukkan BLOG_ID default Anda:',
        placeholder: '1234567890123456789'
      }),
      imageProvider: () => p.select({
        message: 'Pilih Image CDN andalan Anda:',
        options: [
          { value: 'drive', label: 'Google Drive (Default, Kuota Google Anda)' },
          { value: 'imgbb', label: 'ImgBB (Gratis 32MB/gambar)' },
          { value: 'cloudinary', label: 'Cloudinary (Sangat cepat, perlu API Key)' },
          { value: 'github', label: 'GitHub + jsDelivr (Gratis CDN, perlu Token)' },
        ],
      }),
    },
    {
      onCancel: () => {
        p.cancel('Setup dibatalkan.');
        process.exit(0);
      },
    }
  );

  let newConfig = {
    clientId: envAnswers.clientId,
    clientSecret: envAnswers.clientSecret,
    blogId: envAnswers.blogId,
    imageProvider: envAnswers.imageProvider
  };
  
  if (envAnswers.imageProvider === 'imgbb') {
    newConfig.imgbbApiKey = await p.text({ message: 'Masukkan IMGBB API KEY:' });
  } else if (envAnswers.imageProvider === 'cloudinary') {
    newConfig.cloudinaryCloudName = await p.text({ message: 'Masukkan Cloudinary Cloud Name:' });
    newConfig.cloudinaryApiKey = await p.text({ message: 'Masukkan Cloudinary API Key:' });
    newConfig.cloudinaryApiSecret = await p.text({ message: 'Masukkan Cloudinary API Secret:' });
  } else if (envAnswers.imageProvider === 'github') {
    newConfig.githubToken = await p.text({ message: 'Masukkan GitHub Token (ghp_...):' });
    newConfig.githubRepo = await p.text({ message: 'Masukkan Repo Target (username/repo):' });
  }

  saveConfig(newConfig);
  p.note('Global Config berhasil dibuat!', 'Setup Konfigurasi');

  p.outro(pc.green('🎉 Workspace berhasil dibuat! Anda kini siap nge-blog.'));
}

async function runInteractiveTui() {
  console.clear();
  p.intro(`${pc.bgBlue(pc.white(' 🚀 Blogger Publisher CLI '))} ${pc.gray('v1.2.0')}`);

  const action = await p.select({
    message: 'Apa yang ingin Anda lakukan?',
    options: [
      { value: 'init', label: '🏗️  Init Workspace (Setup Folder, .env, & AI Agent)', hint: 'Pilih ini jika baru pertama kali' },
      { value: 'auth', label: '🔑  Auth (Login ke Akun Google)' },
      { value: 'publish', label: '🚀  Publish Artikel' },
      { value: 'pull', label: '📥  Tarik (Pull) Artikel Lama' },
      { value: 'exit', label: '❌  Keluar' }
    ]
  });

  if (p.isCancel(action) || action === 'exit') {
    p.cancel('Sampai jumpa!');
    process.exit(0);
  }

  if (action === 'init') {
    await runScaffold();
    // After init, ask if they want to auth
    const doAuth = await p.confirm({
      message: 'Ingin langsung login ke Google sekarang?',
      initialValue: true
    });
    if (doAuth) {
      runAuthFlow();
    }
  } else if (action === 'auth') {
    runAuthFlow();
  } else if (action === 'publish') {
    const target = await p.text({
      message: 'Masukkan folder target (tekan Enter untuk default ./articles):',
      placeholder: './articles',
      defaultValue: './articles'
    });
    if (p.isCancel(target)) process.exit(0);
    const targetPath = path.resolve(process.cwd(), target);
    await runBulkPublisher(targetPath);
    p.outro(pc.green('✅ Proses publish selesai!'));
  } else if (action === 'pull') {
    const target = await p.text({
      message: 'Masukkan folder tujuan penyimpanan (tekan Enter untuk default ./articles):',
      placeholder: './articles',
      defaultValue: './articles'
    });
    if (p.isCancel(target)) process.exit(0);
    const targetPath = path.resolve(process.cwd(), target);
    await runPuller(targetPath);
    p.outro(pc.green('✅ Proses pull selesai!'));
  }
}

module.exports = { runInteractiveTui, runScaffold };

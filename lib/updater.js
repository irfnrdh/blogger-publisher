const axios = require('axios');
const pc = require('picocolors');
const p = require('@clack/prompts');
const { execSync } = require('child_process');
const pkg = require('../package.json');

// Bandingkan versi secara sederhana (hanya mengecek jika versi npm berbeda dari versi lokal)
function isNewerVersion(local, remote) {
  const localParts = local.split('.').map(Number);
  const remoteParts = remote.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (remoteParts[i] > localParts[i]) return true;
    if (remoteParts[i] < localParts[i]) return false;
  }
  return false;
}

async function checkUpdate(isInteractive = false) {
  try {
    const res = await axios.get('https://registry.npmjs.org/blogger-publisher/latest', { timeout: 3000 });
    const latestVersion = res.data.version;

    if (latestVersion && isNewerVersion(pkg.version, latestVersion)) {
      if (isInteractive) {
        console.log('');
        p.note(`Versi saat ini: v${pkg.version}\nVersi terbaru: v${latestVersion}`, '✨ Update Tersedia!');
        const shouldUpdate = await p.confirm({
          message: 'Apakah Anda ingin memperbarui secara otomatis sekarang?',
          initialValue: true
        });

        if (shouldUpdate) {
          const spinner = p.spinner();
          spinner.start('Mengunduh pembaruan dari NPM...');
          execSync('npm install -g blogger-publisher@latest', { stdio: 'ignore' });
          spinner.stop('Update berhasil!');
          p.outro(pc.green('Sistem telah diperbarui. Silakan jalankan ulang perintah "blogger-publisher".'));
          process.exit(0);
        }
      } else {
        // Non-interactive (silent warning)
        console.warn(pc.bgYellow(pc.black(` ⚠️ UPDATE TERSEDIA: v${latestVersion} `)) + pc.yellow(` Jalankan "npm i -g blogger-publisher" untuk memperbarui.`));
      }
    }
  } catch (error) {
    // Fail silently jika tidak ada internet
  }
}

module.exports = { checkUpdate };

const axios = require('axios');
const pc = require('picocolors');
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
        console.log(pc.bgYellow(pc.black(` ✨ UPDATE TERSEDIA: v${latestVersion} `)));
        console.log(pc.yellow(` Versi Anda saat ini (v${pkg.version}) sudah tertinggal.`));
        console.log(pc.green(` Jalankan perintah berikut untuk memperbarui:`));
        console.log(pc.cyan(` npm install -g blogger-publisher@latest\n`));
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

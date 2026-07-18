const { google } = require('googleapis');
const express = require('express');
const { loadConfig } = require('./config');
const { setAccountCredentials } = require('./multiconfig');
const pc = require('picocolors');

const SCOPES = [
  'https://www.googleapis.com/auth/blogger',
  'https://www.googleapis.com/auth/drive.file'
];

function getOAuthClient() {
  const config = loadConfig();
  const { clientId, clientSecret } = config;
  
  if (!clientId || !clientSecret) {
    console.error(pc.red("❌ ERROR: Pastikan CLIENT_ID dan CLIENT_SECRET sudah diset di config/env!"));
    process.exit(1);
  }

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    'http://localhost:3030/oauth2callback'
  );
}

function runAuthFlow(accountId) {
  if (!accountId) {
    console.error(pc.red("❌ ERROR: Account ID harus dispesifikasikan (contoh: blogger-publisher auth my-account)"));
    process.exit(1);
  }

  const app = express();
  const port = 3030;
  const oauth2Client = getOAuthClient();

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES
  });

  console.log(pc.cyan("\n========================================="));
  console.log(pc.white(`🔒 Buka URL ini di browser Anda untuk login akun: ${pc.bold(accountId)}`));
  console.log(pc.green(authUrl));
  console.log(pc.cyan("=========================================\n"));

  app.get('/oauth2callback', async (req, res) => {
    const code = req.query.code;
    if (code) {
      try {
        const { tokens } = await oauth2Client.getToken(code);
        
        const credentials = {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            scope: tokens.scope,
            token_type: tokens.token_type,
            expiry_date: tokens.expiry_date
        };

        setAccountCredentials(accountId, credentials);
        
        console.log(pc.green(`\n✅ SUKSES! Anda berhasil mendapatkan token.`));
        console.log(pc.green(`✅ Kredensial berhasil disimpan untuk akun: ${accountId}`));
        
        res.send(`
          <div style="font-family: sans-serif; padding: 2rem;">
            <h1 style="color: green;">Login Sukses!</h1>
            <p>Kredensial telah disimpan dengan aman untuk akun: <b>${accountId}</b>.</p>
            <p>Anda bisa menutup tab ini dan kembali ke terminal.</p>
          </div>
        `);
        
        setTimeout(() => {
          process.exit(0);
        }, 1000);
      } catch (error) {
        console.error(pc.red("❌ Error mendapatkan token:"), error.message);
        res.status(500).send('Error mendapatkan token.');
        setTimeout(() => process.exit(1), 1000);
      }
    } else {
      res.send('Tidak ada code oauth2.');
    }
  });

  app.listen(port, () => {
    console.log(pc.dim(`Menunggu otentikasi di http://localhost:${port}...`));
  });
}

module.exports = {
  runAuthFlow
};

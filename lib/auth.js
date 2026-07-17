require('dotenv').config();
const { google } = require('googleapis');
const express = require('express');

const SCOPES = [
  'https://www.googleapis.com/auth/blogger',
  'https://www.googleapis.com/auth/drive.file'
];

function getOAuthClient() {
  const CLIENT_ID = process.env.CLIENT_ID;
  const CLIENT_SECRET = process.env.CLIENT_SECRET;
  
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error("❌ ERROR: Pastikan CLIENT_ID dan CLIENT_SECRET sudah diset di file .env!");
    process.exit(1);
  }

  return new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    'http://localhost:3030/oauth2callback'
  );
}

function getAuthenticatedClient() {
  const oauth2Client = getOAuthClient();
  const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
  
  if (!REFRESH_TOKEN) {
      console.error("❌ ERROR: REFRESH_TOKEN belum ada di file .env. Silakan jalankan 'blogger-publisher auth' terlebih dahulu.");
      process.exit(1);
  }

  oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
  return oauth2Client;
}

function runAuthFlow() {
  const app = express();
  const port = 3030;
  const oauth2Client = getOAuthClient();

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // Memaksa agar selalu mengembalikan refresh_token
    scope: SCOPES
  });

  console.log("=========================================");
  console.log("🔒 Buka URL ini di browser Anda untuk login dan memberikan akses:");
  console.log(authUrl);
  console.log("=========================================");

  app.get('/oauth2callback', async (req, res) => {
    const code = req.query.code;
    if (code) {
      try {
        const { tokens } = await oauth2Client.getToken(code);
        console.log("\n✅ SUKSES! Anda berhasil mendapatkan token.");
        console.log("\n=========================================");
        console.log("🔑 REFRESH_TOKEN ANDA ADALAH:");
        console.log("=========================================");
        console.log(tokens.refresh_token);
        console.log("=========================================");
        console.log("\n👉 Langkah selanjutnya: Copy REFRESH_TOKEN di atas dan paste ke dalam file .env");
        
        res.send(`
          <h1>Login Sukses!</h1>
          <p>Silakan copy Refresh Token di bawah ini dan masukkan ke file .env:</p>
          <textarea rows="4" cols="50" style="font-family: monospace;">${tokens.refresh_token}</textarea>
          <p>Setelah di-copy, Anda bisa menutup tab ini dan kembali ke terminal.</p>
        `);
        
        setTimeout(() => {
          process.exit(0);
        }, 1000);
      } catch (error) {
        console.error("Error mendapatkan token:", error);
        res.status(500).send('Error mendapatkan token.');
      }
    } else {
      res.send('Tidak ada code oauth2.');
    }
  });

  app.listen(port, () => {
    console.log(`Menunggu otentikasi di http://localhost:${port}...`);
  });
}

module.exports = {
  getAuthenticatedClient,
  runAuthFlow
};

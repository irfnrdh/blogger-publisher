require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { marked } = require('marked');

// Konfigurasi
const BLOG_ID = process.env.BLOG_ID;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

// Path file markdown
// Anda bisa mengubah ini menjadi argumen CLI nantinya (misal process.argv[2])
const MARKDOWN_FILE_PATH = path.resolve(__dirname, 'sample.md'); 

if (!BLOG_ID || !CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    console.error("❌ ERROR: Pastikan semua environment variable di file .env sudah terisi!");
    process.exit(1);
}

// Setup OAuth2
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  "http://localhost" // Bisa bebas karena kita sudah punya refresh token
);

oauth2Client.setCredentials({
  refresh_token: REFRESH_TOKEN
});

const blogger = google.blogger({
  version: 'v3',
  auth: oauth2Client
});

async function publishToBlogger() {
  try {
    console.log(`1. Membaca file Markdown dari: ${MARKDOWN_FILE_PATH}`);
    if (!fs.existsSync(MARKDOWN_FILE_PATH)) {
        throw new Error(`File ${MARKDOWN_FILE_PATH} tidak ditemukan!`);
    }
    
    const markdownContent = fs.readFileSync(MARKDOWN_FILE_PATH, 'utf8');

    console.log('2. Mengubah Markdown menjadi HTML...');
    const lines = markdownContent.split('\n');
    let title = "Artikel 0day"; // Judul default
    let labels = ["Markdown", "Programming"]; // Label default
    
    // Logika sederhana: ambil baris pertama sebagai Judul jika diawali dengan '#'
    if(lines[0].trim().startsWith('# ')) {
        title = lines[0].replace('# ', '').trim();
        lines.shift(); // Hapus baris pertama dari konten agar tidak duplikat
    }
    
    const remainingMarkdown = lines.join('\n');
    const htmlContent = marked(remainingMarkdown);

    console.log(`3. Mempublish ke Blogger: [${BLOG_ID}] dengan judul: "${title}" ...`);
    
    // Request ke Blogger API
    const response = await blogger.posts.insert({
      blogId: BLOG_ID,
      isDraft: false, // Ubah ke true jika ingin masuk ke draft terlebih dahulu
      requestBody: {
        title: title,
        content: htmlContent,
        labels: labels
      }
    });

    console.log('\n✅ SUKSES! Artikel berhasil dipublish.');
    console.log('🔗 URL Artikel:', response.data.url);

  } catch (error) {
    console.error('\n❌ GAGAL mempublish artikel:');
    if (error.response && error.response.data) {
        console.error(error.response.data.error.message);
    } else {
        console.error(error.message);
    }
  }
}

// Jalankan fungsi
publishToBlogger();

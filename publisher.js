require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { marked } = require('marked');
const matter = require('gray-matter');
const { globSync } = require('glob');

// Konfigurasi Environment
const BLOG_ID = process.env.BLOG_ID;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

if (!BLOG_ID || !CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    console.error("❌ ERROR: Pastikan semua environment variable di file .env sudah terisi!");
    process.exit(1);
}

// Setup OAuth2
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  "http://localhost"
);

oauth2Client.setCredentials({
  refresh_token: REFRESH_TOKEN
});

const blogger = google.blogger({
  version: 'v3',
  auth: oauth2Client
});

// Helper Delay untuk menghindari Rate Limit (3 detik)
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function processFile(filePath) {
    console.log(`\n========================================`);
    console.log(`📄 Memproses: ${path.basename(filePath)}`);
    
    let rawContent = fs.readFileSync(filePath, 'utf8');
    
    // Parse Frontmatter menggunakan gray-matter
    const parsed = matter(rawContent);
    const meta = parsed.data;
    const markdownBody = parsed.content;

    // Persiapan Metadata
    const title = meta.title || 'Tanpa Judul';
    const labels = meta.labels || [];
    const isDraft = meta.status && meta.status.toLowerCase() === 'draft';
    const publishedDate = meta.date ? new Date(meta.date).toISOString() : null;
    const existingPostId = meta.blogger_id;
    
    // Convert Body ke HTML
    const htmlContent = marked(markdownBody);

    const postBody = {
        title: title,
        content: htmlContent,
        labels: labels
    };

    if (publishedDate) {
        postBody.published = publishedDate; // ISO-8601 string
    }

    try {
        if (existingPostId) {
            // MODE UPDATE
            console.log(`[UPDATE] Memperbarui artikel (ID: ${existingPostId})...`);
            const response = await blogger.posts.patch({
                blogId: BLOG_ID,
                postId: existingPostId,
                requestBody: postBody
            });
            console.log(`✅ BERHASIL Diperbarui: ${response.data.url}`);

            // Tulis waktu update ke file lokal
            const nowIso = new Date().toISOString();
            console.log(`Menulis 'updated_at' ke dalam file lokal...`);
            
            // Cek apakah sudah ada baris updated_at sebelumnya
            if (rawContent.includes('updated_at:')) {
                // Replace yang lama
                rawContent = rawContent.replace(/(updated_at:\s*['"]?)[^'"]+(['"]?)/, `$1${nowIso}$2`);
            } else {
                // Tambahkan di bawah blogger_id
                rawContent = rawContent.replace(/(blogger_id:\s*['"]?[^'"]+['"]?)/, `$1\nupdated_at: "${nowIso}"`);
            }
            fs.writeFileSync(filePath, rawContent, 'utf8');
        } else {
            // MODE INSERT BARU
            console.log(`[BARU] Mengunggah artikel baru...`);
            const response = await blogger.posts.insert({
                blogId: BLOG_ID,
                isDraft: isDraft,
                requestBody: postBody
            });
            
            const newPostId = response.data.id;
            console.log(`✅ BERHASIL Diunggah. ID Baru: ${newPostId}`);
            console.log(`🔗 URL: ${response.data.url}`);

            // Tulis balik ke file lokal agar tidak duplikat jika dijalankan ulang
            console.log(`Menulis 'blogger_id' ke dalam file lokal...`);
            
            // Kita cari baris `---` pertama dan selipkan `blogger_id`
            const newContent = rawContent.replace(/^---\r?\n/, `---\nblogger_id: "${newPostId}"\n`);
            fs.writeFileSync(filePath, newContent, 'utf8');
        }
    } catch (error) {
        console.error(`❌ GAGAL memproses ${path.basename(filePath)}:`);
        if (error.response && error.response.data) {
            console.error(error.response.data.error.message);
        } else {
            console.error(error.message);
        }
    }
}

async function runBulkPublisher() {
    console.log("Mulai membaca folder 'articles'...");
    const articlesDir = path.resolve(__dirname, 'articles');
    
    if (!fs.existsSync(articlesDir)) {
        console.error(`❌ Folder ${articlesDir} tidak ditemukan!`);
        return;
    }

    // Cari semua file .md menggunakan glob
    const mdFiles = globSync('*.md', { cwd: articlesDir, absolute: true });
    
    if (mdFiles.length === 0) {
        console.log("Peringatan: Tidak ada file .md di dalam folder 'articles'.");
        return;
    }

    console.log(`Menemukan ${mdFiles.length} file markdown. Memulai proses publikasi...\n`);

    for (let i = 0; i < mdFiles.length; i++) {
        await processFile(mdFiles[i]);
        
        // Jeda 3 detik untuk setiap artikel agar tidak terkena Rate Limit Blogger
        if (i < mdFiles.length - 1) {
            console.log("⏳ Menunggu 3 detik agar aman dari pemblokiran API...");
            await delay(3000); 
        }
    }
    
    console.log(`\n🎉 PROSES BULK SELESAI!`);
}

runBulkPublisher();

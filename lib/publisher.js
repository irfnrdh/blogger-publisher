const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { marked } = require('marked');
const matter = require('gray-matter');
const { globSync } = require('glob');
const { getAuthenticatedClient } = require('./auth');
const { uploadImageToDrive } = require('./drive');
const crypto = require('crypto');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function processLocalImages(markdownContent, baseDir, authClient) {
  // Regex mencari format gambar markdown: ![alt text](./path/ke/gambar.jpg)
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  let newContent = markdownContent;

  const matches = [...markdownContent.matchAll(imageRegex)];

  for (const match of matches) {
    const fullMatch = match[0];
    const altText = match[1];
    let imagePath = match[2];

    // Cek apakah imagePath adalah link lokal (tidak ada http:// atau https://)
    if (!imagePath.startsWith('http://') && !imagePath.startsWith('https://')) {
      // Dapatkan path absolut dari gambar
      const absoluteImagePath = path.resolve(baseDir, imagePath);
      
      try {
        const driveUrl = await uploadImageToDrive(authClient, absoluteImagePath);
        // Ganti teks markdown lokal menjadi URL Drive
        newContent = newContent.replace(fullMatch, `![${altText}](${driveUrl})`);
      } catch (error) {
        console.warn(`    ⚠️ Melewati gambar ${imagePath} karena error upload.`);
      }
    }
  }

  return newContent;
}

async function processFile(filePath, authClient) {
    console.log(`\n========================================`);
    console.log(`📄 Memproses: ${path.basename(filePath)}`);
    
    const BLOG_ID = process.env.BLOG_ID;
    if (!BLOG_ID) {
        throw new Error("BLOG_ID tidak ditemukan di .env");
    }

    const blogger = google.blogger({ version: 'v3', auth: authClient });
    let rawContent = fs.readFileSync(filePath, 'utf8');
    
    // 1. Ganti gambar lokal dengan gambar Google Drive
    // Kita juga meng-update rawContent agar URL Drive tersimpan permanen di file .md
    // Sehingga tidak terjadi re-upload gambar yang sama saat script dijalankan ulang.
    const updatedContentInfo = await processLocalImages(rawContent, path.dirname(filePath), authClient);
    rawContent = updatedContentInfo; // rawContent sekarang berisi URL Drive

    // Karena rawContent berubah, kita parse ulang untuk mendapatkan body yang ter-update
    const newParsed = matter(rawContent);
    const meta = newParsed.data;
    let markdownBody = newParsed.content;

    // 2. Persiapan Metadata
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

    if (meta.description) {
        postBody.customMetaData = meta.description.substring(0, 150); // Maksimal 150 karakter untuk SEO Blogger
    }

    if (publishedDate) {
        postBody.published = publishedDate; // ISO-8601 string
    }

    // Hitung Hash dari konten yang relevan untuk mendeteksi perubahan
    const dataToHash = `${title}|${meta.description || ''}|${meta.slug || ''}|${labels.join(',')}|${markdownBody}|${isDraft}|${publishedDate || ''}`;
    const currentHash = crypto.createHash('md5').update(dataToHash).digest('hex');
    const existingHash = meta.content_hash;

    try {
        if (existingPostId) {
            if (existingHash === currentHash) {
                console.log(`[SKIP] Tidak ada perubahan terdeteksi pada artikel (ID: ${existingPostId}). Melewati...`);
                return; // Keluar dari fungsi ini tanpa hit API
            }

            console.log(`[UPDATE] Memperbarui artikel (ID: ${existingPostId})...`);
            const response = await blogger.posts.patch({
                blogId: BLOG_ID,
                postId: existingPostId,
                requestBody: postBody
            });
            console.log(`✅ BERHASIL Diperbarui: ${response.data.url}`);

            const nowIso = new Date().toISOString();
            if (rawContent.includes('updated_at:')) {
                rawContent = rawContent.replace(/(updated_at:\s*['"]?)[^'"]+(['"]?)/, `$1${nowIso}$2`);
            } else {
                rawContent = rawContent.replace(/(blogger_id:\s*['"]?[^'"]+['"]?)/, `$1\nupdated_at: "${nowIso}"`);
            }
            
            // Simpan hash terbaru
            if (rawContent.includes('content_hash:')) {
                rawContent = rawContent.replace(/(content_hash:\s*['"]?)[^'"]+(['"]?)/, `$1${currentHash}$2`);
            } else {
                rawContent = rawContent.replace(/(blogger_id:\s*['"]?[^'"]+['"]?)/, `$1\ncontent_hash: "${currentHash}"`);
            }

            fs.writeFileSync(filePath, rawContent, 'utf8');
        } else {
            console.log(`[BARU] Mengunggah artikel baru...`);
            
            // Custom Slug Logic: Blogger membuat permalink permanen dari Judul saat post PERTAMA KALI DIPUBLISH.
            const initialTitle = meta.slug ? meta.slug : title;
            
            const response = await blogger.posts.insert({
                blogId: BLOG_ID,
                isDraft: isDraft, // Tetap gunakan status draft aslinya
                requestBody: { ...postBody, title: initialTitle }
            });
            
            const newPostId = response.data.id;
            console.log(`✅ BERHASIL Diunggah. ID Baru: ${newPostId}`);
            
            let finalUrl = response.data.url;

            // Jika menggunakan Custom Slug, kita Patch untuk mengembalikan Judul Aslinya
            if (meta.slug) {
                console.log(`[SEO] Menyesuaikan slug menjadi "${meta.slug}" dan mengembalikan judul asli...`);
                // Kembalikan judul asli
                const patchRes = await blogger.posts.patch({
                    blogId: BLOG_ID,
                    postId: newPostId,
                    requestBody: { title: title } // Cukup update title saja
                });
                finalUrl = patchRes.data.url;
            }

            console.log(`🔗 URL: ${finalUrl || 'Tersimpan di Draft'}`);
            
            let newContent;
            if (rawContent.startsWith('---')) {
                newContent = rawContent.replace(/^---\r?\n/, `---\nblogger_id: "${newPostId}"\ncontent_hash: "${currentHash}"\n`);
            } else {
                newContent = `---\nblogger_id: "${newPostId}"\ncontent_hash: "${currentHash}"\n---\n\n${rawContent}`;
            }
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

async function runBulkPublisher(targetDir) {
    const authClient = getAuthenticatedClient();
    
    console.log(`Mencari file markdown di: ${targetDir}`);
    if (!fs.existsSync(targetDir)) {
        console.error(`❌ Folder/File ${targetDir} tidak ditemukan!`);
        process.exit(1);
    }

    let mdFiles = [];
    const stat = fs.statSync(targetDir);
    
    if (stat.isDirectory()) {
        mdFiles = globSync('**/*.md', { cwd: targetDir, absolute: true });
    } else if (targetDir.endsWith('.md')) {
        mdFiles = [path.resolve(targetDir)];
    }
    
    if (mdFiles.length === 0) {
        console.log("Peringatan: Tidak ada file .md ditemukan.");
        return;
    }

    console.log(`Menemukan ${mdFiles.length} file markdown. Memulai proses...\n`);

    for (let i = 0; i < mdFiles.length; i++) {
        await processFile(mdFiles[i], authClient);
        
        if (i < mdFiles.length - 1) {
            console.log("⏳ Menunggu 3 detik agar aman dari pemblokiran API...");
            await delay(3000); 
        }
    }
    
    console.log(`\n🎉 PROSES BULK SELESAI!`);
}

module.exports = {
  runBulkPublisher
};

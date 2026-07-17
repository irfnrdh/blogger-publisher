const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { marked } = require('marked');
const matter = require('gray-matter');
const { globSync } = require('glob');
const { getAuthenticatedClient } = require('./auth');
const { uploadImage } = require('./uploader');
const { loadConfig } = require('./config');
const { FrontmatterSchema } = require('./schema');
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
        const cdnUrl = await uploadImage(authClient, absoluteImagePath);
        
        newContent = newContent.replace(fullMatch, `![${altText}](${cdnUrl})`);
      } catch (error) {
        console.warn(`    ⚠️ Melewati gambar ${imagePath} karena error upload.`);
      }
    }
  }

  return newContent;
}

async function processFile(filePath, authClient, cliBlogId) {
    console.log(`\n========================================`);
    const isStdin = filePath === '-';
    console.log(`📄 Memproses: ${isStdin ? 'STDIN' : path.basename(filePath)}`);
    
    let rawContent = '';
    if (isStdin) {
        const chunks = [];
        for await (const chunk of process.stdin) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        rawContent = Buffer.concat(chunks).toString('utf8');
    } else {
        rawContent = fs.readFileSync(filePath, 'utf8');
    }
    
    let parsed = matter(rawContent);
    const parsedData = FrontmatterSchema.safeParse(parsed.data);
    if (!parsedData.success) {
        console.error(`❌ Validasi Frontmatter gagal pada ${isStdin ? 'STDIN' : filePath}:`);
        parsedData.error.errors.forEach(err => {
            console.error(`   - ${err.path.join('.')}: ${err.message}`);
        });
        return;
    }
    
    let meta = parsedData.data;
    const config = loadConfig();
    const BLOG_ID = meta.blog_id || cliBlogId || config.blogId;
    if (!BLOG_ID) {
        console.error(`❌ GAGAL: BLOG_ID tidak ditemukan!`);
        return;
    }
    const blogger = google.blogger({ version: 'v3', auth: authClient });

    // Cek Delete Status
    const isDeleted = meta.status && meta.status.toLowerCase() === 'deleted';
    const existingPostId = meta.blogger_id;

    if (isDeleted) {
        if (existingPostId) {
            console.log(`[DELETE] Menghapus artikel dari Blogger (ID: ${existingPostId})...`);
            try {
                await blogger.posts.delete({ blogId: BLOG_ID, postId: existingPostId });
                console.log(`✅ BERHASIL Dihapus dari Blogger.`);
            } catch (err) {
                console.error(`⚠️ Gagal menghapus di Blogger (mungkin sudah terhapus). Pesan: ${err.message}`);
            }
        }
        console.log(`🗑️ Menghapus file lokal: ${isStdin ? 'STDIN' : path.basename(filePath)}`);
        if (!isStdin) fs.unlinkSync(filePath);
        return; // Selesai
    }
    // 1. Ganti gambar lokal dengan gambar CDN
    // Kita juga meng-update rawContent agar URL CDN tersimpan permanen di file .md
    // Sehingga tidak terjadi re-upload gambar yang sama saat script dijalankan ulang.
    const updatedContentInfo = await processLocalImages(rawContent, path.dirname(filePath), authClient);
    rawContent = updatedContentInfo; // rawContent sekarang berisi URL Drive

    // Karena rawContent berubah, kita parse ulang
    parsed = matter(rawContent);
    meta = parsed.data;
    let markdownBody = parsed.content;

    // 2. Persiapan Metadata
    const title = meta.title || 'Tanpa Judul';
    const labels = meta.labels || [];
    const isDraft = meta.status && meta.status.toLowerCase() === 'draft';
    const publishedDate = meta.date ? new Date(meta.date).toISOString() : null;
    const lastHash = meta.content_hash;
    
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
            console.log(`✅ BERHASIL Diperbarui: ${response.data.url || 'Tersimpan di Draft'}`);

            // Jika status sekarang "draft" (dan aslinya publish), kembalikan ke draft via API
            if (isDraft) {
                console.log(`[REVERT] Mengubah artikel menjadi Draft...`);
                try {
                    await blogger.posts.revert({ blogId: BLOG_ID, postId: existingPostId });
                    console.log(`✅ BERHASIL ditarik ke Draft.`);
                } catch(e) { /* Abaikan jika sudah draft */ }
            } else {
                // Pastikan dipublish jika dulunya draft tapi sekarang tidak
                try {
                    await blogger.posts.publish({ blogId: BLOG_ID, postId: existingPostId });
                } catch(e) { /* Abaikan jika sudah publish */ }
            }

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

            if (!isStdin) {
                fs.writeFileSync(filePath, rawContent, 'utf8');
            } else {
                console.log(`[INFO] Artikel diperbarui, tetapi karena sumber dari STDIN, metadata tidak disimpan ke disk lokal.`);
            }
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
            if (!isStdin) {
                fs.writeFileSync(filePath, newContent, 'utf8');
            } else {
                console.log(`[INFO] Artikel diunggah, tetapi karena sumber dari STDIN, metadata tidak disimpan ke disk lokal.`);
            }
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

async function runBulkPublisher(targetDir, customBlogId) {
    const authClient = getAuthenticatedClient();
    
    if (targetDir === '-') {
        console.log(`📖 Membaca dari STDIN (Piping Mode)...`);
        await processFile('-', authClient, customBlogId);
        console.log(`\n🎉 PROSES STDIN SELESAI!`);
        return;
    }

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
        await processFile(mdFiles[i], authClient, customBlogId);
        
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

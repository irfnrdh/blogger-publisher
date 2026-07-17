const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const TurndownService = require('turndown');
const crypto = require('crypto');
const { getAuthenticatedClient } = require('./auth');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runPuller(targetDir, customBlogId) {
    const authClient = getAuthenticatedClient();
    
    const BLOG_ID = customBlogId || process.env.BLOG_ID;
    if (!BLOG_ID) {
        console.error("❌ ERROR: BLOG_ID tidak ditemukan (lewat CLI maupun .env)");
        process.exit(1);
    }

    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    console.log(`\n========================================`);
    console.log(`📥 Menarik (Pull) artikel dari Blogger (ID: ${BLOG_ID})`);
    console.log(`📁 Target folder: ${targetDir}`);
    console.log(`========================================\n`);

    const blogger = google.blogger({ version: 'v3', auth: authClient });
    const turndownService = new TurndownService({ headingStyle: 'atx' });

    let nextPageToken = null;
    let totalPulled = 0;

    do {
        try {
            const res = await blogger.posts.list({
                blogId: BLOG_ID,
                maxResults: 20, // max per page
                pageToken: nextPageToken || undefined,
                fetchBodies: true,
                fetchImages: true,
                status: ['live', 'draft', 'scheduled'] // Coba huruf kecil
            });

            const posts = res.data.items || [];
            
            for (const post of posts) {
                // 1. Ekstrak Slug dari URL
                let slug = '';
                if (post.url) {
                    const match = post.url.match(/\/([^\/]+)\.html$/);
                    if (match) slug = match[1];
                }

                // 2. Convert HTML to Markdown
                const markdownBody = turndownService.turndown(post.content || '');
                
                // 3. Siapkan Meta data
                const title = post.title || 'Tanpa Judul';
                const description = post.customMetaData || '';
                const labels = post.labels || [];
                // API Blogger v3: Jika status DRAFT tidak ada url, jika belum dipublish.
                // Status tidak diberikan secara eksplisit di items kecuali kita parse properti.
                // Blogger membedakan draft jika URL kosong atau melalui get() khusus, tapi kita anggap LIVE by default jika tak tahu, 
                // kecuali kita cek properti yang menandakannya. Sayangnya API list tidak selalu punya `status`.
                // Namun karena kita meminta semua status, kita akan anggap LIVE jika punya url.
                const isDraft = !post.url;
                const publishedDate = post.published || post.updated;
                
                const metaDraft = isDraft ? `\nstatus: "draft"` : '';
                const metaSlug = slug ? `\nslug: "${slug}"` : '';
                const metaDesc = description ? `\ndescription: "${description}"` : '';
                const metaLabels = labels.length > 0 ? `\nlabels: ${JSON.stringify(labels)}` : '';
                const metaBlogId = customBlogId ? `\nblog_id: "${customBlogId}"` : '';
                
                // 4. Hitung Hash yang sama seperti publisher
                const dataToHash = `${title}|${description}|${slug}|${labels.join(',')}|${markdownBody}|${isDraft}|${publishedDate || ''}`;
                const currentHash = crypto.createHash('md5').update(dataToHash).digest('hex');

                // 5. Buat Frontmatter
                const frontmatter = `---
title: "${title.replace(/"/g, '\\"')}"${metaSlug}${metaDesc}${metaLabels}${metaDraft}
date: "${publishedDate}"
blogger_id: "${post.id}"${metaBlogId}
content_hash: "${currentHash}"
---

${markdownBody}`;

                // 6. Tentukan Nama File
                const safeTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                const fileName = slug ? `${slug}.md` : `${safeTitle || post.id}.md`;
                const filePath = path.join(targetDir, fileName);

                fs.writeFileSync(filePath, frontmatter, 'utf8');
                console.log(`✅ [PULL] Menyimpan: ${fileName}`);
                totalPulled++;
            }

            nextPageToken = res.data.nextPageToken;
            
            if (nextPageToken) {
                console.log("⏳ Menunggu sejenak sebelum fetch halaman selanjutnya...");
                await delay(2000);
            }

        } catch (error) {
            console.error("❌ GAGAL melakukan pull data:", error.message);
            break;
        }
    } while (nextPageToken);

    console.log(`\n🎉 PROSES PULL SELESAI! Total ${totalPulled} artikel berhasil di-download.`);
}

module.exports = {
    runPuller
};

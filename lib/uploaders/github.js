const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

async function uploadImageToGitHub(authClient, localFilePath) {
    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO; // format: username/repo

    if (!token || !repo) {
        throw new Error("GITHUB_TOKEN atau GITHUB_REPO tidak ditemukan di .env");
    }

    if (!fs.existsSync(localFilePath)) {
        throw new Error(`File gambar tidak ditemukan: ${localFilePath}`);
    }

    const fileName = path.basename(localFilePath);
    
    // Gunakan hash agar tidak bentrok jika nama sama
    const fileBuffer = fs.readFileSync(localFilePath);
    const hash = crypto.createHash('md5').update(fileBuffer).digest('hex').substring(0, 8);
    const uniqueFileName = `${hash}-${fileName}`;
    const imageBase64 = fileBuffer.toString('base64');
    
    // Simpan di folder "images" di dalam repo
    const gitPath = `images/${uniqueFileName}`;

    console.log(`    ⬆️ Uploading ${fileName} ke GitHub (${repo})...`);

    try {
        const url = `https://api.github.com/repos/${repo}/contents/${gitPath}`;
        
        const response = await axios.put(url, {
            message: `Auto-upload: ${uniqueFileName}`,
            content: imageBase64
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Blogger-Publisher'
            }
        });

        // Kembalikan URL jsDelivr sebagai CDN (lebih cepat dari raw.githubusercontent)
        // Format: https://cdn.jsdelivr.net/gh/user/repo@main/path
        const directUrl = `https://cdn.jsdelivr.net/gh/${repo}/${gitPath}`;
        console.log(`    ✅ Upload sukses: ${directUrl}`);
        return directUrl;

    } catch (error) {
        console.error(`    ❌ Gagal upload gambar ${fileName} ke GitHub:`, error.message);
        throw error;
    }
}

module.exports = {
    upload: uploadImageToGitHub
};

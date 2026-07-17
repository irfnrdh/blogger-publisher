const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function uploadImageToImgBB(authClient, localFilePath) {
    const apiKey = process.env.IMGBB_API_KEY;
    if (!apiKey) {
        throw new Error("IMGBB_API_KEY tidak ditemukan di .env");
    }

    if (!fs.existsSync(localFilePath)) {
        throw new Error(`File gambar tidak ditemukan: ${localFilePath}`);
    }

    const fileName = path.basename(localFilePath);
    console.log(`    ⬆️ Uploading ${fileName} ke ImgBB...`);

    try {
        const imageBase64 = fs.readFileSync(localFilePath, { encoding: 'base64' });
        
        // Buat form data menggunakan URLSearchParams untuk API ImgBB
        const params = new URLSearchParams();
        params.append('key', apiKey);
        params.append('image', imageBase64);
        // params.append('name', fileName); // Opsional

        const response = await axios.post('https://api.imgbb.com/1/upload', params.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (response.data && response.data.success) {
            const directUrl = response.data.data.url;
            console.log(`    ✅ Upload sukses: ${directUrl}`);
            return directUrl;
        } else {
            throw new Error(response.data.error.message || "Unknown error from ImgBB");
        }
    } catch (error) {
        console.error(`    ❌ Gagal upload gambar ${fileName} ke ImgBB:`, error.message);
        throw error;
    }
}

module.exports = {
    upload: uploadImageToImgBB
};

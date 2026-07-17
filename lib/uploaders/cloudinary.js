const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

async function uploadImageToCloudinary(authClient, localFilePath) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error("CLOUDINARY credential tidak lengkap di .env");
    }

    if (!fs.existsSync(localFilePath)) {
        throw new Error(`File gambar tidak ditemukan: ${localFilePath}`);
    }

    cloudinary.config({ 
        cloud_name: cloudName, 
        api_key: apiKey, 
        api_secret: apiSecret,
        secure: true
    });

    const fileName = path.basename(localFilePath);
    console.log(`    ⬆️ Uploading ${fileName} ke Cloudinary...`);

    try {
        const result = await cloudinary.uploader.upload(localFilePath, {
            folder: "blogger-publisher",
            use_filename: true,
            unique_filename: false,
            overwrite: true
        });

        const directUrl = result.secure_url;
        console.log(`    ✅ Upload sukses: ${directUrl}`);
        return directUrl;

    } catch (error) {
        console.error(`    ❌ Gagal upload gambar ${fileName} ke Cloudinary:`, error.message || error);
        throw error;
    }
}

module.exports = {
    upload: uploadImageToCloudinary
};

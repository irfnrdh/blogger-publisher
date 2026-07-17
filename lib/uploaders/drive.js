const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

/**
 * Upload gambar lokal ke Google Drive dan dapatkan link publiknya.
 * @param {Object} authClient - OAuth2 Client yang sudah terautentikasi
 * @param {string} localFilePath - Path absolut ke file gambar
 * @returns {Promise<string>} URL publik gambar
 */
async function uploadImageToDrive(authClient, localFilePath) {
  const drive = google.drive({ version: 'v3', auth: authClient });
  
  if (!fs.existsSync(localFilePath)) {
    throw new Error(`File gambar tidak ditemukan: ${localFilePath}`);
  }

  const fileName = path.basename(localFilePath);
  
  // Tentukan MIME type sederhana
  let mimeType = 'image/jpeg';
  if (fileName.endsWith('.png')) mimeType = 'image/png';
  if (fileName.endsWith('.gif')) mimeType = 'image/gif';
  if (fileName.endsWith('.webp')) mimeType = 'image/webp';

  console.log(`    ⬆️ Uploading ${fileName} ke Google Drive...`);

  try {
    // 1. Upload File
    const res = await drive.files.create({
      requestBody: {
        name: fileName,
        mimeType: mimeType
      },
      media: {
        mimeType: mimeType,
        body: fs.createReadStream(localFilePath)
      }
    });

    const fileId = res.data.id;

    // 2. Set file menjadi Publik agar bisa diakses di web (Blogger)
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    // 3. Kembalikan Direct URL Image
    // Menggunakan endpoint /thumbnail agar gambar bisa di-embed (tidak diblokir oleh kebijakan cookie Google yang baru)
    const directUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
    console.log(`    ✅ Upload sukses: ${directUrl}`);
    return directUrl;

  } catch (error) {
    console.error(`    ❌ Gagal upload gambar ${fileName} ke Drive:`, error.message);
    throw error;
  }
}

module.exports = {
  uploadImageToDrive
};

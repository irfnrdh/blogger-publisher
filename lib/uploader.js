const fs = require('fs');
const driveUploader = require('./uploaders/drive');
const imgbbUploader = require('./uploaders/imgbb');
const cloudinaryUploader = require('./uploaders/cloudinary');
const githubUploader = require('./uploaders/github');
const { loadConfig } = require('./config');

function imageContentTypeFromBytes(data) {
  if (data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (data[0] === 255 && data[1] === 216 && data[2] === 255) return "image/jpeg";
  const gifHeader = data.subarray(0, 6).toString("ascii");
  if (gifHeader === "GIF87a" || gifHeader === "GIF89a") return "image/gif";
  if (data.subarray(0, 4).toString("ascii") === "RIFF" && data.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  const svgHeader = data.subarray(0, 512).toString("utf8").trimStart().toLowerCase();
  if (svgHeader.startsWith("<svg") || (svgHeader.startsWith("<?xml") && svgHeader.includes("<svg"))) return "image/svg+xml";
  return null;
}

/**
 * Memilih uploader yang tepat berdasarkan config
 */
async function uploadImage(authClient, localFilePath) {
    const data = fs.readFileSync(localFilePath);
    const mimeType = imageContentTypeFromBytes(data);
    if (!mimeType) {
      throw new Error(`File ${localFilePath} bukan merupakan file gambar yang valid (Magic bytes mismatch).`);
    }

    const config = loadConfig();
    const provider = (config.imageProvider || 'drive').toLowerCase();

    switch (provider) {
        case 'imgbb':
            return await imgbbUploader.upload(authClient, localFilePath);
        case 'cloudinary':
            return await cloudinaryUploader.upload(authClient, localFilePath);
        case 'github':
            return await githubUploader.upload(authClient, localFilePath);
        case 'drive':
        default:
            // Karena nama fungsinya di drive.js adalah uploadImageToDrive, kita pakai fungsi aslinya
            // (Kita harus ubah module.exports di drive.js atau panggil dari sini)
            if (driveUploader.upload) {
                return await driveUploader.upload(authClient, localFilePath);
            } else if (driveUploader.uploadImageToDrive) {
                return await driveUploader.uploadImageToDrive(authClient, localFilePath);
            }
            throw new Error("Module drive.js tidak memiliki fungsi upload yang valid");
    }
}

module.exports = {
    uploadImage
};

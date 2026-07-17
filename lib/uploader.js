const driveUploader = require('./uploaders/drive');
const imgbbUploader = require('./uploaders/imgbb');
const cloudinaryUploader = require('./uploaders/cloudinary');
const githubUploader = require('./uploaders/github');

/**
 * Memilih uploader yang tepat berdasarkan .env
 */
async function uploadImage(authClient, localFilePath) {
    const provider = (process.env.IMAGE_PROVIDER || 'drive').toLowerCase();

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

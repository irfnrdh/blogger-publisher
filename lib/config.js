const fs = require('fs');
const os = require('os');
const path = require('path');

const configDir = path.join(os.homedir(), '.blogger-publisher');
const configPath = path.join(configDir, 'config.json');

function loadConfig() {
  // Fallback to reading .env if global config doesn't exist yet, 
  // to maintain backward compatibility during migration.
  require('dotenv').config();

  let fileConfig = {};
  if (fs.existsSync(configPath)) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
      fileConfig = {};
    }
  }

  // Merge ENV variables with global config. Env vars take precedence.
  return {
    clientId: process.env.CLIENT_ID || fileConfig.clientId,
    clientSecret: process.env.CLIENT_SECRET || fileConfig.clientSecret,
    refreshToken: process.env.REFRESH_TOKEN || fileConfig.refreshToken,
    blogId: process.env.BLOG_ID || fileConfig.blogId,
    imageProvider: process.env.IMAGE_PROVIDER || fileConfig.imageProvider || 'drive',
    imgbbApiKey: process.env.IMGBB_API_KEY || fileConfig.imgbbApiKey,
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || fileConfig.cloudinaryCloudName,
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || fileConfig.cloudinaryApiKey,
    cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || fileConfig.cloudinaryApiSecret,
    githubToken: process.env.GITHUB_TOKEN || fileConfig.githubToken,
    githubRepo: process.env.GITHUB_REPO || fileConfig.githubRepo
  };
}

function saveConfig(newConfig) {
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const currentConfig = loadConfig();
  const mergedConfig = { ...currentConfig, ...newConfig };

  fs.writeFileSync(configPath, JSON.stringify(mergedConfig, null, 2), 'utf8');
  // Set restricted permissions since this contains secrets
  fs.chmodSync(configPath, 0o600); 
  return mergedConfig;
}

module.exports = {
  loadConfig,
  saveConfig,
  configPath
};

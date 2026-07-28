const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// Configure Cloudinary from environment variables
function isCloudinaryConfigured() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  return Boolean(
    CLOUDINARY_CLOUD_NAME && 
    CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' &&
    CLOUDINARY_API_KEY && 
    CLOUDINARY_API_KEY !== 'your_api_key' &&
    CLOUDINARY_API_SECRET && 
    CLOUDINARY_API_SECRET !== 'your_api_secret'
  );
}

function initCloudinary() {
  if (isCloudinaryConfigured()) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });
  }
}

initCloudinary();

/**
 * Uploads an MP3 audio file to Cloudinary.
 * Returns secure_url string.
 */
async function uploadAudio(filePath, ytId) {
  initCloudinary();
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary credentials are not configured in server/.env file.');
  }

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'video', // Audio files in Cloudinary use resource_type: 'video'
      folder: 'vividmusic/songs',
      public_id: `song_${ytId}`,
      overwrite: true
    });

    return result.secure_url;
  } catch (error) {
    throw new Error(`Cloudinary audio upload failed: ${error.message}`);
  }
}

/**
 * Uploads a cover thumbnail image to Cloudinary.
 * Returns secure_url string.
 */
async function uploadImage(filePath, ytId) {
  initCloudinary();
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary credentials are not configured in server/.env file.');
  }

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'image',
      folder: 'vividmusic/covers',
      public_id: `cover_${ytId}`,
      overwrite: true
    });

    return result.secure_url;
  } catch (error) {
    throw new Error(`Cloudinary cover image upload failed: ${error.message}`);
  }
}

module.exports = {
  isCloudinaryConfigured,
  uploadAudio,
  uploadImage
};

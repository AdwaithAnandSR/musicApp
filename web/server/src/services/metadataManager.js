const fs = require('fs');
const path = require('path');

const DEFAULT_DOWNLOADS_DIR = path.resolve(__dirname, '../../../downloads');

/**
 * Ensures the downloads directory structure exists.
 */
function initStorage(downloadsDir = DEFAULT_DOWNLOADS_DIR) {
  const dir = downloadsDir || DEFAULT_DOWNLOADS_DIR;
  const songsDir = path.join(dir, 'songs');
  const coversDir = path.join(dir, 'covers');

  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(songsDir)) fs.mkdirSync(songsDir, { recursive: true });
  if (!fs.existsSync(coversDir)) fs.mkdirSync(coversDir, { recursive: true });

  const metadataFile = path.join(dir, 'metadata.json');
  if (!fs.existsSync(metadataFile)) {
    fs.writeFileSync(metadataFile, JSON.stringify([], null, 2), 'utf8');
  }
}

/**
 * Gets all metadata records.
 */
function getMetadata(downloadsDir = DEFAULT_DOWNLOADS_DIR) {
  const dir = downloadsDir || DEFAULT_DOWNLOADS_DIR;
  const metadataFile = path.join(dir, 'metadata.json');
  try {
    if (!fs.existsSync(metadataFile)) return [];
    const content = fs.readFileSync(metadataFile, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error('[Metadata] Error reading metadata.json:', err.message);
    return [];
  }
}

/**
 * Adds or updates a song record in metadata.json.
 */
function saveSongMetadata(downloadsDir = DEFAULT_DOWNLOADS_DIR, songData = {}) {
  const dir = downloadsDir || DEFAULT_DOWNLOADS_DIR;
  const metadataFile = path.join(dir, 'metadata.json');
  const list = getMetadata(dir);

  const existingIndex = list.findIndex(item => item.ytId === songData.ytId);
  const updatedEntry = {
    ...songData,
    updatedAt: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    list[existingIndex] = updatedEntry;
  } else {
    list.push(updatedEntry);
  }

  fs.writeFileSync(metadataFile, JSON.stringify(list, null, 2), 'utf8');
  return updatedEntry;
}

module.exports = {
  initStorage,
  getMetadata,
  saveSongMetadata
};

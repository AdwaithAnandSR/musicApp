const axios = require('axios');

const API_BASE = process.env.VIVID_MUSIC_API_BASE || 'https://vivid-music.vercel.app/temp';
const IS_EXISTS_URL = `${API_BASE}/isExists`;
const ADD_SONG_URL = `${API_BASE}/addSong`;

/**
 * Calls POST /isExists with { title, ytId } to check if a song exists in VividMusic DB.
 * Returns true if song exists, false otherwise.
 */
async function checkIsExists(ytId, title = '') {
  try {
    const response = await axios.post(
      IS_EXISTS_URL,
      { title, ytId },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      }
    );

    const data = response.data;
    if (typeof data === 'boolean') return data;

    if (data && typeof data === 'object') {
      if (typeof data.isExists === 'boolean') return data.isExists;
      if (typeof data.exists === 'boolean') return data.exists;
      if (typeof data.data?.isExists === 'boolean') return data.data.isExists;
      if (typeof data.data?.exists === 'boolean') return data.data.exists;
      if (data.status === 'exists' || data.message === 'exists') return true;
    }

    return false;
  } catch (error) {
    console.error(`[DB Check] Error querying ${IS_EXISTS_URL} for ytId ${ytId}:`, error.message);
    // On error, default to false to proceed with pipeline
    return false;
  }
}

/**
 * Calls POST /addSong to save newly uploaded song details into VividMusic DB.
 * Payload: { title, artist, url, cover, duration, ytId, lang }
 */
async function addSongToDb({ title, artist, url, cover, duration = 0, ytId, lang = 'English' }) {
  try {
    const response = await axios.post(
      ADD_SONG_URL,
      {
        title,
        artist: artist || 'Unknown Artist',
        url,
        cover,
        duration: Number(duration) || 0,
        ytId,
        lang
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000
      }
    );

    return response.data;
  } catch (error) {
    throw new Error(`Failed to store song in VividMusic database (${ADD_SONG_URL}): ${error.message}`);
  }
}

module.exports = {
  checkIsExists,
  addSongToDb
};

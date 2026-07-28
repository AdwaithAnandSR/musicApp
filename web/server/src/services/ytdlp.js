const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

/**
 * Resolve absolute path to yt-dlp executable if available, or fallback to 'yt-dlp'
 */
function getYtDlpCmd() {
  if (process.env.YTDLP_PATH && fs.existsSync(process.env.YTDLP_PATH)) {
    return process.env.YTDLP_PATH;
  }
  const possiblePaths = [
    path.resolve(__dirname, '../../bin/yt-dlp'),
    path.resolve(process.cwd(), 'bin/yt-dlp'),
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp',
    '/data/data/com.termux/files/usr/bin/yt-dlp',
    path.join(process.env.HOME || '/root', '.local/bin/yt-dlp')
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return 'yt-dlp';
}

function getSpawnOptions() {
  const binDir = path.resolve(__dirname, '../../bin');
  const cwdBinDir = path.resolve(process.cwd(), 'bin');
  const customPath = `${binDir}:${cwdBinDir}:/usr/local/bin:/usr/bin:/bin:/usr/local/games:/usr/games:~/.local/bin:/data/data/com.termux/files/usr/bin`;
  return {
    env: {
      ...process.env,
      PATH: process.env.PATH ? `${binDir}:${cwdBinDir}:${process.env.PATH}:${customPath}` : customPath
    }
  };
}

/**
 * Common yt-dlp arguments required by project specification
 */
const BASE_YTDLP_FLAGS = [
  '--no-cookies',
  '--no-cookies-from-browser',
  '--js-runtimes', 'node',
  '--extractor-args', 'youtube:player_client=android'
];

const { parseUrls } = require('./urlUtils');

/**
 * Extracts metadata for YouTube URL(s) (video, playlist, or channel)
 * Accepts a single URL string or an array of URL strings: ['url1', 'url2', ...]
 * Returns an array of items: [{ ytId, title, url, duration, channel, thumbnail }]
 */
async function extractMetadata(youtubeInput) {
  const urls = parseUrls(youtubeInput);

  if (!urls || urls.length === 0) {
    return Promise.reject(new Error('A valid YouTube URL or array of YouTube URLs is required.'));
  }

  return new Promise((resolve, reject) => {
    const args = [
      ...BASE_YTDLP_FLAGS,
      '--flat-playlist',
      '--dump-json',
      '--ignore-errors',
      ...urls
    ];

    const child = spawn(getYtDlpCmd(), args, getSpawnOptions());
    let stdoutData = '';
    let stderrData = '';

    child.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    child.on('close', (code) => {
      if (code !== 0 && !stdoutData.trim()) {
        return reject(new Error(`yt-dlp metadata extraction failed: ${stderrData.trim() || 'Unknown error'}`));
      }

      const items = [];
      const lines = stdoutData.split('\n').filter(line => line.trim().length > 0);
      const seenYtIds = new Set();

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          // Extract YouTube ID
          const ytId = parsed.id || (parsed.url && parsed.url.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/)?.[1]);
          if (!ytId) continue;

          // Deduplicate within the extracted list if the same video appears multiple times
          if (seenYtIds.has(ytId)) continue;
          seenYtIds.add(ytId);

          // Thumbnail selection
          let thumbnail = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
          if (parsed.thumbnails && parsed.thumbnails.length > 0) {
            thumbnail = parsed.thumbnails[parsed.thumbnails.length - 1].url || thumbnail;
          }

          items.push({
            ytId,
            title: parsed.title || parsed.fulltitle || `Song ${ytId}`,
            url: parsed.url || parsed.webpage_url || `https://www.youtube.com/watch?v=${ytId}`,
            duration: parsed.duration || 0,
            channel: parsed.uploader || parsed.channel || parsed.uploader_id || 'Unknown Artist',
            thumbnail
          });
        } catch (e) {
          // Ignore malformed JSON lines
        }
      }

      if (items.length === 0) {
        return reject(new Error('No valid YouTube tracks or items found in the provided URL(s).'));
      }

      resolve(items);
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to execute yt-dlp: ${err.message}`));
    });
  });
}

/**
 * Downloads audio as MP3 and saves cover thumbnail image locally
 */
async function downloadAudioAndCover(ytId, title, songsDir, coversDir, onLog) {
  const mp3Filename = `${ytId}.mp3`;
  const coverFilename = `${ytId}.jpg`;
  const targetMp3Path = path.join(songsDir, mp3Filename);
  const targetCoverPath = path.join(coversDir, coverFilename);

  // 1. Download cover thumbnail directly via axios
  try {
    const thumbUrls = [
      `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`,
      `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
      `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`
    ];

    let thumbBuffer = null;
    for (const tUrl of thumbUrls) {
      try {
        const resp = await axios.get(tUrl, { responseType: 'arraybuffer', timeout: 5000 });
        if (resp.status === 200 && resp.data.length > 1000) {
          thumbBuffer = resp.data;
          break;
        }
      } catch (e) {
        // try next thumbnail URL
      }
    }

    if (thumbBuffer) {
      fs.writeFileSync(targetCoverPath, thumbBuffer);
      if (onLog) onLog(`Cover saved: ${coverFilename}`);
    }
  } catch (e) {
    if (onLog) onLog(`Warning: Failed to fetch cover thumbnail for ${ytId}: ${e.message}`);
  }

  // 2. Download audio using yt-dlp
  return new Promise((resolve, reject) => {
    const videoUrl = `https://www.youtube.com/watch?v=${ytId}`;
    const outputTemplate = path.join(songsDir, `${ytId}.%(ext)s`);

    const args = [
      ...BASE_YTDLP_FLAGS,
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      '--no-playlist',
      '-o', outputTemplate,
      videoUrl
    ];

    if (onLog) onLog(`Executing yt-dlp for ${ytId}...`);

    const child = spawn(getYtDlpCmd(), args, getSpawnOptions());
    let stderrBuf = '';

    child.stdout.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg && onLog) onLog(`[yt-dlp ${ytId}] ${msg}`);
    });

    child.stderr.on('data', (data) => {
      const msg = data.toString().trim();
      stderrBuf += msg + '\n';
      if (msg && onLog) onLog(`[yt-dlp stderr ${ytId}] ${msg}`);
    });

    child.on('close', (code) => {
      if (code === 0 && fs.existsSync(targetMp3Path)) {
        if (onLog) onLog(`Successfully downloaded audio for ${ytId}`);
        resolve({
          songPath: `downloads/songs/${mp3Filename}`,
          coverPath: fs.existsSync(targetCoverPath) ? `downloads/covers/${coverFilename}` : null
        });
      } else {
        reject(new Error(`yt-dlp audio download failed for ${ytId} (exit code ${code}): ${stderrBuf.trim() || 'File not found'}`));
      }
    });

    child.on('error', (err) => {
      reject(new Error(`yt-dlp process error for ${ytId}: ${err.message}`));
    });
  });
}

module.exports = {
  extractMetadata,
  downloadAudioAndCover
};

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
  '--extractor-args', 'youtube:player_client=mweb,android,web'
];

const { parseUrls } = require('./urlUtils');

/**
 * Helper to fetch single YouTube video metadata via official oEmbed API
 */
async function fetchOembedMetadata(ytId) {
  try {
    const videoUrl = `https://www.youtube.com/watch?v=${ytId}`;
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
    const resp = await axios.get(oembedUrl, { timeout: 8000 });
    if (resp.status === 200 && resp.data) {
      return {
        ytId,
        title: resp.data.title || `Song ${ytId}`,
        url: videoUrl,
        duration: 0,
        channel: resp.data.author_name || 'Unknown Artist',
        thumbnail: resp.data.thumbnail_url || `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
      };
    }
  } catch (err) {
    // oembed fallback failed
  }
  return null;
}

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

  // Collect direct YouTube video IDs if present for oEmbed fallback
  const directYtIds = [];
  for (const u of urls) {
    const matches = u.match(/(?:v=|\/|vi=)([a-zA-Z0-9_-]{11})/g);
    if (matches) {
      for (const m of matches) {
        const id = m.replace(/^(?:v=|\/|vi=)/, '');
        if (id && id.length === 11 && !directYtIds.includes(id)) {
          directYtIds.push(id);
        }
      }
    }
  }

  return new Promise(async (resolve, reject) => {
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

    child.on('close', async (code) => {
      const items = [];
      const lines = stdoutData.split('\n').filter(line => line.trim().length > 0);
      const seenYtIds = new Set();

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          const ytId = parsed.id || (parsed.url && parsed.url.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/)?.[1]);
          if (!ytId) continue;
          if (seenYtIds.has(ytId)) continue;
          seenYtIds.add(ytId);

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

      if (items.length > 0) {
        return resolve(items);
      }

      // Fallback: If yt-dlp failed or yielded 0 items, try oEmbed for direct video IDs
      if (directYtIds.length > 0) {
        const fallbackItems = [];
        for (const ytId of directYtIds) {
          const oitem = await fetchOembedMetadata(ytId);
          if (oitem) fallbackItems.push(oitem);
        }
        if (fallbackItems.length > 0) {
          return resolve(fallbackItems);
        }
      }

      const detailedErr = stderrData.trim() || `yt-dlp exited with code ${code} and produced no JSON output.`;
      reject(new Error(`Metadata extraction failed: ${detailedErr}`));
    });

    child.on('error', async (err) => {
      // If spawn failed (e.g. yt-dlp not found), try oEmbed fallback for direct video IDs
      if (directYtIds.length > 0) {
        const fallbackItems = [];
        for (const ytId of directYtIds) {
          const oitem = await fetchOembedMetadata(ytId);
          if (oitem) fallbackItems.push(oitem);
        }
        if (fallbackItems.length > 0) {
          return resolve(fallbackItems);
        }
      }
      reject(new Error(`Failed to execute yt-dlp process: ${err.message}`));
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

  // 2. Helper to run yt-dlp with specific args
  const runYtDlp = (argsList) => {
    return new Promise((resolve, reject) => {
      const child = spawn(getYtDlpCmd(), argsList, getSpawnOptions());
      let stderrBuf = '';
      let stdoutBuf = '';

      child.stdout.on('data', (data) => {
        const msg = data.toString().trim();
        stdoutBuf += msg + '\n';
        if (msg && onLog) onLog(`[yt-dlp ${ytId}] ${msg}`);
      });

      child.stderr.on('data', (data) => {
        const msg = data.toString().trim();
        stderrBuf += msg + '\n';
        if (msg && onLog) onLog(`[yt-dlp stderr ${ytId}] ${msg}`);
      });

      child.on('close', (code) => {
        if (code === 0 && fs.existsSync(targetMp3Path)) {
          resolve({
            songPath: `downloads/songs/${mp3Filename}`,
            coverPath: fs.existsSync(targetCoverPath) ? `downloads/covers/${coverFilename}` : null
          });
        } else {
          reject(new Error(`yt-dlp exit code ${code}. Stderr: ${stderrBuf.trim() || stdoutBuf.trim() || 'No output'}`));
        }
      });

      child.on('error', (err) => {
        reject(new Error(`yt-dlp process spawn error: ${err.message}`));
      });
    });
  };

  const videoUrl = `https://www.youtube.com/watch?v=${ytId}`;
  const outputTemplate = path.join(songsDir, `${ytId}.%(ext)s`);

  // Attempt 1: Standard client args
  const primaryArgs = [
    ...BASE_YTDLP_FLAGS,
    '-x',
    '--audio-format', 'mp3',
    '--audio-quality', '0',
    '--no-playlist',
    '-o', outputTemplate,
    videoUrl
  ];

  if (onLog) onLog(`Executing yt-dlp audio extraction for ${ytId}...`);

  try {
    return await runYtDlp(primaryArgs);
  } catch (primaryErr) {
    if (onLog) onLog(`Primary yt-dlp attempt failed for ${ytId}: ${primaryErr.message}. Retrying with fallback options...`, 'warning');
    
    // Attempt 2: Fallback without extractor args and with no-check-certificates
    const fallbackArgs = [
      '--no-cookies',
      '--no-cookies-from-browser',
      '--no-check-certificates',
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      '--no-playlist',
      '-o', outputTemplate,
      videoUrl
    ];

    try {
      return await runYtDlp(fallbackArgs);
    } catch (fallbackErr) {
      throw new Error(`Audio download failed for ${ytId}. Primary error: ${primaryErr.message}. Fallback error: ${fallbackErr.message}`);
    }
  }
}

module.exports = {
  extractMetadata,
  downloadAudioAndCover
};

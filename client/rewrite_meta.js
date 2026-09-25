const fs = require('fs');
let content = fs.readFileSync('src/services/downloads/downloadService.js', 'utf8');

const regex = /let metaMutex = Promise\.resolve\(\);\n\nconst getMetaFile = \(\) => \{[\s\S]*?const saveMeta = async meta => \{[\s\S]*?console\.log\("Failed to save meta:", e\);\n    \}\n\};/;

const newCode = `let metaMutex = Promise.resolve();

let cachedMeta = null;
let songIdToLocalInfo = new Map();

const buildLookupMap = (meta) => {
    songIdToLocalInfo.clear();
    for (const playlistId in meta.songs) {
        for (const song of meta.songs[playlistId]) {
            if (song.localUrl) {
                songIdToLocalInfo.set(song.id || song._id, {
                    localUrl: song.localUrl,
                    localVideoUrl: song.videoUrl && song.videoUrl.startsWith('file://') ? song.videoUrl : null
                });
            }
        }
    }
};

const getMetaFile = () => {
    const downloadsDir = new Directory(Paths.document, "downloads");
    if (!downloadsDir.exists) downloadsDir.create();
    return new File(downloadsDir, "meta.json");
};

const getMeta = async () => {
    if (cachedMeta) return cachedMeta;
    try {
        const file = getMetaFile();
        if (!file.exists) {
            cachedMeta = { playlists: {}, songs: {} };
            return cachedMeta;
        }
        const content = await file.text();
        cachedMeta = JSON.parse(content);
        buildLookupMap(cachedMeta);
        return cachedMeta;
    } catch (e) {
        return { playlists: {}, songs: {} };
    }
};

const saveMeta = async meta => {
    cachedMeta = meta;
    buildLookupMap(meta);
    try {
        const file = getMetaFile();
        file.write(JSON.stringify(meta));
    } catch (e) {
        console.log("Failed to save meta:", e);
    }
};`;

content = content.replace(regex, newCode);

const regex2 = /export const getLocalUrlForSong = async \(songId\) => \{[\s\S]*?return null;\n\};\n\nexport const getLocalSongInfo = async \(songId\) => \{[\s\S]*?return null;\n\};/;
const newCode2 = `export const getLocalUrlForSong = async (songId) => {
    if (!cachedMeta) await getMeta();
    const info = songIdToLocalInfo.get(songId);
    return info ? info.localUrl : null;
};

export const getLocalSongInfo = async (songId) => {
    if (!cachedMeta) await getMeta();
    return songIdToLocalInfo.get(songId) || null;
};`;

content = content.replace(regex2, newCode2);

fs.writeFileSync('src/services/downloads/downloadService.js', content, 'utf8');

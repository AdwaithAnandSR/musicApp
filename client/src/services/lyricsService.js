import api from "./axios.js";
import { readLocalLyrics } from "./downloads/downloadService.js";

// In-memory cache for lyrics: songId -> { lyrics, lyricsAsText, synced }
const lyricsCache = new Map();

export const getLyricsForTrack = async (track) => {
    if (!track) return null;
    const songId = track._id || track.id;
    if (!songId) return null;

    // 1. If already on track object
    if (track.lyrics && track.lyrics.length > 0) {
        return {
            lyrics: track.lyrics,
            lyricsAsText: track.lyricsAsText || [],
            synced: track.synced || false
        };
    }

    // 2. Check in-memory cache
    if (lyricsCache.has(songId)) {
        return lyricsCache.get(songId);
    }

    // 3. If local/downloaded, check local storage
    if (track.isLocal || (track.url && track.url.startsWith("file://"))) {
        const localData = await readLocalLyrics(songId);
        if (localData) {
            lyricsCache.set(songId, localData);
            return localData;
        }
    }

    // 4. Fetch from server
    try {
        const res = await api.get(`/lyrics/${songId}`);
        const data = {
            lyrics: res.data?.lyrics || [],
            lyricsAsText: res.data?.lyricsAsText || [],
            synced: res.data?.synced || false
        };
        lyricsCache.set(songId, data);
        return data;
    } catch (e) {
        return {
            lyrics: [],
            lyricsAsText: [],
            synced: track.synced || false
        };
    }
};

export default { getLyricsForTrack };

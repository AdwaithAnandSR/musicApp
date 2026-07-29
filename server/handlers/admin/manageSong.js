import musicModel from "../../models/musics.js";
import PlaylistSong from "../../models/playlistSong.js";

export const deleteSong = async (req, res) => {
    try {
        const { id, ids } = req.body;
        const targetIds = ids && ids.length ? ids : (id ? [id] : []);

        if (!targetIds.length) {
            return res.status(400).json({ success: false, message: "No song ID provided" });
        }

        await musicModel.deleteMany({ _id: { $in: targetIds } });
        await PlaylistSong.deleteMany({ songId: { $in: targetIds } });

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.json({ success: false });
    }
};

export const swapLyric = async (req, res) => {
    try {
        const { id } = req.body;

        const song = await musicModel.findById(id);

        const lyric1 = song.lyrics.map(item => item.line),
            lyric2 = song.lyricsAsText.map(line => {
                if (line.trim() != "") return { start: -1, line, end: -1 };
            });

        await musicModel.findByIdAndUpdate(id, {
            $set: {
                lyrics: lyric2,
                lyricsAsText: lyric1,
                synced: false
            }
        });

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.json({ success: false });
    }
};

export const updateArtist = async (req, res) => {
    try {
        const { id, artist } = req.body;

        await musicModel.findByIdAndUpdate(id, { $set: { artist } });

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.json({ success: false });
    }
};

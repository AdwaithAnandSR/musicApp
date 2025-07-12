import musicModel from "../../models/musics.js";

export const getUnSyncedLyrics = async (req, res) => {
    try {
        const { limit, page } = req.body;

        const songs = await musicModel
            .find({
                lyrics: { $not: { $size: 0 } },
                synced: false
            })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        console.log(songs);

        res.json({ songs });
    } catch (e) {
        console.log(e);
        res.status(400).json({ message: "failed" });
    }
};

export const setSyncedSong = async (req, res) => {
    try {
        const { id, syncedLyric, duration } = req.body;


        const song = await musicModel.findByIdAndUpdate(
            id,
            { $set: { lyrics: syncedLyric, duration, synced: true } },
            { new: true, strict: false }
        );

        console.log(song);
        res.json({ success: true });
    } catch (e) {
        console.log(e);
        res.status(400).json({ success: false });
    }
};

export const getSongsToBeSynced = async (req, res) => {
    try {
        const { page, limit = 10 } = req.body;
        const songs = await musicModel
            .find({
                lyrics: { $exists: true, $not: { $size: 0 } },
                synced: false
            })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        // console.log(songs);

        return res.json({ songs });
    } catch (e) {
        console.log(e);
        res.status(400).json({ success: false });
    }
};

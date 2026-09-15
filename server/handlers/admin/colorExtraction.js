import musicModel from "../../models/musics.js";

export const getSongsWithoutColors = async (req, res) => {
    try {
        const { limit = 50 } = req.body;
        const totalRemaining = await musicModel.countDocuments({ colors: { $exists: false } });
        const songs = await musicModel.find({ colors: { $exists: false } }).limit(limit).select('title artist cover url');
        res.json({ success: true, songs, totalRemaining });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const updateSongColors = async (req, res) => {
    try {
        const { id, colors } = req.body;
        if (!id || !colors) {
            return res.status(400).json({ success: false, message: "ID and colors are required" });
        }
        await musicModel.findByIdAndUpdate(id, { $set: { colors } });
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
};

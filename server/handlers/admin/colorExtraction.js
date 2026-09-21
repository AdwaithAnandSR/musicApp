import musicModel from "../../models/musics.js";

export const getSongsWithoutColors = async (req, res) => {
    try {
        const { limit = 50 } = req.body;
        const filter = {
            $or: [
                { colors: { $exists: false } },
                { "colors.dominant": { $exists: false } }
            ]
        };

        const totalRemaining = await musicModel.countDocuments(filter);

        const songs = await musicModel
            .find(filter)
            .limit(limit)
            .select("title artist cover url");

        res.json({ success: true, songs, totalRemaining });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const songs = await musicModel
    .find({
        $or: [
            { colors: { $exists: false } },
            { "colors.dominant": { $exists: false } }
        ]
    })

    .select("title artist cover url");

console.log(await musicModel.find({ ytId: "ZLtrPJgEHp4" }));

console.log(songs);

export const updateSongColors = async (req, res) => {
    try {
        const { id, colors } = req.body;
        if (!id || !colors) {
            return res.status(400).json({
                success: false,
                message: "ID and colors are required"
            });
        }
        await musicModel.findByIdAndUpdate(id, { $set: { colors } });
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
};

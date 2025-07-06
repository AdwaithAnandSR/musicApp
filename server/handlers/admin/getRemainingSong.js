import musicModel from "../../models/musics.js";

const getRemaining = async (req, res) => {
    try {
        const { limit, page } = req.body;

        const songs = await musicModel
            .find({
                $or: [
                    { lyrics: { $exists: false } },
                    { lyrics: null },
                    { lyrics: { $eq: [] } }
                ]
            })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.json({ songs });
    } catch (e) {
        console.log(e);
        res.status(400).json({ message: "failed" });
    }
};

export default getRemaining;

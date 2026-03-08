import playlistModel from "../../models/playlist.js";

const getPlaylists = async (req, res) => {
    try {
        const { page, limit } = req.body;

        const playlists = await playlistModel
            .find({}, { songs: 0 })
            .skip((page - 1) * limit)
            .limit(limit);

        const total = await playlistModel.countDocuments();

        return res.json({
            playlists,
            nextPage: page * limit < total ? page + 1 : null
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "something went wrong"
        });
    }
};
export default getPlaylists;

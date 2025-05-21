import playlistModel from "../../models/playlist.js";

const getPlaylists = async (req, res) => {
    try {
        const playlists = await playlistModel.find({});

        if (playlists)
            return res.json({
                playlists
            });
        else
            return res.status(400).json({
                message: "no playlists exists"
            });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "something went wrong"
        });
    }
};

export default getPlaylists;

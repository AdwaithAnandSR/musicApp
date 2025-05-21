import playlistModel from "../../models/playlist.js";

const deletePlaylist = async (req, res) => {
    try {
        const { id } = req.body;

        const playlist = await playlistModel.findByIdAndDelete(id);

        if (playlist)
            return res.json({
                message: "SUCCESSFULLY_DELETED",
                playlist
            });

        return res.status(401).json({
            message: "PLAYLIST_NOT_FOUND"
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "INTERNAL_ERROR"
        });
    }
};

export default deletePlaylist;

import playlistModel from "../../models/playlist.js";

const create = async (req, res) => {
    try {
        const { name, desc } = req.body;

        const existPlaylist = await playlistModel.findOne({ name });

        if (existPlaylist)
            return res.status(405).json({
                message: "playlist already exists"
            });

        const playlist = await playlistModel.create({
            name,
            description: desc
        });

        if (playlist)
            return res.status(200).json({
                message: "playlist created",
                playlist
            });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "something went wrong"
        });
    }
};

export default create;

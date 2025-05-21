import playlistModel from "../../models/playlist.js";

const addSongs = async (req, res) => {
    try {
        const { id, selectedSongs } = req.body;
        const updatedPlaylist = await playlistModel.findOneAndUpdate(
            { _id: id },
            {
                $addToSet: {
                    songs: { $each: selectedSongs.map(song => song._id) }
                }
            }
        );

        if (!updatedPlaylist) {
            return res.status(404).json({ message: "Playlist not found" });
        }
        
        console.log(updatedPlaylist);

        return res.status(200).json({
            message: "Songs added successfully"
        });
    } catch (error) {
        console.error("Error adding songs:", error);
        return res.status(500).json({
            message: "Something went wrong"
        });
    }
};

export default addSongs;

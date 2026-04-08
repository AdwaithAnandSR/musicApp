import playlistModel from "../../models/playlist.js";
import mongoose from "mongoose";

const addSongs = async (req, res) => {
    try {
        const { id, selectedSongs } = req.body;

        if (!id || !selectedSongs?.length) {
            return res.status(400).json({
                message: "Playlist ID and songs are required"
            });
        }

        // Convert to ObjectIds safely
        const songIds = selectedSongs.map(song =>
            new mongoose.Types.ObjectId(song._id)
        );

        // 🔥 Aggregation pipeline update
        const updatedPlaylist = await playlistModel.findOneAndUpdate(
            { _id: id },
            [
                {
                    $set: {
                        songs: {
                            $concatArrays: [
                                songIds, // New songs at front
                                {
                                    $filter: {
                                        input: "$songs",
                                        as: "song",
                                        cond: {
                                            $not: {
                                                $in: ["$$song", songIds]
                                            }
                                        }
                                    }
                                }
                            ]
                        }
                    }
                }
            ],
            { new: true }
        );

        if (!updatedPlaylist) {
            return res.status(404).json({
                message: "Playlist not found"
            });
        }

        return res.status(200).json({
            message: "Songs added successfully",
            playlist: updatedPlaylist
        });
    } catch (error) {
        console.error("Error adding songs:", error);
        return res.status(500).json({
            message: "Something went wrong"
        });
    }
};

export default addSongs;
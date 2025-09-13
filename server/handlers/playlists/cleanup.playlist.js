import mongoose from "mongoose";
import playlistModel from "../../models/playlist.js";
import musicModel from "../../models/musics.js";

export const cleanupPlaylists = async () => {
    const allSongIds = await musicModel.distinct("_id");

    await playlistModel.updateMany({}, [
        {
            $set: {
                songs: {
                    $filter: {
                        input: "$songs",
                        as: "id",
                        cond: { $in: ["$$id", allSongIds] }
                    }
                }
            }
        }
    ]);

    console.log(
        "✅ Playlists cleaned: removed references to deleted/missing songs"
    );
};

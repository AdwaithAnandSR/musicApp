import mongoose from "mongoose"
import playlistModel from "../../models/playlist.js";
import PlaylistSong from "../../models/playlistSong.js";

const getPlaylists = async (req, res) => {
    try {
        const { page, limit } = req.body;

        const RECENTLY_ADDED_ID = new mongoose.Types.ObjectId(
            "6a3e689cfba948ae55682fe3"
        );

        const playlists = await playlistModel.aggregate([
            {
                $sort: { createdAt: 1 }
            },
            {
                $skip: (page - 1) * limit
            },
            {
                $limit: limit
            },

            // Normal playlists → get cover from PlaylistSong
            {
                $lookup: {
                    from: "playlistsongs",
                    let: { playlistId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ["$playlistId", "$$playlistId"]
                                }
                            }
                        },
                        { $sort: { order: -1 } },
                        { $limit: 1 },

                        {
                            $lookup: {
                                from: "musics",
                                localField: "songId",
                                foreignField: "_id",
                                as: "song"
                            }
                        },
                        {
                            $unwind: "$song"
                        },

                        {
                            $project: {
                                _id: 0,
                                cover: "$song.cover"
                            }
                        }
                    ],
                    as: "playlistSong"
                }
            },

            // Recently Added → get latest song directly from music
            {
                $lookup: {
                    from: "musics",
                    pipeline: [
                        {
                            $sort: { createdAt: -1 }
                        },
                        {
                            $limit: 1
                        },
                        {
                            $project: {
                                _id: 0,
                                cover: 1
                            }
                        }
                    ],
                    as: "latestMusic"
                }
            },

            {
                $set: {
                    cover: {
                        $cond: [
                            // Is this the Recently Added playlist?
                            {
                                $eq: ["$_id", RECENTLY_ADDED_ID]
                            },

                            // Yes → latest music cover
                            {
                                $ifNull: [
                                    { $arrayElemAt: ["$latestMusic.cover", 0] },
                                    null
                                ]
                            },

                            // No → normal playlist first song cover
                            {
                                $ifNull: [
                                    {
                                        $arrayElemAt: ["$playlistSong.cover", 0]
                                    },
                                    null
                                ]
                            }
                        ]
                    }
                }
            },

            {
                $unset: ["playlistSong", "latestMusic"]
            }
        ]);
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

import Music from "../../models/musics.js";

const getArtists = async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const artists = await Music.aggregate([
            // 1. Match only songs that have an artist
            {
                $match: {
                    artist: { $exists: true, $ne: "" }
                }
            },
            // 2. Split comma-separated artists
            {
                $project: {
                    artistArray: { $split: ["$artist", ","] },
                    cover: 1
                }
            },
            // 3. Unwind the array
            {
                $unwind: "$artistArray"
            },
            // 4. Trim spaces and create lower case version for case-insensitive grouping
            {
                $project: {
                    originalArtist: { $trim: { input: "$artistArray" } },
                    lowerArtist: { $toLower: { $trim: { input: "$artistArray" } } },
                    cover: 1
                }
            },
            // 5. Group by lowercased artist name, get original casing, first cover, and count songs
            {
                $group: {
                    _id: "$lowerArtist",
                    name: { $first: "$originalArtist" },
                    cover: { $first: "$cover" },
                    songCount: { $sum: 1 }
                }
            },
            // Filter out artists that have only 1 song
            {
                $match: {
                    songCount: { $gt: 1 }
                }
            },
            // 6. Sort by name alphabetically
            {
                $sort: { _id: 1 }
            },
            // 7. Pagination
            {
                $skip: skip
            },
            {
                $limit: Number(limit)
            },
            // 8. Project into final format, set isArtistPlaylist flag
            {
                $project: {
                    _id: "$name", // use the actual name as the ID for querying later
                    name: 1,
                    cover: 1,
                    isArtistPlaylist: { $literal: true }
                }
            }
        ]);

        return res.json({
            playlists: artists,
            nextPage: artists.length === Number(limit) ? Number(page) + 1 : null
        });

    } catch (error) {
        console.error("❌ getArtists error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

export default getArtists;

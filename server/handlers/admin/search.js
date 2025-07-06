import musicModel from "../../models/musics.js"
import lyricsModel from "../../models/lyrics.js"

export const searchSong = async (req, res) => {
    const { text } = req.body;
    try {
        
        const songs = await musicModel.find({
            title: { $regex: text, $options: "i" } // i : case-insensitive
        });

        res.json({ songs });
    } catch (error) {
        console.error("Search error:", error);
    }
}

export const searchLyric = async (req, res) => {
    try {
        const { text } = req.body;

        const lyrics = await lyricsModel.find({
            title: { $regex: text, $options: "i" }
        });

        return res.json({ lyrics });
    } catch (e) {
        console.log(e);
        res.status(400).json({ message: "failed" });
    }
}
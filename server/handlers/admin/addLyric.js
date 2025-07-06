import musicModel from "../../models/musics.js";
import lyricsModel from "../../models/lyrics.js";

export const addLyricsToSong = async (req, res) => {
    try {
        const { lyricsId, songId, lyricsIndex } = req.body;
        const lyric = await lyricsModel.findById(lyricsId);
        const song = await musicModel.findById(songId);

        if (!song) {
            throw new Error("Song not found");
        }

        if (song.lyrics.length === 0) {
            if (lyricsIndex == 1) {
                let lyrics = [];

                lyric.lyrics.map(line => {
                    lyrics.push({ start: -1, line, end: -1 });
                });

                await musicModel.findByIdAndUpdate(songId, {
                    $set: { lyrics }
                });
            } else {
                let lyrics = [];

                lyric.lyrics2.map(line => {
                    lyrics.push({ start: -1, line, end: -1 });
                });

                await musicModel.findByIdAndUpdate(songId, {
                    $set: { lyrics: lyrics }
                });
            }
        } else {
            if (lyricsIndex == 1)
                await musicModel.findByIdAndUpdate(songId, {
                    $push: { lyricsAsText: lyric.lyrics }
                });
            else
                await musicModel.findByIdAndUpdate(songId, {
                    $push: { lyricsAsText: lyric.lyrics2 }
                });
        }

        const result = await musicModel.findById(songId);

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.json({ success: false });
    }
}

export const addLyricsDirectToSong = async (req, res) => {try {
        const { lyric, songId, artist = "Unknown" } = req.body;

        const song = await musicModel.findById(songId);

        if (!song) {
            throw new Error("Song not found");
        }

        if (song.lyrics.length === 0) {
            let lyrics = [];

            lyric.map(line => {
                lyrics.push({ start: -1, line, end: -1 });
            });

            await musicModel.findByIdAndUpdate(songId, {
                $set: { lyrics, artist }
            });
        } else {
            await musicModel.findByIdAndUpdate(songId, {
                $set: { lyricsAsText: lyric, artist }
            });
        }

        const result = await musicModel.findById(songId);

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.json({ success: false });
    }
    
}
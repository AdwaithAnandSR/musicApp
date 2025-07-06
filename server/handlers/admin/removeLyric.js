import musicModel from "../../models/musics.js";

const removelyric = async (req, res) => {
    try {
        const { id, index } = req.body;

        if (index == 2) {
            await musicModel.findByIdAndUpdate(id, {
                $set: { lyricsAsText: [] }
            });
            return res.json({ success: true });
        } else if (index == 1) {
            const song = await musicModel.findById(id);

            let newLyric = song.lyricsAsText
                ?.filter(line => line.trim() !== "")
                .map(line => ({
                    start: -1,
                    line,
                    end: -1
                }));

            if (!newLyric || newLyric.length === 0) {
                await musicModel.findByIdAndUpdate(id, {
                    $set: { lyrics: [] }
                });
            } else {
                await musicModel.findByIdAndUpdate(id, {
                    $set: { lyrics: newLyric }
                });
            }

            return res.json({ success: true });
        }
    } catch (error) {
        console.error(error);
        return res.json({ success: false });
    }
};

export default removelyric;

import lyricsModel from "../../models/lyrics.js";

const addNew = async (req, res) => {
    try {
        const { title, details, lyrics } = req.body;

        if (title.length > 0 && lyrics) {
            const exists = await lyricsModel.findOne({ title });
            if (exists) return res.status(401).json({ message: "failed" });
            await lyricsModel.create({ title, details, lyrics });
            return res.status(200).json({ message: "Success" });
        }

        return res.status(410).json({ message: "Success" });
    } catch (e) {
        console.log(e);
        res.status(400).json({ message: "failed" });
    }
};

export default addNew;

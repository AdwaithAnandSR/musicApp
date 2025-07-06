import musicModel from "../../models/musics.js"

const search = async (req, res) => {
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

export default search
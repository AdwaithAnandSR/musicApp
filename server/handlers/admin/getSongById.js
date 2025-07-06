import musicModel from "../../models/musics.js";

const getSong = async (req, res) => {
    try {
        const { id } = req.body;

        let song = await musicModel.findById(id);
        
        console.log(song)

        res.json({ song });
    } catch (e) {
        console.log(e);
        res.status(400).json({ message: "failed" });
    }
};

export default getSong;

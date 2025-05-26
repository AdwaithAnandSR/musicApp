import musicModel from "../models/musics.js";

const findSong = async (req, res) => {
    const { title } = req.body;
    const exists = await musicModel.findOne({ title });
    if (exists) return res.status(200).json({ isExist: true });
    return res.status(200).json({ isExist: false });
};

export default findSong;

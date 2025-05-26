import musicModel from "../models/musics.js";

const addSong = async (req, res) => {
    const { coverURL, songURL, title } = req.body;

    const result = await musicModel.create({
        cover: coverURL || null,
        url: songURL,
        title
    });
};

export default addSong;

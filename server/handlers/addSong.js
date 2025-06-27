import musicModel from "../models/musics.js";

const addSong = async (req, res) => {
    try {
        const { coverURL, songURL, title, id } = req.body;

        const result = await musicModel.create({
            cover: coverURL || null,
            url: songURL,
            title,
            ytId: id
        });
        res.json({success: true})
    } catch (error) {
        console.error(error);
        res.json({
            succ: false,
            error: error,
            message: "something went wrong!"
        });
    }
};

export default addSong;

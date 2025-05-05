const { bucket } = require("./upload.handler.js");

const musicModel = require("../models/musics.js");

const upload = async ({
    title,
    audioType,
    coverType,
    audioBuffer,
    coverBuffer,
    res
}) => {
    try {
        const songFile = bucket.file(`songs/${title}.mp3`);
        const coverFile = bucket.file(`covers/${title}.jpg`);

        await songFile.save(audioBuffer, {
            metadata: { contentType: audioType.mime }
        });

        await coverFile.save(coverBuffer, {
            metadata: { contentType: coverType.mime }
        });

        const [songURL] = await songFile.getSignedUrl({
            action: "read",
            expires: "03-09-9999"
        });

        const [coverURL] = await coverFile.getSignedUrl({
            action: "read",
            expires: "03-09-9999"
        });

        // add to mongodb

        const result = await musicModel.create({
            cover: coverURL || null,
            url: songURL,
            title
        });

        console.log(result);

        return res.json({
            message: "upload successfull.",
            title
        });
    } catch (error) {
        console.log(error);
        res.status(501).json({
            message: "internal error",
            e
        });
    }
};

module.exports = upload;

import admin from "firebase-admin";
import { v4 as uuidv4 } from "uuid";
import serviceAccount from "../keys/serviceKey.js";

import musicModel from "../models/musics.js";

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "gs://vividmusic-d6d28.appspot.com"
});
const bucket = admin.storage().bucket();

const upload = async ({
    title,
    audioType,
    coverType,
    audioBuffer,
    coverBuffer,
    res
}) => {
    try {
        
        console.log(audioBuffer, coverBuffer, audioType, coverType, title);
        
        return
        
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
        console.log("error at handleDirectUpload: ", e, e.message);
        res.status(501).json({
            message: "internal error",
            e
        });
    }
};

export default upload;

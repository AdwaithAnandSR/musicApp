import mongoose from "mongoose";

const musicSchema = mongoose.Schema({
    title: {
        type: String,
        required: true,
        index: true
    },
    url: {
        type: String,
        required: true
    },
    cover: {
        type: String
    },
    lyrics: [
        {
            timestamp: Number,
            line: String
        }
    ],
    lyricsAsText1: [{ type: String }],
    lyricsAsText2: [{ type: String }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

musicSchema.index({ title: "text" });

export default mongoose.model("music", musicSchema);

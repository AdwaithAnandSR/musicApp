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
    cover: String,
    duration: Number,
    artist: {
        type: String,
        default: "Unknown"
    },
    ytId: String,
    synced: {
        type: Boolean,
        default: false
    },
    lyrics: [
        {
            start: Number,
            end: Number,
            line: String
        }
    ],
    lyricsAsText: [{ type: String }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

musicSchema.index({ title: "text" });

export default mongoose.model("music", musicSchema);

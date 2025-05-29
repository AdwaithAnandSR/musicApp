import mongoose from "mongoose";

const schema = mongoose.Schema({
    title: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    details: {
        type: String,
        required: true
    },
    lyrics: [
        {
            type: String
        }
    ],
    lyrics2: [
        {
            type: String
        }
    ],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model("lyric", schema);

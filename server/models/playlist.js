import mongoose from "mongoose"

const schema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    description: String,
    songs: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "music"
        }
    ],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model("playlist", schema);

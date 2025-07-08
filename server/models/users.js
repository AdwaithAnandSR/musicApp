import mongoose from "mongoose";

const schema = mongoose.Schema({
    nickname: String,
    userId: {
        type: String,
        required: true
    },
    isAuthenticated: {
        type: Boolean,
        default: false
    },
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user"
    }
});

export default mongoose.model("user", schema);

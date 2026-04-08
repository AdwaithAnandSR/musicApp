import mongoose from "mongoose";

const schema = mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        password: {
            type: String,
            required: true
        },
        isVerified: {
            type: Boolean,
            default: false
        },
        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user"
        },
        activeToken: {
            type: String,
            default: null
        }
    },
    { timestamps: true }
);

export default mongoose.model("user", schema);

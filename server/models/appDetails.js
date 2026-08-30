import mongoose from "mongoose";

const schema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    data: { type: mongoose.Schema.Types.Mixed, default: [] }
}, { timestamps: true });

export default mongoose.model("AppDetail", schema);

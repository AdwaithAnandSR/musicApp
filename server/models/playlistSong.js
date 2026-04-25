import mongoose from "mongoose";

const playlistSongSchema = new mongoose.Schema(
{
playlistId: {
type: mongoose.Schema.Types.ObjectId,
ref: "Playlist",
required: true,
index: true
},
songId: {
type: mongoose.Schema.Types.ObjectId,
ref: "Song",
required: true,
index: true
},
order: {
type: Number,
default: 0
},
addedAt: {
type: Date,
default: Date.now
},
stableRandom: {
type: Number,
default: () => Math.random(),
index: true
}
},
{
timestamps: true // adds createdAt & updatedAt
}
);

playlistSongSchema.pre("save", async function (next) {
if (this.isNew && this.order === 0) {
const last = await mongoose
.model("PlaylistSong")
.findOne({ playlistId: this.playlistId })
.sort({ order: -1 });

this.order = last ? last.order + 1 : 1;  
}  
next();

});

playlistSongSchema.index({ playlistId: 1, songId: 1 }, { unique: true });

playlistSongSchema.index({ playlistId: 1, order: 1 });

playlistSongSchema.index({ playlistId: 1, addedAt: -1 });

const PlaylistSong =
mongoose.models.PlaylistSong ||
mongoose.model("PlaylistSong", playlistSongSchema);

export default PlaylistSong;

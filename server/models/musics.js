const mongoose = require("mongoose");

const musicSchema = mongoose.Schema({
  title: {
    type: String,
    required: true,
    index: true,
  },
  url: {
    type: String,
    required: true,
  },
  cover: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "user",
    },
  ],
  plays: [
    {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "user",
    },
  ],
});

musicSchema.index({ title: 'text' }); 

module.exports = mongoose.model('music', musicSchema)
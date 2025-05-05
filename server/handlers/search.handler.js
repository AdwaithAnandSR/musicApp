const { getIo } = require("../config/socket.config.js");
const musicModel = require("../models/musics.js");
const io = getIo();

const searchSongs = async query => {
   try {
  
     const songs = await musicModel.find({
       title: { $regex: query, $options: "i" }, // i : case-insensitive
     });

     return songs;
   } catch (error) {
      console.error("Search error:", error);
      return [];
   }
};

io.on("connection", socket => {
   console.log("user connected: ", socket.id)
   socket.on("searchSongs", async text => {
      const songs = await searchSongs(text);
      socket.emit('searchSongsRes', songs)
   });
});

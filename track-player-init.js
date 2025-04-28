
import TrackPlayer from "react-native-track-player";

TrackPlayer.registerPlaybackService(() =>
   require("./services/player.service.js")
);

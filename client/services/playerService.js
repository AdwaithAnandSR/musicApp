// services/playerService.js
import TrackPlayer, { Event } from "react-native-track-player";

export const PlaybackService = async () => {
    TrackPlayer.addEventListener(Event.RemotePlay, () => {
        console.log("▶️ RemotePlay event");
        TrackPlayer.play();
    });

    TrackPlayer.addEventListener(Event.RemotePause, () => {
        console.log("⏸️ RemotePause event");
        TrackPlayer.pause();
    });

    TrackPlayer.addEventListener(Event.RemoteNext, () => {
        console.log("⏭️ RemoteNext event");
        TrackPlayer.skipToNext();
    });

    TrackPlayer.addEventListener(Event.RemotePrevious, () => {
        console.log("⏮️ RemotePrevious event");
        TrackPlayer.skipToPrevious();
    });
};

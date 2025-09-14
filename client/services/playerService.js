import TrackPlayer, { Event, State } from "react-native-track-player";
import axios from "axios";
import Constants from "expo-constants";

import { useGlobalSongs } from "../store/list.store.js";
import { usePlayerStore } from "../store/player.store.js";
import { userId } from "../services/storage.js";

let api = Constants.expoConfig.extra.clientApi;

export async function PlaybackService() {
    TrackPlayer.addEventListener(Event.RemotePlayPause, async () => {
        try {
            const { state } = await TrackPlayer.getPlaybackState();
            if (state === State.Playing) await TrackPlayer.pause();
            else await TrackPlayer.play();
        } catch (e) {
            console.log(e);
        }
    });

    TrackPlayer.addEventListener(Event.RemoteNext, async () => {
        console.log("Event.RemoteNext");
        await TrackPlayer.skipToNext();
    });

    TrackPlayer.addEventListener(Event.RemotePrevious, () => {
        console.log("Event.RemotePrevious");
        TrackPlayer.skipToPrevious();
    });

    TrackPlayer.addEventListener(Event.RemoteJumpForward, async event => {
        console.log("Event.RemoteJumpForward", event);
        TrackPlayer.seekBy(event.interval);
    });

    TrackPlayer.addEventListener(Event.RemoteJumpBackward, async event => {
        console.log("Event.RemoteJumpBackward", event);
        TrackPlayer.seekBy(-event.interval);
    });

    TrackPlayer.addEventListener(Event.RemoteSeek, event => {
        console.log("Event.RemoteSeek", event);
        TrackPlayer.seekTo(event.position);
    });

    TrackPlayer.addEventListener(
        Event.PlaybackActiveTrackChanged,
        async event => {
            try {
                if (
                    usePlayerStore.getState().playlists[
                        usePlayerStore.getState().currentPlaylist
                    ].length -
                        1 ===
                    event.index
                ) {
                    const res = await axios.post(`${api}/getGlobalSongs`, {
                        limit: 10,
                        allPages: useGlobalSongs.getState().allPages,
                        userId
                    });
                    const { availablePages, musics, page } = res.data;

                    useGlobalSongs.getState().updateAllPages(page);

                    if (musics.length > 0) {
                        const mapped = musics.map(
                            ({ _id, cover, ...rest }) => ({
                                id: _id,
                                artwork: cover,
                                ...rest
                            })
                        );

                        await usePlayerStore
                            .getState()
                            .addToPlaylist(
                                usePlayerStore.getState().currentPlaylist,
                                mapped
                            );
                    }
                }
            } catch (e) {
                console.error(e);
            }
        }
    );

    // TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, event => {
    //     // console.log("Event.PlaybackProgressUpdated");
    // });

    // TrackPlayer.addEventListener(Event.PlaybackPlayWhenReadyChanged, event => {
    //     // console.log("Event.PlaybackPlayWhenReadyChanged", event);
    // });

    // TrackPlayer.addEventListener(Event.PlaybackState, event => {
    //     // console.log("Event.PlaybackState", event);
    // });

    // TrackPlayer.addEventListener(Event.MetadataChapterReceived, event => {
    //     // console.log("Event.MetadataChapterReceived");
    // });

    // TrackPlayer.addEventListener(Event.MetadataTimedReceived, event => {
    //     // console.log("Event.MetadataTimedReceived");
    // });

    // TrackPlayer.addEventListener(Event.MetadataCommonReceived, event => {
    //     // console.log("Event.MetadataCommonReceived");
    // });
}

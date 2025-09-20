import TrackPlayer, { Event, State } from "react-native-track-player";
import axios from "axios";
import Constants from "expo-constants";

import { useGlobalSongs } from "../store/list.store.js";
import { usePlayerStore } from "../store/player.store.js";
import { useAppStatus } from "../store/appState.store.js";

import { userId } from "../services/storage.js";

let api = Constants.expoConfig.extra.clientApi;

export async function PlaybackService() {
    const subs = [];

    subs.push(
        TrackPlayer.addEventListener(Event.RemotePlayPause, async () => {
            try {
                const { state } = await TrackPlayer.getPlaybackState();
                if (state === State.Playing) await TrackPlayer.pause();
                else await TrackPlayer.play();
            } catch (e) {
                console.log(e);
            }
        })
    );

    subs.push(
        TrackPlayer.addEventListener(Event.RemoteNext, async () => {
            await TrackPlayer.skipToNext();
        })
    );

    subs.push(
        TrackPlayer.addEventListener(Event.RemotePrevious, () => {
            TrackPlayer.skipToPrevious();
        })
    );

    subs.push(
        TrackPlayer.addEventListener(Event.RemoteJumpForward, async event => {
            TrackPlayer.seekBy(event.interval);
        })
    );

    subs.push(
        TrackPlayer.addEventListener(Event.RemoteJumpBackward, async event => {
            TrackPlayer.seekBy(-event.interval);
        })
    );

    subs.push(
        TrackPlayer.addEventListener(Event.RemoteSeek, event => {
            TrackPlayer.seekTo(event.position);
        })
    );

    subs.push(
        TrackPlayer.addEventListener(
            Event.PlaybackActiveTrackChanged,
            async event => {
                try {
                    if (
                        usePlayerStore.getState().playlists[
                            usePlayerStore.getState().currentPlaylist
                        ]?.length -
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
        )
    );

    subs.push(
        TrackPlayer.addEventListener(
            Event.PlaybackProgressUpdated,
            async event => {
                const timer = usePlayerStore.getState().timer;
                if (timer != null && timer < Date.now()) {
                    await TrackPlayer.stop();
                    usePlayerStore.getState().setTimer(null);
                }
            }
        )
    );

    // Return cleanup (TrackPlayer v5 style)
    return () => {
        subs.forEach(sub => sub.remove());
    };
}

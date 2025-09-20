import { create } from "zustand";
import TrackPlayer, { Capability, Event } from "react-native-track-player";
import { storage } from "../services/storage.js";

export const usePlayerStore = create((set, get) => ({
    playlists: {
        HOME: [],
        SEARCH: []
    },
    currentPlaylist: null,
    currentTrackId: null,
    currentPlaybackState: null,
    currentTrack: {},
    repeatMode: "off",
    timer: null,

    addToPlaylist: async (playlist, tracks) => {
        set(state => ({
            playlists: {
                ...state.playlists,
                [playlist]: [...(state.playlists[playlist] || []), ...tracks]
            }
        }));

        if (get().currentPlaylist === playlist) await TrackPlayer.add(tracks);
    },

    replacePlaylist: (playlist, tracks) => {
        set(state => ({
            playlists: {
                ...state.playlists,
                [playlist]: [...tracks]
            }
        }));
    },

    setPlaylist: async (playlist, trackId) => {
        const state = get();

        if (state.currentPlaylist === playlist) return;

        const tracks = state.playlists[playlist] || [];
        if (tracks.length === 0) return;

        if (state.currentPlaylist !== playlist) {
            await TrackPlayer.reset();
            await TrackPlayer.add(tracks);
        }

        set({
            currentPlaylist: playlist
        });
    },

    playTrack: async trackId => {
        set({ currentTrackId: trackId });
        const state = get();
        const playlist = state.playlists[state.currentPlaylist] || [];
        const trackIndex = playlist.findIndex(t => t.id === trackId);
        if (trackIndex === -1) return;

        await TrackPlayer.skip(trackIndex);
        await TrackPlayer.play();
    },

    updateRepeatMode: async mode => set({ repeatMode: mode }),

    setTimer: async time => set({ timer: time })
}));

TrackPlayer.addEventListener(Event.PlaybackState, ({ state }) => {
    usePlayerStore.setState({ currentPlaybackState: state });
});

TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, ({ track }) => {
    if (usePlayerStore.getState().currentTrackId === null) return;
    usePlayerStore.setState({ currentTrackId: track?.id });

    usePlayerStore.setState({ currentTrack: track });
});

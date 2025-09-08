import { create } from "zustand";
import TrackPlayer, { Capability } from "react-native-track-player";

export const usePlayerStore = create((set, get) => ({
    playlists: {},
    currentPlaylist: null,
    currentTrackId: null,

    addToPlaylist: (playlist, tracks) => {
        set(state => ({
            playlists: {
                ...state.playlists,
                [playlist]: [...(state.playlists[playlist] || []), ...tracks]
            }
        }));
    },

    setPlaylist: async playlist => {
        const state = get();
        const tracks = state.playlists[playlist] || [];

        if (tracks.length === 0) return;

        if (state.currentPlaylist !== playlist) {
            await TrackPlayer.reset();
            await TrackPlayer.add(tracks);
        }

        set({
            currentPlaylist: playlist,
            currentTrackId: tracks[0].id
        });
    },

    playTrack: async trackId => {
        const state = get();
        const playlist = state.playlists[state.currentPlaylist] || [];
        const trackIndex = playlist.findIndex(t => t.id === trackId);
        if (trackIndex === -1) return;

        await TrackPlayer.skip(trackIndex);
        await TrackPlayer.play();
        set({ currentTrackId: trackId });
    }
}));

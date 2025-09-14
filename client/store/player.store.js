import { create } from "zustand";
import TrackPlayer, { Capability } from "react-native-track-player";

export const usePlayerStore = create((set, get) => ({
    playlists: {},
    currentPlaylist: null,
    currentTrackId: null,

    addToPlaylist: async (playlist, tracks) => {
        set(state => ({
            playlists: {
                ...state.playlists,
                [playlist]: [...(state.playlists[playlist] || []), ...tracks]
            }
        }));
        
        if(get().currentPlaylist === playlist) await TrackPlayer.add(tracks)
    },

    replacePlaylist: (playlist, tracks) => {
        set(state => ({
            playlists: {
                ...state.playlists,
                [playlist]: [...tracks]
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
            currentPlaylist: playlist
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
    },

    getHomeLists: () => {
        return get().playlists["HOME"];
    },

    getSearchLists: () => {
        return get().playlists["SEARCH"];
    }
}));

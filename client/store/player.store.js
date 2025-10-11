import { create } from "zustand";
import TrackPlayer, { Capability, Event } from "react-native-track-player";
import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabaseSync("musicApp.db");

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
        const currentTracks = get().playlists[playlist] || [];

        // Combine and remove duplicates by id
        const allTracks = [...currentTracks, ...tracks];
        const seen = new Set();
        const updatedTracks = allTracks.filter(track => {
            if (seen.has(track.id)) return false;
            seen.add(track.id);
            return true;
        });

        set(state => ({
            playlists: {
                ...state.playlists,
                [playlist]: updatedTracks
            }
        }));

        if (get().currentPlaylist === playlist) {
            const existingIds = new Set(currentTracks.map(t => t.id));
            const newTracks = tracks.filter(t => !existingIds.has(t.id));
            if (newTracks.length) await TrackPlayer.add(newTracks);
        }
    },

    removeFromPlaylist: (songId, playlistId) => {
        set(state => {
            const playlist = state.playlists[playlistId];
            if (!playlist) return state;

            return {
                playlists: {
                    ...state.playlists,
                    [playlistId]: playlist.filter(item => item.id !== songId)
                }
            };
        });
    },

    replacePlaylist: async (playlist, tracks) => {
        set(state => ({
            playlists: {
                ...state.playlists,
                [playlist]: [...tracks]
            }
        }));
    },

    setPlaylist: async (playlist) => {
        const state = get();
        const queue = await TrackPlayer.getQueue();

        if (state.currentPlaylist === playlist && queue?.length > 0) return;

        const tracks = state.playlists[playlist] || [];
        if (tracks.length === 0) return;

        await TrackPlayer.reset();
        await TrackPlayer.add(tracks);

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


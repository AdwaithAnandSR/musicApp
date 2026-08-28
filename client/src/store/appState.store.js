import { create } from "zustand";
import { getUser, setUser, removeUser } from "@services/storage";

// Note: isAuthenticated intentionally starts as false.
// index.jsx validates the stored token against /users/me on every launch,
// which is required to detect single-device invalidation.
export const useAppStatus = create(set => ({
    user: getUser() ?? {},
    currentSelectedPlaylist: {},
    isTimerSelecting: false,
    popUpOption: {
        y: -1,
        songId: null,
        playId: null
    },

    updateUser: user => {
        setUser(user);
        set({ user });
    },

    removeUser: () => {
        removeUser();
        set({ user: {} });
    },

    setIsAuthenticated: val => set(() => ({ isAuthenticated: val })),
    setCurrentSelectedPlaylist: playlist =>
        set({ currentSelectedPlaylist: playlist }),
    toggleTimerSelect: () =>
        set(state => ({ isTimerSelecting: !state.isTimerSelecting })),
    setPopUpOption: (y, songId, playId, song = null) =>
        set({ popUpOption: { y, songId, playId, song } })
}));

export const useMultiSelect = create((set, get) => ({
    selectedSongs: [],
    reset: () => set(() => ({ selectedSongs: [] })),
    updateSelectedSongs: item => {
        if (!item) return;
        const itemId = item.id || item._id;
        set(state => {
            const exists = state.selectedSongs.some(i => (i.id || i._id) === itemId);
            const updated = exists
                ? state.selectedSongs.filter(i => (i.id || i._id) !== itemId)
                : [...state.selectedSongs, item];
            return { selectedSongs: updated };
        });
    }
}));

export const useStatus = create(set => ({
    showLyrics1: false,
    showLyrics2: false,
    showSyncedLyric: false,
    currentLyricIndex: -1,

    setCurrentLyricIndex: index => set({ currentLyricIndex: index }),
    setShowLyrics1: () =>
        set(state => {
            const next1 = !state.showLyrics1;
            return {
                showLyrics1: next1,
                showLyrics2: false,
                showSyncedLyric: next1 ? state.showSyncedLyric : false
            };
        }),
    setShowLyrics2: () =>
        set(state => {
            const next2 = !state.showLyrics2;
            return {
                showLyrics2: next2,
                showLyrics1: false,
                showSyncedLyric: false
            };
        }),
    setShowSyncedLyric: () =>
        set(state => {
            const nextSync = !state.showSyncedLyric;
            return {
                showSyncedLyric: nextSync,
                showLyrics1: nextSync ? true : state.showLyrics1,
                showLyrics2: false
            };
        }),
    resetShowLyrics: () =>
        set(() => ({
            showLyrics1: false,
            showLyrics2: false,
            showSyncedLyric: false,
            currentLyricIndex: -1
        }))
}));

export const useDownloadStatus = create((set, get) => ({
    downloadingPlaylists: {}, // map of playlistId to array of songs with progress
    downloadTasks: {}, // map of songId to File.DownloadTask (transient, not in state really, but we can store it or keep it in service)
    
    // We keep downloadingSongs for O(1) status lookup in ListItem
    downloadingSongs: {}, 

    setDownloadingPlaylist: (playlistId, songs) =>
        set(state => {
            // Only update if there are actually songs to add to avoid unnecessary reference changes
            if (!songs || songs.length === 0) return state;
            
            // Add initial status fields to songs
            const songsWithState = songs.map(song => ({
                ...song,
                progress: 0,
                bytesWritten: 0,
                totalBytes: 0,
                status: 'pending'
            }));

            return {
                downloadingPlaylists: {
                    ...state.downloadingPlaylists,
                    [playlistId]: songsWithState
                }
            };
        }),

    updateSongProgress: (playlistId, songId, progressData) =>
        set(state => {
            const playlistSongs = state.downloadingPlaylists[playlistId];
            if (!playlistSongs) return state;

            let changed = false;
            const newPlaylistSongs = playlistSongs.map(song => {
                if ((song.id || song._id) === songId) {
                    changed = true;
                    return { ...song, ...progressData };
                }
                return song;
            });

            if (!changed) return state;

            return {
                downloadingPlaylists: {
                    ...state.downloadingPlaylists,
                    [playlistId]: newPlaylistSongs
                },
                downloadingSongs: {
                    ...state.downloadingSongs,
                    [songId]: progressData.status || 'downloading'
                }
            };
        }),

    removeDownloadingPlaylistSong: (playlistId, songId) =>
        set(state => {
            const playlistSongs = state.downloadingPlaylists[playlistId];
            if (!playlistSongs) return state;
            
            const newPlaylistSongs = playlistSongs.filter(s => (s.id || s._id) !== songId);
            
            const { [songId]: _, ...restDownloadingSongs } = state.downloadingSongs;

            return {
                downloadingPlaylists: {
                    ...state.downloadingPlaylists,
                    [playlistId]: newPlaylistSongs
                },
                downloadingSongs: restDownloadingSongs
            };
        }),
        
    setDownloadingSong: (songId, status) =>
        set(state => ({
            downloadingSongs: {
                ...state.downloadingSongs,
                [songId]: status
            }
        })),
        
    removeDownloadingSong: (songId) =>
        set(state => {
            const { [songId]: _, ...rest } = state.downloadingSongs;
            return { downloadingSongs: rest };
        })
}));

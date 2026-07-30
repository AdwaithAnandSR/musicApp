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

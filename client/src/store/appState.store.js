import { create } from "zustand";
import { getIsAuth } from "@services/storage";

// Note: isAuthenticated intentionally starts as false.
// index.jsx validates the stored token against /users/me on every launch,
// which is required to detect single-device invalidation.
export const useAppStatus = create(set => ({
    isAuthenticated: getIsAuth() ?? false,
    currentSelectedPlaylist: {},
    isTimerSelecting: false,
    popUpOption: {
        y: -1,
        songId: null,
        playId: null
    },

    setIsAuthenticated: val => set(() => ({ isAuthenticated: val })),
    setCurrentSelectedPlaylist: playlist =>
        set({ currentSelectedPlaylist: playlist }),
    toggleTimerSelect: () =>
        set(state => ({ isTimerSelecting: !state.isTimerSelecting })),
    setPopUpOption: (y, songId, playId) =>
        set({ popUpOption: { y, songId, playId } })
}));

export const useMultiSelect = create((set, get) => ({
    selectedSongs: [],
    reset: () => set(() => ({ selectedSongs: [] })),
    updateSelectedSongs: item => {
        set(state => {
            const exists = state.selectedSongs.some(i => i.id === item.id);
            const updated = exists
                ? state.selectedSongs.filter(i => i.id !== item.id)
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
        set(state => ({
            showLyrics1: !state.showLyrics1,
            showLyrics2: state.showLyrics1 ? state.showLyrics2 : false
        })),
    setShowLyrics2: () =>
        set(state => ({
            showLyrics2: !state.showLyrics2,
            showLyrics1: state.showLyrics2 ? state.showLyrics1 : false,
            showSyncedLyric: false
        })),
    setShowSyncedLyric: () =>
        set(state => ({ showSyncedLyric: !state.showSyncedLyric })),
    resetShowLyrics: () =>
        set(() => ({
            showLyrics1: false,
            showLyrics2: false,
            showSyncedLyric: false
        }))
}));

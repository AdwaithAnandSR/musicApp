import { create } from "zustand";

export const useMultiSelect = create(set => ({
    selectedSongs: [],
    reset: () =>
        set(() => ({
            selectedSongs: []
        })),
    updateSelectedSongs: item =>
        set(state => {
            const exists = state.selectedSongs.includes(item);
            const updated = exists
                ? state.selectedSongs.filter(i => i !== item)
                : [...state.selectedSongs, item];

            return { selectedSongs: updated };
        })
}));

export const useStatus = create(set => ({
    showLyrics1: false,
    showLyrics2: false,

    setShowLyrics1: () =>
        set(state => ({
            showLyrics1: !state.showLyrics1,
            showLyrics2: state.showLyrics1 ? state.showLyrics2 : false // Hide 2 if 1 is being shown
        })),

    setShowLyrics2: () =>
        set(state => ({
            showLyrics2: !state.showLyrics2,
            showLyrics1: state.showLyrics2 ? state.showLyrics1 : false // Hide 1 if 2 is being shown
        })),
        
    resetShowLyrics: () =>
        set(state => ({
            showLyrics2: false,
            showLyrics1: false
        }))
}));

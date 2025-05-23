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

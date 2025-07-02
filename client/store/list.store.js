import { create } from "zustand";

import {songs } from "../services/storage.js";

export const useGlobalSongs = create((set, get) => ({
    allSongs: songs || [],
    page: 1,
    hasMore: true,
    updatePage: () => set(state => ({ page: state.page + 1 })),
    updateHasMore: value => set(() => ({ hasMore: value })),
    updateAllSongs: newSongs =>
        set(state => {
            const existingIds = new Set(state.allSongs.map(song => song._id));
            const updated = newSongs.filter(song => !existingIds.has(song._id));
            return {
                allSongs: [...state.allSongs, ...updated]
            };
        })
}));

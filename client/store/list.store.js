import { create } from "zustand";
import { storedPage } from "../services/storage.js";


export const useGlobalSongs = create((set, get) => ({
    allSongs: [],
    allPages: [storedPage] || [],
    page: 1,
    hasMore: true,

    updatePage: () =>
        set(state => ({
            page: state.page + 1
        })),

    updateAllPages: p =>
        set(state => ({
            allPages: [...state.allPages, p]
        })),

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

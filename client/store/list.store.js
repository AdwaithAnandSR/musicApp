import { create } from "zustand";
import { storedPage, playlists } from "../services/storage.js";

export const useGlobalSongs = create((set, get) => ({
    playlists: [...playlists] || [],
    allPages: [storedPage] || [],
    hasMore: true,

    updateAllPages: p =>
        set(state => ({
            allPages: [...state.allPages, p]
        })),

    updateHasMore: value => set(() => ({ hasMore: value })),

    updatePlaylists: newLists =>
        set(state => {
            const existingIds = new Set(state.playlists.map(p => p._id));
            const updated = newLists.filter(item => !existingIds.has(item._id));
            return {
                playlists: [...state.playlists, ...updated]
            };
        }),

    addPlaylist: newList =>
        set(state => ({
            playlists: [...state.playlists, newList]
        })),

    deletePlaylist: id =>
        set(state => {
            const updated = state.playlists.filter(item => item._id != id);
            return {
                playlists: [...updated]
            };
        })
}));

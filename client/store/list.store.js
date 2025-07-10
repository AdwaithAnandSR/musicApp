import { create } from "zustand";
import { storedPage, playlists } from "../services/storage.js";

export const useGlobalSongs = create((set, get) => ({
    allSongs: [],
    playlists: [...playlists] || [],
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
        }),

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

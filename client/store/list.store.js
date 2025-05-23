import { create } from "zustand";
import axios from "axios";
import Constants from "expo-constants";

import { storage } from "../services/storage.js";

const api = Constants.expoConfig.extra.clientApi;

export const useGlobalSongs = create((set, get) => ({
    allSongs: [],
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

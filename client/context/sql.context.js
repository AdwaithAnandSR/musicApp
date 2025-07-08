import { useRef, useContext, createContext, useEffect, useState } from "react";
import { SQLiteProvider, useSQLiteContext } from "expo-sqlite";

import { useGlobalSongs } from "../store/list.store.js";
import { useAppStatus } from "../store/appState.store.js";
import { userId } from "../services/storage.js";

import fetchUser from "../controllers/auth/checkIsAuth.js";

const SqlContext = createContext();

export const SqlControllerProvider = ({ children }) => {
    const db = useSQLiteContext();
    const updateAllSongs = useGlobalSongs(state => state.updateAllSongs);
    const setIsAuthenticated = useAppStatus(state => state.setIsAuthenticated);

    if (!db) return console.error("db not initialised");

    const init = async () => {
        try {
            await db.execAsync(
                `CREATE TABLE IF NOT EXISTS songs (
                    _id TEXT PRIMARY KEY, 
                    title TEXT NOT NULL,
                    url TEXT NOT NULL,
                    cover TEXT,
                    artist TEXT,
                    synced INTERGER,
                    lyrics TEXT,
                    lyricsAsText TEXT
                );`
            );

            let songs = await db.getAllAsync(`SELECT * FROM songs;`);
            let formatted = songs.map(item => {
                return {
                    ...item,
                    synced: item.synced == 1,
                    lyrics: JSON.parse(item.lyrics),
                    lyricsAsText: JSON.parse(item.lyricsAsText)
                };
            });

            updateAllSongs(formatted);
        } catch (error) {
            console.error(error);
        }
    };
    init();

    const insertSongs = async item => {
        try {
            await db.runAsync(
                `INSERT INTO songs VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
                [
                    item._id,
                    item.title,
                    item.url,
                    item.cover ?? "",
                    item.artist ?? "",
                    item.synced ? 1 : 0,
                    JSON.stringify(item.lyrics),
                    JSON.stringify(item.lyricsAsText)
                ]
            );
        } catch (error) {
            console.error(error);
        }
    };

    const clearSongs = async () => {
        await db.getAllAsync(`DELETE FROM songs;`);
    };

    return (
        <SqlContext.Provider value={{ insertSongs, clearSongs }}>
            {children}
        </SqlContext.Provider>
    );
};

export const useSqlControlls = () => useContext(SqlContext);

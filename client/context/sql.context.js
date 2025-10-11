import { useRef, useContext, createContext, useEffect, useState } from "react";
import { SQLiteProvider, useSQLiteContext } from "expo-sqlite";

import { useGlobalSongs } from "../store/list.store.js";
import { usePlayerStore } from "../store/player.store.js";


import fetchUser from "../controllers/auth/checkIsAuth.js";

const SqlContext = createContext();
const addToPlaylist = usePlayerStore.getState().addToPlaylist

export const SqlControllerProvider = ({ children }) => {
    const db = useSQLiteContext();
    if (!db) return console.error("db not initialised");

    const init = async () => {
        try {
            await db.execAsync(
                `CREATE TABLE IF NOT EXISTS songs (
                    id TEXT PRIMARY KEY, 
                    title TEXT NOT NULL,
                    url TEXT NOT NULL,
                    artwork TEXT,
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

            addToPlaylist("HOME", formatted);
        } catch (error) {
            console.error(error);
        }
    };
    init();
    
    const clearSongs = async () => {
        await db.getAllAsync(`DELETE FROM songs;`);
    };

    const insertSongs = async item => {
        try {
            
            await db.runAsync(
                `INSERT INTO songs VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
                [
                    item.id,
                    item.title,
                    item.url,
                    item.artwork ?? "",
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


    return (
        <SqlContext.Provider value={{ insertSongs, clearSongs }}>
            {children}
        </SqlContext.Provider>
    );
};

export const useSqlControlls = () => useContext(SqlContext);

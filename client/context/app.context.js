import { useRef, useContext, createContext, useEffect, useState } from "react";
// import * as SQLite from "expo-sqlite";/
import { SQLiteProvider, useSQLiteContext } from "expo-sqlite";

import { useGlobalSongs } from "../store/list.store.js"

const AppContext = createContext();

export const AppStateProvider = ({ children }) => {
    const db = useSQLiteContext();
    const updateAllSongs = useGlobalSongs(state=> state.updateAllSongs)

    if (!db) {
        console.error("db not initialised");
        return;
    }

    const init = async () => {
        try {
            await db.execAsync(`DROP TABLE songs;`);

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
            let formatted = songs.map(item=> {
                return{
                    _id: item._id,
                    title: item.title,
                    url: item.url,
                    cover: item.cover,
                    artist: item.artist,
                    : item.artist,
                }
            })
            
            updateAllSongs(songs)
        } catch (error) {
            console.error(error);
        }
    };

    init();

    const insertSongs = async item => {
        try {
            await db.getAllAsync(`DELETE FROM songs;`);
            
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

    const getSongs = async () => {
        const songs = await db.getAllAsync(`SELECT * FROM songs;`);

        console.log(songs);
        return songs;
    };

    const clearSongs = async () => {};

    return (
        <AppContext.Provider value={{ insertSongs, getSongs, clearSongs }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppState = () => useContext(AppContext);

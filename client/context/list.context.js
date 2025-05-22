import { useState, createContext, useContext } from "react";
import { songs } from "../services/storage.js";

const ListContext = createContext();

export const ListProvider = ({ children }) => {
    const [allSongs, setAllSongs] = useState(songs || []);
    const [allSongsPage, setAllSongsPage] = useState(1);

    console.log("render @ list.context");

    return (
        <ListContext.Provider
            value={{ allSongs, setAllSongs, allSongsPage, setAllSongsPage }}
        >
            {children}
        </ListContext.Provider>
    );
};

export const useLists = () => useContext(ListContext);

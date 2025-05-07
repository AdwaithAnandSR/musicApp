import { useState, useEffect, createContext, useContext } from "react";
import { Appearance } from "react-native";

const ListContext = createContext();

export const ListProvider = ({ children }) => {
    const [allSongs, setAllSongs] = useState([]);
    const [allSongsPage, setAllSongsPage] = useState(1);

    return (
        <ListContext.Provider
            value={{ allSongs, setAllSongs, allSongsPage, setAllSongsPage }}
        >
            {children}
        </ListContext.Provider>
    );
};

export const useLists = () => useContext(ListContext);

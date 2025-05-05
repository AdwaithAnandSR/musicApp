import { useState, useEffect, createContext, useContext } from "react";

const AppStateContext = createContext();

export const AppStateProvider = ({ children }) => {
    const [selectedSongs, setSelectedSongs] = useState([]);
    const [isSelecting, setIsSelecting] = useState(false);
    
    useEffect(()=> {
        if(!selectedSongs || selectedSongs.length < 1) setIsSelecting(false)
    }, [selectedSongs])
    
    useEffect(()=> {
        if(!isSelecting) setSelectedSongs([])
    }, [isSelecting])

    return (
        <AppStateContext.Provider value={{ selectedSongs,isSelecting, setIsSelecting, setSelectedSongs }}>
            {children}
        </AppStateContext.Provider>
    );
};

export const useAppState = () => useContext(AppStateContext);

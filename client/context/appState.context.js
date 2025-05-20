import { useState, createContext, useContext } from "react";

const AppStateContext = createContext();

export const AppStateProvider = ({ children }) => {
    const [selectedSongs, setSelectedSongs] = useState([]);
    const [isSelecting, setIsSelecting] = useState(false);
    
    return (
        <AppStateContext.Provider value={{ selectedSongs,isSelecting, setIsSelecting, setSelectedSongs }}>
            {children}
        </AppStateContext.Provider>
    );
};

export const useAppState = () => useContext(AppStateContext);

import { useState, useEffect, createContext, useContext } from "react";

const StateContext = createContext();

export const AppStateProvider = ({ children }) => {
    const [lastTrack, setLastTrack] = useState({});

    return <StateContext.Provider value={{}}>{children}</StateContext.Provider>;
};

export const useAppState = () => useContext(StateContext);

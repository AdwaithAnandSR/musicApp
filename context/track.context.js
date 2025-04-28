import { useState, useEffect, useContext, createContext } from "react";
import TrackPlayer, {
    Capability,
    AppKilledPlaybackBehavior
} from "react-native-track-player";

const TrackContext = createContext();

export const TrackProvider = ({ children }) => {
    const [isSetup, setIsSetup] = useState(false);

    useEffect(() => {
        const init = async () => {
            if (!isSetup) {
                await TrackPlayer.setupPlayer();
                setIsSetup(true);
                await TrackPlayer.setPlayWhenReady(false);
                TrackPlayer.updateOptions({
                    // Media controls capabilities
                    capabilities: [
                        Capability.Play,
                        Capability.Pause,
                        Capability.SkipToNext,
                        Capability.SkipToPrevious,
                        Capability.Stop
                    ],
                    compactCapabilities: [
                        Capability.Play,
                        Capability.Pause,
                        Capability.SkipToNext,
                        Capability.SkipToPrevious
                    ],
                    icon: require("../assets/images/icon.png"),
                    color: 0xff0000 // ARGB format (e.g., red)
                });
            }
        };
        init();
    }, [isSetup]);

    return <TrackContext.Provider >{children}</TrackContext.Provider>;
};

export const useTrack = () => useContext(TrackContext);

import { useState, useEffect, useContext, createContext } from "react";
import { useAudioPlayer, AudioModule, useAudioPlayerStatus } from "expo-audio";

const TrackContext = createContext();

export const TrackProvider = ({ children }) => {
    const [list, setList] = useState([]);
    const [track, setTrack] = useState({});
    const player = useAudioPlayer(track?.url);
    const { didJustFinish, duration, currentTime } =
        useAudioPlayerStatus(player);

    const togglePlay = item => {
        if (!player) return;
        if (player.currentStatus?.playing) {
            player.pause();
        } else player.play();
    };

    const skipToNext = () => {
        const index = list.findIndex(song => song._id === track._id);
        if (index === -1 || index == list.length - 1) return;
        setTrack(list[index + 1]);
    };

    const skipToPrevious = () => {
        const index = list.findIndex(song => song._id === track._id);
        if (index === -1 || index === 0) return;
        setTrack(list[index - 1]);
    };

    const seek = sec => {
        player.seekTo(sec);
    };

    useEffect(() => {
        if (track.url) player.play();
    }, [track]);

    useEffect(() => {
        if (didJustFinish) skipToNext();
    }, [didJustFinish]);

    useEffect(() => {
        const setupPlayer = async () => {
            await AudioModule.setAudioModeAsync({
                interruptionMode: "doNotMix",
                playsInSilentMode: true,
                shouldPlayInBackground: true,
                shouldRouteThroughEarpiece: true
            });
        };
        setupPlayer();
    }, []);

    return (
        <TrackContext.Provider
            value={{
                player,
                togglePlay,
                seek,
                skipToNext,
                skipToPrevious,
                track,
                setTrack,
                list,
                setList
            }}
        >
            {children}
        </TrackContext.Provider>
    );
};

export const useTrack = () => useContext(TrackContext);

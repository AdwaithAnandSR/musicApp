import { useState, useEffect, useContext, createContext, useCallback } from "react";
import { useAudioPlayer, AudioModule, useAudioPlayerStatus } from "expo-audio";

const TrackContext = createContext();

export const TrackProvider = ({ children }) => {
    const [list, setList] = useState([]);
    const [currentPlaylistName, setCurrentPlaylistName] = useState("");
    const [track, setTrack] = useState({});
    const player = useAudioPlayer(track?.url);
    const { didJustFinish } = useAudioPlayerStatus(player);

    const togglePlay = item => {
        if (!player) return;
        if (player.currentStatus?.playing) {
            player.pause();
        } else player.play();
    };

    const skipToNext = useCallback(() => {
        const index = list.findIndex(song => song._id === track._id);
        if (index === -1 || index === list.length - 1) return;
        setTrack(list[index + 1]);
    }, [list, track]);

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
    }, [track, player]);

    useEffect(() => {
        if (didJustFinish) skipToNext();
    }, [didJustFinish, skipToNext]);

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
                setList,
                currentPlaylistName,
                setCurrentPlaylistName
            }}
        >
            {children}
        </TrackContext.Provider>
    );
};

export const useTrack = () => useContext(TrackContext);

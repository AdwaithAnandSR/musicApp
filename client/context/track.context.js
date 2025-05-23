import {
    useState,
    useRef,
    useEffect,
    useContext,
    createContext,
    useCallback,
    useMemo
} from "react";
import { useAudioPlayer, AudioModule, useAudioPlayerStatus } from "expo-audio";

import { useGlobalSongs } from "../store/list.store.js";
import {
    useTrack as useTrackDets,
    useQueueManager
} from "../store/track.store.js";

const TrackContext = createContext();

export const TrackProvider = ({ children }) => {
    const track = useTrackDets(state => state.track);
    const updateTrack = useTrackDets(state => state.update);
    const queue = useQueueManager(state => state.queue);
    const currentQueueIndex = useQueueManager(state => state.currentIndex);
    const updateCurrentIndex = useQueueManager(
        state => state.updateCurrentIndex
    );

    const player = useAudioPlayer(track?.url);
    const { didJustFinish } = useAudioPlayerStatus(player);
    const allSongs = useGlobalSongs(state => state.allSongs);

    const togglePlay = item => {
        if (!player) return;
        if (player.currentStatus?.playing) {
            player.pause();
        } else player.play();
    };

    const skipToNext = useCallback(() => {
        if (currentQueueIndex >= queue.length - 1) return;
        const nextTrack = queue[currentQueueIndex + 1];
        if (nextTrack) {
            updateTrack(nextTrack);
            updateCurrentIndex(currentQueueIndex + 1);
        }
    }, [track]);

    const skipToPrevious = () => {
        if (currentQueueIndex <= 0) return;
        const nextTrack = queue[currentQueueIndex - 1];
        if (nextTrack) {
            updateTrack(nextTrack);
            updateCurrentIndex(currentQueueIndex - 1);
        }
    };

    const seek = sec => player.seekTo(sec);

    useEffect(() => {
        if (didJustFinish) skipToNext();
    }, [didJustFinish]);

    useEffect(() => {
        if (track?.url) {
            player.play();
            const index = queue.findIndex(song => song._id === track._id);
            if (index !== -1 && currentQueueIndex !== index) {
                updateCurrentIndex(index);
            }
        }
    }, [track]);

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

    const contextValue = {
        player,
        togglePlay,
        seek,
        skipToNext,
        skipToPrevious
    };

    return (
        <TrackContext.Provider value={contextValue}>
            {children}
        </TrackContext.Provider>
    );
};

export const useTrack = () => useContext(TrackContext);

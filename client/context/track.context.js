import {
    useRef,
    useEffect,
    useContext,
    createContext,
    useCallback,
    useMemo
} from "react";
import { useAudioPlayer, AudioModule, useAudioPlayerStatus } from "expo-audio";

import {
    useTrack as useTrackDets,
    useQueueManager,
    useAudioMonitor
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
    const updateStatus = useAudioMonitor(state => state.updateStatus);

    const player = useAudioPlayer(track?.url);
    const status = useAudioPlayerStatus(player);
    const hasHandledFinishRef = useRef(false);

    const togglePlay = item => {
        if (!player) return;
        if (player.currentStatus?.playing) {
            player.pause();
        } else player.play();
    };

    const skipToNext = useCallback(() => {
        const nextIndex = currentQueueIndex + 1;
        if (nextIndex >= queue.length) return;
        const nextTrack = queue[nextIndex];
        if (nextTrack) {
            updateTrack(nextTrack);
            updateCurrentIndex(nextIndex);
        }
    }, [currentQueueIndex, queue, updateTrack, updateCurrentIndex]);

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
        if (status.didJustFinish && !hasHandledFinishRef.current) {
            hasHandledFinishRef.current = true;
            skipToNext();
        } else if (!status.didJustFinish && hasHandledFinishRef.current) {
            // reset when current track status resets
            hasHandledFinishRef.current = false;
        }

        updateStatus({
            playing: status.playing,
            buffering: status.isBuffering,
            currentTime: status.currentTime,
            duration: status.duration
        });
    }, [status, skipToNext, updateStatus]);

    useEffect(() => {
        if (track?.url) {
            player.play();
            
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

    const contextValue = useMemo(
        () => ({
            player,
            togglePlay,
            seek,
            skipToNext,
            skipToPrevious
        }),
        [track?.url]
    );

    return (
        <TrackContext.Provider value={contextValue}>
            {children}
        </TrackContext.Provider>
    );
};

export const useTrack = () => useContext(TrackContext);

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

import { useLists } from "./list.context.js";

const TrackContext = createContext();

export const TrackProvider = ({ children }) => {
    const [queueManager, setQueueManager] = useState({
        id: "/Home",
        tracks: [],
        currentIndex: 0
    });
    const [track, setTrack] = useState({});

    const player = useAudioPlayer(track?.url);
    const { allSongs } = useLists();
    const { didJustFinish } = useAudioPlayerStatus(player);

    const togglePlay = item => {
        if (!player) return;
        if (player.currentStatus?.playing) {
            player.pause();
        } else player.play();
    };

    const skipToNext = useCallback(() => {
        const { currentIndex, tracks } = queueManager;
        if (currentIndex >= tracks.length - 1) return;

        const nextTrack = tracks[currentIndex + 1];

        if (nextTrack) {
            setTrack(nextTrack);
            setQueueManager(prev => ({
                ...prev,
                currentIndex: currentIndex + 1
            }));
        }
    }, [track]);

    const skipToPrevious = useCallback(() => {
        const { currentIndex, tracks } = queueManager;
        if (currentIndex <= 0) return;

        const nextTrack = tracks[currentIndex - 1];
        if (nextTrack) {
            setTrack(nextTrack);
            setQueueManager(prev => ({
                ...prev,
                currentIndex: currentIndex - 1
            }));
        }
    }, [track]);

    const seek = sec => player.seekTo(sec);

    useEffect(() => {
        if (didJustFinish) skipToNext();
    }, [didJustFinish]);

    useEffect(() => {
        if (track?.url && queueManager?.tracks?.length) {
            player.play();

            const index = queueManager.tracks.findIndex(
                song => song._id === track._id
            );
            if (index !== -1 && queueManager.currentIndex !== index) {
                setQueueManager(prev => ({
                    ...prev,
                    currentIndex: index
                }));
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

    const contextValue = useMemo(
        () => ({
            player,
            togglePlay,
            seek,
            skipToNext,
            skipToPrevious,
            track,
            setTrack,
            queueManager,
            setQueueManager
        }),
        [player, track, queueManager]
    );

    return (
        <TrackContext.Provider value={contextValue}>
            {children}
        </TrackContext.Provider>
    );
};

export const useTrack = () => useContext(TrackContext);

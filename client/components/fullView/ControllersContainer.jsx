import React, { useRef } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { FontAwesome5, AntDesign } from "@expo/vector-icons";
import TrackPlayer, {
    useActiveTrack,
    State,
    usePlaybackState
} from "react-native-track-player";

import { useStatus } from "../../store/appState.store.js";

const SEEK_INTERVAL = 5,
    SEEK_REPEAT_MS = 300;
    
const playPauseIconSize = 28, nextPrevIconSize = 33

const ControllersContainer = () => {
    const intervalRef = useRef(null);
    const resetShowLyrics = useStatus(state => state.resetShowLyrics);
    const { state } = usePlaybackState();

    const startSeeking = (direction = 1) => {
        if (intervalRef.current) return;

        intervalRef.current = setInterval(() => {
            TrackPlayer.seekBy(SEEK_INTERVAL * direction);
        }, SEEK_REPEAT_MS);
    };

    const stopSeeking = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    const togglePlay = async () => {
        const { state } = await TrackPlayer.getPlaybackState();
        if (state === State.Playing) await TrackPlayer.pause();
        else if (state === State.Paused || state === State.Ready)
            await TrackPlayer.play();
    };

    return (
        <View style={styles.controllsContainer}>
            <TouchableOpacity
                onPress={async () => {
                    resetShowLyrics();
                    await TrackPlayer.skipToPrevious();
                }}
                onLongPress={() => startSeeking(-1)}
                onPressOut={stopSeeking}
                style={styles.btnContainer}
            >
                <AntDesign name="step-backward" size={nextPrevIconSize} color="white" />
            </TouchableOpacity>
            {state === State.Playing || state === State.Buffering ? (
                <TouchableOpacity
                    onPress={togglePlay}
                    style={styles.btnContainer}
                >
                    <FontAwesome5 name="pause" size={playPauseIconSize} color="white" />
                </TouchableOpacity>
            ) : (
                <TouchableOpacity
                    onPress={togglePlay}
                    style={styles.btnContainer}
                >
                    <FontAwesome5 name="play" size={playPauseIconSize} color="white" />
                </TouchableOpacity>
            )}
            <TouchableOpacity
                onPress={async () => {
                    resetShowLyrics();
                    await TrackPlayer.skipToNext();
                }}
                onLongPress={() => startSeeking()}
                onPressOut={stopSeeking}
                style={styles.btnContainer}
            >
            <AntDesign name="step-forward" size={nextPrevIconSize} color="white" />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    controllsContainer: {
        width: "70%",
        height: "10%",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        alignSelf: "center"
    },
    btnContainer: {
        padding: "8%",
        justifyContent: "center",
        alignItems: "center",
        borderRadius: "50%"
    }
});

export default React.memo(ControllersContainer);

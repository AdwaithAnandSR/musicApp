import React, { useRef } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { FontAwesome5, AntDesign } from "@expo/vector-icons";

import { useTrack } from "../../context/track.context.js";
import { useAudioMonitor } from "../../store/track.store.js";
import { useStatus } from "../../store/appState.store.js";

const ControllersContainer = () => {
    const { togglePlay, skipToNext, skipToPrevious, seek } = useTrack();
    const isPlaying = useAudioMonitor(state => state.isPlaying);
    const isBuffering = useAudioMonitor(state => state.isBuffering);
    const resetShowLyrics = useStatus(state => state.resetShowLyrics);
    const duration = useAudioMonitor(state => state.duration);
    const currentTime = useAudioMonitor(state => state.currentTime);

    const intervalRef = useRef(null);

    const handleLongPress = dir => {
        intervalRef.current = setInterval(() => {
            const state = useAudioMonitor.getState();
            const current = state.currentTime;
            const dur = state.duration;

            let newTime = dir === "f" ? current + 5 : current - 5;
            newTime = Math.max(0, Math.min(newTime, dur)); // clamp between 0 and duration

            seek(newTime);
        }, 500);
    };

    const handlePressOut = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    return (
        <View style={styles.controllsContainer}>
            <TouchableOpacity
                onPress={() => {
                    resetShowLyrics();
                    skipToPrevious();
                }}
                onLongPress={() => handleLongPress("b")}
                onPressOut={handlePressOut}
                style={styles.btnContainer}
            >
                <AntDesign name="stepbackward" size={28} color="white" />
            </TouchableOpacity>
            {isPlaying || isBuffering ? (
                <TouchableOpacity
                    onPress={togglePlay}
                    style={styles.btnContainer}
                >
                    <FontAwesome5 name="pause" size={28} color="white" />
                </TouchableOpacity>
            ) : (
                <TouchableOpacity
                    onPress={togglePlay}
                    style={styles.btnContainer}
                >
                    <FontAwesome5 name="play" size={28} color="white" />
                </TouchableOpacity>
            )}
            <TouchableOpacity
                onPress={() => {
                    resetShowLyrics();
                    skipToNext();
                }}
                onLongPress={() => handleLongPress("f")}
                onPressOut={handlePressOut}
                style={styles.btnContainer}
            >
                <AntDesign name="stepforward" size={28} color="white" />
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

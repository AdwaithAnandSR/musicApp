import React, { useRef } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { FontAwesome5, AntDesign } from "@expo/vector-icons";

import { useStatus } from "@store/appState.store.js";
import { usePlayer } from "@store/player";

const SEEK_INTERVAL = 5,
    SEEK_REPEAT_MS = 300;

const playPauseIconSize = 28,
    nextPrevIconSize = 33;

const ControllersContainer = () => {
    const intervalRef = useRef(null);
    const resetShowLyrics = useStatus(state => state.resetShowLyrics);

    const playPause = usePlayer(state => state.playPause);
    const isPlaying = usePlayer(state => state.isPlaying);
    const isBuffering = usePlayer(state => state.isBuffering);
    const next = usePlayer(state => state.next);
    const prev = usePlayer(state => state.prev);

    return (
        <View style={styles.controllsContainer}>
            <TouchableOpacity
                onPress={async () => {
                    resetShowLyrics();
                    prev();
                }}
                style={styles.btnContainer}
            >
                <AntDesign
                    name="step-backward"
                    size={nextPrevIconSize}
                    color="white"
                />
            </TouchableOpacity>
            {isPlaying || isBuffering ? (
                <TouchableOpacity
                    onPress={playPause}
                    style={styles.btnContainer}
                >
                    <FontAwesome5
                        name="pause"
                        size={playPauseIconSize}
                        color="white"
                    />
                </TouchableOpacity>
            ) : (
                <TouchableOpacity
                    onPress={playPause}
                    style={styles.btnContainer}
                >
                    <FontAwesome5
                        name="play"
                        size={playPauseIconSize}
                        color="white"
                    />
                </TouchableOpacity>
            )}
            <TouchableOpacity
                onPress={() => {
                    resetShowLyrics();
                    next();
                }}
                style={styles.btnContainer}
            >
                <AntDesign
                    name="step-forward"
                    size={nextPrevIconSize}
                    color="white"
                />
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
